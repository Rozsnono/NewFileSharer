import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/dbConnect';
import Log from '@/models/Log';
import { verifySession } from '@/lib/session';

export async function GET(request: Request) {
    await dbConnect();
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session')?.value;
    if (!verifySession(session)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');

    const query: any = {};
    if (level && level !== 'all') {
        query.level = level;
    }

    const logs = await Log.find(query).sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json(logs);
}