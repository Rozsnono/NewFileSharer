/**
 * ==============================================================================
 * Dedicated Storage API Helper (NASiS3 Integration)
 * ==============================================================================
 * 
 * Provides centralized helper functions to interface with the high-performance
 * Synology NAS uploader and downloader service.
 */

/**
 * Returns the base URL of the dedicated Synology Storage API.
 */
export function getStorageApiUrl(): string {
    let url =
        process.env.UPLOAD_API_URL ||
        process.env.NEXT_PUBLIC_UPLOAD_API_URL ||
        'http://api.filesharer.rozsnorbert.hu:9443';
    url = url.trim().replace(/\/+$/, '');
    if (url.includes(':9443') && url.startsWith('https://')) {
        url = url.replace(/^https:\/\//, 'http://');
    }
    return url;
}

/**
 * Returns the secret API key for the dedicated Storage API.
 */
export function getStorageApiKey(): string {
    return (
        process.env.UPLOAD_API_KEY ||
        process.env.NEXT_PUBLIC_UPLOAD_API_KEY ||
        ''
    );
}

export interface DirectDownloadOptions {
    inline?: boolean;
    apiKey?: string;
}

/**
 * Constructs a direct streaming download URL pointing to the NASiS3 /download endpoint.
 * 
 * @param webdavPath - The remote WebDAV path of the file (e.g. "/uploads/col123/doc.pdf")
 * @param options - Additional download options (inline preview, custom apiKey)
 * @returns Fully-qualified direct download URL
 */
export function buildDirectDownloadUrl(
    webdavPath: string,
    options: DirectDownloadOptions = {}
): string {
    const baseUrl = getStorageApiUrl();
    const key = options.apiKey || getStorageApiKey();

    const url = new URL('/download', baseUrl);
    url.searchParams.set('path', webdavPath);

    if (key) {
        url.searchParams.set('apiKey', key);
    }

    if (options.inline) {
        url.searchParams.set('inline', 'true');
    }

    return url.toString();
}
