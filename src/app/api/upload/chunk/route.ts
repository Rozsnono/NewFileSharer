import { NextResponse } from 'next/server';
import { webdavClient, ensureDirectoryExists } from '@/lib/webdav';
import { findLinkByToken } from '@/lib/authHelper';
import Log from '@/models/Log';
import dbConnect from '@/lib/dbConnect';

export async function POST(request: Request) {
    await dbConnect();
    try {
        const formData = await request.formData();
        const linkToken = formData.get('linkToken') as string;
        const fileId = formData.get('fileId') as string;
        const chunkIndexStr = formData.get('chunkIndex') as string;
        const chunkFile = formData.get('chunk') as File;

        if (!linkToken || !fileId || !chunkIndexStr || !chunkFile) {
            return NextResponse.json({ error: 'Missing required upload parameters' }, { status: 400 });
        }

        const chunkIndex = parseInt(chunkIndexStr, 10);

        // 1. Verify link presence and active status
        const link = await findLinkByToken(linkToken);
        if (!link) {
            await Log.create({
                level: 'warning',
                message: 'Unauthorized chunk upload attempt with invalid token',
                details: { fileId, chunkIndex }
            });
            return NextResponse.json({ error: 'Unauthorized or expired link' }, { status: 401 });
        }

        // 2. Validate upload permissions
        if (link.type === 'send') {
            return NextResponse.json({ error: 'This link is download-only' }, { status: 403 });
        }

        if (link.availableBytesToUpload < chunkFile.size) {
            return NextResponse.json({ error: 'Upload quota exceeded' }, { status: 400 });
        }

        // 3. Process the file chunk
        const arrayBuffer = await chunkFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 4. Save to temporary storage on the WebDAV NAS
        const tempDir = `/temp/${fileId}`;
        await ensureDirectoryExists(tempDir);
        const chunkPath = `${tempDir}/chunk_${chunkIndex}`;

        await webdavClient.putFileContents(chunkPath, buffer, { overwrite: true });

        return NextResponse.json({ success: true, message: `Chunk ${chunkIndex} uploaded` });
    } catch (error) {
        const err = error as Error;
        await Log.create({
            level: 'error',
            message: `Failed chunk upload: ${err.message}`,
            details: { stack: err.stack }
        });
        return NextResponse.json({ error: 'Upload server error' }, { status: 500 });
    }
}