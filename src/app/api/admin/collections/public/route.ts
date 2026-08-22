import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/dbConnect';
import ContentCollection from '@/models/ContentCollection';
import { verifySession } from '@/lib/session';

export async function POST(request: Request) {
    await dbConnect();
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session')?.value;
    if (!(await verifySession(session))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, isPublic, publicExpiresAt } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Missing collection ID' }, { status: 400 });
        }

        const updated = await ContentCollection.findByIdAndUpdate(
            id,
            {
                isPublic: !!isPublic,
                publicExpiresAt: publicExpiresAt ? new Date(publicExpiresAt) : null,
            },
            { new: true }
        );

        return NextResponse.json({ success: true, collection: updated });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}