import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encryptSession } from '@/lib/session';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

        if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
            return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
        }
        const token = await encryptSession();
        const cookieStore = await cookies();
        cookieStore.set('admin_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Server authentication failure' }, { status: 500 });
    }
}