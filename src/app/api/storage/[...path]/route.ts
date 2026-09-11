import { NextRequest, NextResponse } from 'next/server';

function getTargetBaseUrl(): string {
    let url = (
        process.env.UPLOAD_API_URL ||
        process.env.NEXT_PUBLIC_UPLOAD_API_URL ||
        'http://api.filesharer.rozsnorbert.hu:9443'
    ).trim().replace(/\/+$/, '');

    // Port 9443 on the Synology NAS runs plain HTTP. If configured with https://,
    // normalize to http:// to prevent SSL protocol handshake failures.
    if (url.includes(':9443') && url.startsWith('https://')) {
        url = url.replace(/^https:\/\//, 'http://');
    }

    return url;
}

const UPLOAD_API_KEY =
    process.env.UPLOAD_API_KEY ||
    process.env.NEXT_PUBLIC_UPLOAD_API_KEY ||
    'test-secret-key-12345';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const subPath = path.join('/');

    const baseUrl = getTargetBaseUrl();
    const search = request.nextUrl.search;
    let targetUrl = `${baseUrl}/${subPath}${search}`;

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
        let bodyBuffer: Buffer | undefined;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            const ab = await request.arrayBuffer();
            bodyBuffer = Buffer.from(ab);
        }

        const makeCall = async (url: string) => {
            const fetchOptions: RequestInit = {
                method: request.method,
                headers: forwardHeaders,
            };
            if (bodyBuffer) {
                fetchOptions.body = bodyBuffer as unknown as BodyInit;
            }
            return fetch(url, fetchOptions);
        };

        let remoteResponse: Response;
        try {
            remoteResponse = await makeCall(targetUrl);
        } catch (initialErr) {
            // If failed on https, retry with http
            if (targetUrl.startsWith('https://')) {
                targetUrl = targetUrl.replace(/^https:\/\//, 'http://');
                remoteResponse = await makeCall(targetUrl);
            } else {
                throw initialErr;
            }
        }

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
        const err = error as any;
        console.error(`[Storage Proxy Error] Failed calling ${targetUrl}:`, err.message, err.cause);
        return NextResponse.json(
            {
                error: 'Storage Gateway Error',
                message: `Failed communicating with remote storage API: ${err.message}`,
                targetUrl,
                cause: err.cause?.message || String(err.cause || ''),
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
