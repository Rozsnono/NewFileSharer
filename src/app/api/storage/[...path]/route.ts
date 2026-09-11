import { NextRequest, NextResponse } from 'next/server';

const UPLOAD_API_URL = (
    process.env.UPLOAD_API_URL ||
    process.env.NEXT_PUBLIC_UPLOAD_API_URL ||
    'http://api.filesharer.rozsnorbert.hu:9443'
).replace(/\/+$/, '');

const UPLOAD_API_KEY =
    process.env.UPLOAD_API_KEY ||
    process.env.NEXT_PUBLIC_UPLOAD_API_KEY ||
    'test-secret-key-12345';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const subPath = path.join('/');

    // Build remote destination URL
    const search = request.nextUrl.search;
    const targetUrl = `${UPLOAD_API_URL}/${subPath}${search}`;

    // Prepare headers for remote call
    const forwardHeaders: Record<string, string> = {
        'x-api-key': UPLOAD_API_KEY,
    };

    const contentType = request.headers.get('content-type');
    if (contentType) {
        forwardHeaders['content-type'] = contentType;
    }

    const range = request.headers.get('range');
    if (range) {
        forwardHeaders['range'] = range;
    }

    try {
        const fetchOptions: RequestInit = {
            method: request.method,
            headers: forwardHeaders,
        };

        // Forward body for non-GET/HEAD methods
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            const bodyBuffer = await request.arrayBuffer();
            fetchOptions.body = Buffer.from(bodyBuffer);
        }

        const remoteResponse = await fetch(targetUrl, fetchOptions);

        // Forward response headers back to client
        const responseHeaders = new Headers();
        const copyHeaders = [
            'content-type',
            'content-length',
            'content-disposition',
            'content-range',
            'accept-ranges',
            'etag',
            'last-modified',
        ];

        for (const h of copyHeaders) {
            const val = remoteResponse.headers.get(h);
            if (val) {
                responseHeaders.set(h, val);
            }
        }

        return new Response(remoteResponse.body, {
            status: remoteResponse.status,
            statusText: remoteResponse.statusText,
            headers: responseHeaders,
        });
    } catch (error) {
        const err = error as Error;
        console.error(`[Storage Proxy Error] Failed calling ${targetUrl}:`, err.message);
        return NextResponse.json(
            {
                error: 'Storage Gateway Error',
                message: `Failed communicating with remote storage API: ${err.message}`,
            },
            { status: 502 }
        );
    }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const OPTIONS = async () => new Response(null, { status: 204 });
