import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { findLinkByToken } from '@/lib/authHelper';
import Content from '@/models/Content';
import Log from '@/models/Log';

export async function POST(request: Request) {
    await dbConnect();

    try {
        const body = await request.json();
        const { linkToken, originalName, mimeType, totalSize, webdavPath } = body;

        if (!linkToken || !originalName || totalSize === undefined || !webdavPath) {
            return NextResponse.json(
                { error: 'Missing required metadata parameters (linkToken, originalName, totalSize, webdavPath)' },
                { status: 400 }
            );
        }

        // 1. Verify link authorization
        const link = await findLinkByToken(linkToken);
        if (!link) {
            return NextResponse.json({ error: 'Unauthorized or expired link' }, { status: 401 });
        }

        if (link.type === 'send') {
            return NextResponse.json({ error: 'Unauthorized: Link is download-only' }, { status: 403 });
        }

        if (link.availableBytesToUpload < totalSize) {
            return NextResponse.json({ error: 'Upload quota exceeded' }, { status: 400 });
        }

        // 2. Save content metadata to MongoDB
        const newContent = await Content.create({
            contentCollectionId: link.contentCollectionId,
            originalName,
            mimeType: mimeType || 'application/octet-stream',
            size: totalSize,
            webdavPath,
        });

        // 3. Subtract uploaded size from link quota
        link.availableBytesToUpload = Math.max(0, link.availableBytesToUpload - totalSize);
        await link.save();

        // 4. Log successful upload record
        await Log.create({
            level: 'info',
            message: `File uploaded successfully: ${originalName} (${totalSize} bytes)`,
            details: {
                contentId: newContent._id,
                collectionId: link.contentCollectionId,
                webdavPath,
            },
        });

        return NextResponse.json({ success: true, fileId: newContent._id });
    } catch (error) {
        const err = error as Error;
        await Log.create({
            level: 'error',
            message: `Failed to record uploaded content metadata: ${err.message}`,
            details: { stack: err.stack },
        });

        return NextResponse.json(
            { error: `Internal server error: ${err.message}` },
            { status: 500 }
        );
    }
}
