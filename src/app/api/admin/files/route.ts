import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { verifySession } from '@/lib/session';
import { writeLog } from '@/lib/errorLogger';
import ContentCollection from '@/models/ContentCollection';
import Content from '@/models/Content';
import Link from '@/models/Link';

// Upper bound for walking up the folder tree; protects against cycles in bad data.
const MAX_FOLDER_DEPTH = 50;
const MAX_FOLDER_NAME_LENGTH = 120;

/**
 * Admin file manager API.
 *
 * GET  /api/admin/files[?folderId=<id>]  -> contents of a folder (root when omitted)
 * POST /api/admin/files { name, parentId? } -> creates a subfolder (parentId omitted = top level)
 *
 * Folders are ContentCollection documents; `parentId` links them into a tree.
 * Files are Content documents that belong to a folder via `contentCollectionId`.
 */

export async function GET(request: Request) {
    await dbConnect();
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session')?.value;
    if (!(await verifySession(session))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    let current: { _id: mongoose.Types.ObjectId; name?: string; parentId: mongoose.Types.ObjectId | null } | null = null;
    if (folderId) {
        if (!mongoose.isValidObjectId(folderId)) {
            return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 });
        }
        current = await ContentCollection.findById(folderId).lean();
        if (!current) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }
    }

    // Breadcrumb: walk up from the current folder to the root.
    const breadcrumb: { id: string; name: string }[] = [];
    let walker = current;
    for (let depth = 0; walker && depth < MAX_FOLDER_DEPTH; depth++) {
        breadcrumb.unshift({ id: walker._id.toString(), name: walker.name || 'Névtelen mappa' });
        walker = walker.parentId
            ? await ContentCollection.findById(walker.parentId).lean()
            : null;
    }

    const childFolders = await ContentCollection.find({ parentId: current ? current._id : null })
        .sort({ name: 1 })
        .lean();

    const folders = await Promise.all(
        childFolders.map(async (folder) => ({
            id: folder._id.toString(),
            name: folder.name || 'Névtelen mappa',
            isPublic: folder.isPublic || false,
            publicExpiresAt: folder.publicExpiresAt ? folder.publicExpiresAt.toISOString() : null,
            folderCount: await ContentCollection.countDocuments({ parentId: folder._id }),
            fileCount: await Content.countDocuments({ contentCollectionId: folder._id }),
            // Links that still work (not expired) and point at this folder.
            linkCount: await Link.countDocuments({ contentCollectionId: folder._id, availableTo: { $gt: new Date() } }),
            createdAt: folder.createdAt.toISOString(),
        }))
    );

    // Files only live inside folders; the root level contains folders only.
    const files = current
        ? (await Content.find({ contentCollectionId: current._id }).sort({ originalName: 1 }).lean()).map((file) => ({
            id: file._id.toString(),
            originalName: file.originalName,
            size: file.size,
            mimeType: file.mimeType,
            createdAt: file.createdAt.toISOString(),
        }))
        : [];

    return NextResponse.json({
        folder: current
            ? { id: current._id.toString(), name: current.name || 'Névtelen mappa' }
            : null,
        breadcrumb,
        folders,
        files,
    });
}

export async function POST(request: Request) {
    await dbConnect();
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session')?.value;
    if (!(await verifySession(session))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const parentId: string | null = body.parentId || null;

        if (!name || name.length > MAX_FOLDER_NAME_LENGTH) {
            return NextResponse.json(
                { error: `A mappanév kötelező, legfeljebb ${MAX_FOLDER_NAME_LENGTH} karakter.` },
                { status: 400 }
            );
        }

        if (parentId) {
            if (!mongoose.isValidObjectId(parentId)) {
                return NextResponse.json({ error: 'Invalid parent folder ID' }, { status: 400 });
            }
            const parentExists = await ContentCollection.exists({ _id: parentId });
            if (!parentExists) {
                return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
            }
        }

        const folder = await ContentCollection.create({ name, parentId });

        await writeLog('info', `Folder created: ${name}`, {
            folderId: folder._id,
            parentId,
        });

        return NextResponse.json({ success: true, folderId: folder._id.toString() });
    } catch (error) {
        const err = error as Error;
        await writeLog('error', `Failed to create folder: ${err.message}`, { stack: err.stack });
        return NextResponse.json({ error: 'Nem sikerült létrehozni a mappát.' }, { status: 500 });
    }
}
