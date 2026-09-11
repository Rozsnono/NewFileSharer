import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { findLinkByToken } from '@/lib/authHelper';
import { buildDirectDownloadUrl } from '@/lib/storageApi';
import Content from '@/models/Content';
import ContentCollection from '@/models/ContentCollection';
import Log from '@/models/Log';

interface RouteParams {
    params: Promise<{ fileId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
    await dbConnect();

    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const inline = searchParams.get('inline') === 'true';

    try {
        // 1. Fetch file and populate collection to check public accessibility
        const file = await Content.findById(fileId).populate({
            path: 'contentCollectionId',
            model: ContentCollection,
        });

        if (!file) {
            return new Response('File not found in database', { status: 404 });
        }

        const collection = file.contentCollectionId as any;
        const isCurrentlyPublic =
            collection &&
            collection.isPublic &&
            collection.publicExpiresAt &&
            new Date(collection.publicExpiresAt) > new Date();

        // 2. If collection is not public, require and validate token
        if (!isCurrentlyPublic) {
            if (!token) {
                await Log.create({
                    level: 'warning',
                    message: 'Download attempt failed: Missing link token parameter on private file.',
                    details: { fileId },
                });
                return new Response('Missing link authorization token', { status: 400 });
            }

            // Resolve and validate link token
            const link = await findLinkByToken(token);
            if (!link) {
                await Log.create({
                    level: 'warning',
                    message: 'Download attempt failed: Invalid or expired token.',
                    details: { fileId, tokenExcerpt: token.substring(0, 8) + '...' },
                });
                return new Response('Unauthorized or expired link', { status: 401 });
            }

            // Validate read permissions
            if (link.type === 'receive') {
                await Log.create({
                    level: 'warning',
                    message: 'Download attempt failed: Link is configured as upload-only.',
                    details: { fileId, linkId: link._id },
                });
                return new Response('This link is upload-only', { status: 403 });
            }

            // Ensure file belongs to the link's designated collection
            if (file.contentCollectionId._id.toString() !== link.contentCollectionId.toString()) {
                await Log.create({
                    level: 'warning',
                    message: 'Security warning: Download content collection mismatch.',
                    details: {
                        fileId,
                        expectedCollection: link.contentCollectionId,
                        actualCollection: file.contentCollectionId._id,
                    },
                });
                return new Response('Unauthorized collection access', { status: 403 });
            }

            // Manage available download limit
            if (link.availableDownloads !== null) {
                link.availableDownloads -= 1;

                if (link.availableDownloads <= 0) {
                    await link.deleteOne();
                } else {
                    await link.save();
                }
            }
        }

        // 3. Log successful authorized download dispatch
        await Log.create({
            level: 'info',
            message: `Dispatched direct download for: ${file.originalName}`,
            details: {
                fileId,
                originalName: file.originalName,
                webdavPath: file.webdavPath,
                isCurrentlyPublic,
                inline,
            },
        });

        // 4. Construct direct streaming download URL to NASiS3 and redirect browser
        const directDownloadUrl = buildDirectDownloadUrl(file.webdavPath, { inline });

        return NextResponse.redirect(directDownloadUrl, 307);

    } catch (error) {
        const err = error as Error;
        await Log.create({
            level: 'error',
            message: `Failed to dispatch download: ${err.message}`,
            details: { fileId, stack: err.stack },
        });
        return new Response('Internal error occurred while processing download', { status: 500 });
    }
}