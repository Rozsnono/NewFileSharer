import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/dbConnect';
import ContentCollection from '@/models/ContentCollection';
import Content from '@/models/Content';
import { verifySession } from '@/lib/session';

export async function GET() {
    await dbConnect();
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session')?.value;
    if (!(await verifySession(session))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collections = await ContentCollection.find().sort({ createdAt: -1 }).lean();

    const populated = await Promise.all(
        collections.map(async (col) => {
            const files = await Content.find({ contentCollectionId: col._id }).sort({ createdAt: -1 }).lean();
            return {
                ...col,
                id: col._id.toString(),
                isPublic: col.isPublic || false,
                publicExpiresAt: col.publicExpiresAt ? col.publicExpiresAt.toISOString() : null,
                files: files.map(f => ({
                    id: f._id.toString(),
                    originalName: f.originalName,
                    size: f.size,
                    mimeType: f.mimeType,
                    createdAt: f.createdAt.toISOString(),
                })),
            };
        })
    );

    return NextResponse.json(populated);
}