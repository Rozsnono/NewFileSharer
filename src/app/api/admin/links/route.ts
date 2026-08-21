import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';
import Link from '@/models/Link';
import ContentCollection from '@/models/ContentCollection';
import { verifySession } from '@/lib/session';

export async function GET() {
    await dbConnect();
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session')?.value;
    if (!verifySession(session)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const links = await Link.find()
        .populate({ path: 'contentCollectionId', model: ContentCollection })
        .sort({ createdAt: -1 });
    return NextResponse.json(links);
}

export async function POST(request: Request) {
    await dbConnect();
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session')?.value;
    if (!verifySession(session)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { type, contentCollectionId, availableDownloads, maxBytesToUpload, availableTo } = await request.json();

        if (!type || !maxBytesToUpload || !availableTo) {
            return NextResponse.json({ error: 'Missing configuration fields' }, { status: 400 });
        }

        let targetCollectionId = contentCollectionId;

        if (!targetCollectionId) {
            const newCollection = await ContentCollection.create({
                name: `Transfer_${Date.now()}`,
            });
            targetCollectionId = newCollection._id;
        }

        const plainToken = crypto.randomBytes(16).toString('hex');
        const hashedToken = await bcrypt.hash(plainToken, 10);

        const newLink = await Link.create({
            token: hashedToken,
            type,
            contentCollectionId: targetCollectionId,
            availableDownloads: availableDownloads || null,
            availableBytesToUpload: maxBytesToUpload,
            maxBytesToUpload,
            availableTo: new Date(availableTo),
        });

        return NextResponse.json({
            success: true,
            plainToken, // SHOWN TO THE ADMIN ONLY ONCE
            linkId: newLink._id,
        });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    await dbConnect();
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session')?.value;
    if (!verifySession(session)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const linkId = searchParams.get('id');

        if (!linkId) {
            return NextResponse.json({ error: 'Missing link ID' }, { status: 400 });
        }

        await Link.findByIdAndDelete(linkId);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}