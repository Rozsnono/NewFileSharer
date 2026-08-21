import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/session';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Guard all /admin paths, excluding login page
    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        const sessionCookie = request.cookies.get('admin_session')?.value;

        const isValid = await verifySession(sessionCookie);

        if (!isValid) {
            const url = request.nextUrl.clone();
            url.pathname = '/admin/login';
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};