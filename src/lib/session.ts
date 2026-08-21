const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback_secret_at_least_32_chars_long';

// Helper to convert an ArrayBuffer to Hexadecimal string
function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

// Generates an HMAC-SHA256 signature using the standard Web Crypto API
async function generateHmacSha256(secret: string, data: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    // Import raw key material for HMAC signing
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    // Sign data
    const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        messageData
    );

    return bufferToHex(signatureBuffer);
}

/**
 * Generates an HMAC-signed session token.
 */
export async function encryptSession(): Promise<string> {
    const data = `admin_session_${Date.now()}`;
    const signature = await generateHmacSha256(JWT_SECRET, data);
    return `${data}.${signature}`;
}

/**
 * Validates the HMAC session token signature and checks the 7-day expiration.
 */
export async function verifySession(token: string | undefined): Promise<boolean> {
    if (!token) return false;
    const [data, signature] = token.split('.');
    if (!data || !signature) return false;

    const expectedSignature = await generateHmacSha256(JWT_SECRET, data);
    if (signature !== expectedSignature) return false;

    const parts = data.split('_');
    const timestamp = parseInt(parts[2] || '0', 10);

    // 7-day expiration check
    if (Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
        return false;
    }

    return true;
}