import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { webdavClient, ensureDirectoryExists } from '@/lib/webdav';
import { findLinkByToken } from '@/lib/authHelper';
import dbConnect from '@/lib/dbConnect';
import Content from '@/models/Content';
import Log from '@/models/Log';

export async function POST(request: Request) {
    await dbConnect();

    let tempLocalMergedPath = '';
    let fileId = '';

    try {
        const { linkToken, fileId: receivedFileId, originalName, mimeType, totalSize, totalChunks } = await request.json();
        fileId = receivedFileId;

        if (!linkToken || !fileId || !originalName || !mimeType || !totalSize || !totalChunks) {
            return NextResponse.json({ error: 'Missing completion metadata' }, { status: 400 });
        }

        // 1. Verify link authorization
        const link = await findLinkByToken(linkToken);
        if (!link) {
            return NextResponse.json({ error: 'Unauthorized or expired link' }, { status: 401 });
        }

        if (link.type === 'send') {
            return NextResponse.json({ error: 'Unauthorized operation' }, { status: 403 });
        }

        if (link.availableBytesToUpload < totalSize) {
            return NextResponse.json({ error: 'Upload quota exceeded' }, { status: 400 });
        }

        // 2. Setup paths
        const tempDirRemote = `/temp/${fileId}`;
        tempLocalMergedPath = path.join('/tmp', `${fileId}_merged`);

        // Download and append each chunk sequentially
        const writeStream = fs.createWriteStream(tempLocalMergedPath);

        for (let i = 0; i < totalChunks; i++) {
            const chunkPathRemote = `${tempDirRemote}/chunk_${i}`;

            const chunkExists = await webdavClient.exists(chunkPathRemote);
            if (!chunkExists) {
                throw new Error(`Missing chunk_${i} on WebDAV server.`);
            }

            // Download chunk as binary Buffer and append
            const chunkBuffer = await webdavClient.getFileContents(chunkPathRemote, { format: 'binary' }) as Buffer;
            writeStream.write(chunkBuffer);
        }

        // Finalize writing with explicit types to resolve implicit 'any' error
        await new Promise<void>((resolve, reject) => {
            writeStream.end((err: Error | null | undefined) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Validate size integrity
        const stats = fs.statSync(tempLocalMergedPath);
        if (stats.size !== totalSize) {
            throw new Error(`Integrity size mismatch. Expected: ${totalSize}, Merged: ${stats.size}`);
        }

        // 3. Move file to permanent WebDAV directory
        const collectionId = link.contentCollectionId.toString();
        const finalDirRemote = `/uploads/${collectionId}`;
        await ensureDirectoryExists(finalDirRemote);

        // Sanitize filename to prevent path traversal
        const sanitizedFilename = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const finalFilePathRemote = `${finalDirRemote}/${sanitizedFilename}`;

        const readStream = fs.createReadStream(tempLocalMergedPath);
        await webdavClient.putFileContents(finalFilePathRemote, readStream, { overwrite: true });

        // 4. Save content meta to MongoDB
        const newContent = await Content.create({
            contentCollectionId: link.contentCollectionId,
            originalName,
            mimeType,
            size: totalSize,
            webdavPath: finalFilePathRemote,
        });

        // 5. Subtract uploaded size from link quota
        link.availableBytesToUpload = Math.max(0, link.availableBytesToUpload - totalSize);
        await link.save();

        // 6. Clean up resources
        try {
            await webdavClient.deleteFile(tempDirRemote);
        } catch (cleanupError) {
            await Log.create({
                level: 'warning',
                message: `Could not delete remote temporary folder for file ${fileId}`,
                details: { error: (cleanupError as Error).message }
            });
        }

        if (fs.existsSync(tempLocalMergedPath)) {
            fs.unlinkSync(tempLocalMergedPath);
        }

        return NextResponse.json({ success: true, fileId: newContent._id });
    } catch (error) {
        const err = error as Error;
        await Log.create({
            level: 'error',
            message: `Finalize execution failure (File: ${fileId || 'unknown'}): ${err.message}`,
            details: { stack: err.stack }
        });

        if (tempLocalMergedPath && fs.existsSync(tempLocalMergedPath)) {
            try {
                fs.unlinkSync(tempLocalMergedPath);
            } catch (_) { }
        }

        return NextResponse.json({ error: `Finalization failure: ${err.message}` }, { status: 500 });
    }
}