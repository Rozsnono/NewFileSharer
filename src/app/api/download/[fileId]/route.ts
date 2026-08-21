import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { findLinkByToken } from '@/lib/authHelper';
import { webdavClient } from '@/lib/webdav';
import Content from '@/models/Content';
import Log from '@/models/Log';

interface RouteParams {
    params: Promise<{ fileId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
    await dbConnect();

    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        await Log.create({
            level: 'warning',
            message: 'Download attempt failed: Missing link token parameter.',
            details: { fileId }
        });
        return new Response('Missing link authorization token', { status: 400 });
    }

    try {
        // 1. Resolve and validate the link
        const link = await findLinkByToken(token);
        if (!link) {
            await Log.create({
                level: 'warning',
                message: 'Download attempt failed: Invalid or expired token.',
                details: { fileId, tokenExcerpt: token.substring(0, 8) + '...' }
            });
            return new Response('Unauthorized or expired link', { status: 401 });
        }

        // 2. Validate read permissions
        if (link.type === 'receive') {
            await Log.create({
                level: 'warning',
                message: 'Download attempt failed: Link is configured as upload-only.',
                details: { fileId, linkId: link._id }
            });
            return new Response('This link is upload-only', { status: 403 });
        }

        // 3. Find and validate the requested Content (file)
        const file = await Content.findById(fileId);
        if (!file) {
            return new Response('File not found in database', { status: 404 });
        }

        // 4. Ensure file belongs to the link's designated collection
        if (file.contentCollectionId.toString() !== link.contentCollectionId.toString()) {
            await Log.create({
                level: 'warning',
                message: 'Security warning: Download content collection mismatch.',
                details: { fileId, expectedCollection: link.contentCollectionId, actualCollection: file.contentCollectionId }
            });
            return new Response('Unauthorized collection access', { status: 403 });
        }

        // 5. Ensure file physically exists on WebDAV NAS
        const fileExistsOnNAS = await webdavClient.exists(file.webdavPath);
        if (!fileExistsOnNAS) {
            await Log.create({
                level: 'error',
                message: `File missing on NAS storage: ${file.webdavPath}`,
                details: { fileId }
            });
            return new Response('File missing on storage server', { status: 500 });
        }

        // 6. Manage available download limit
        if (link.availableDownloads !== null) {
            link.availableDownloads -= 1;

            if (link.availableDownloads <= 0) {
                // If limit is depleted, delete the link to deny future access
                await link.deleteOne();
                await Log.create({
                    level: 'info',
                    message: `Link ${link._id} successfully deleted after download count reached zero.`,
                });
            } else {
                await link.save();
            }
        }

        // 7. Obtain streaming client from WebDAV
        const nodeStream = webdavClient.createReadStream(file.webdavPath);

        // 8. Manually wrap the Node.js Stream in a Web Standard ReadableStream
        // This resolves the TypeScript definition mismatch between DOM types and Node types
        const webStream = new ReadableStream({
            start(controller) {
                nodeStream.on('data', (chunk) => {
                    controller.enqueue(chunk);
                });
                nodeStream.on('end', () => {
                    controller.close();
                });
                nodeStream.on('error', (err) => {
                    controller.error(err);
                });
            },
            cancel() {
                nodeStream.destroy();
            }
        });

        // Prepare attachment and metadata response headers
        const headers = new Headers();
        const sanitizedFilename = encodeURIComponent(file.originalName);

        headers.set('Content-Disposition', `attachment; filename*=UTF-8''${sanitizedFilename}`);
        headers.set('Content-Type', file.mimeType || 'application/octet-stream');
        headers.set('Content-Length', file.size.toString());

        return new Response(webStream, {
            status: 200,
            headers,
        });

    } catch (error) {
        const err = error as Error;
        await Log.create({
            level: 'error',
            message: `Failed to stream download: ${err.message}`,
            details: { fileId, stack: err.stack }
        });
        return new Response('Internal streaming error occurred', { status: 500 });
    }
}