import { createClient } from 'webdav';

const WEBDAV_URL = process.env.WEBDAV_URL;
const WEBDAV_USERNAME = process.env.WEBDAV_USERNAME;
const WEBDAV_PASSWORD = process.env.WEBDAV_PASSWORD;

if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) {
    throw new Error('Please configure all WebDAV environment variables.');
}

export const webdavClient = createClient(WEBDAV_URL, {
    username: WEBDAV_USERNAME,
    password: WEBDAV_PASSWORD,
});

/**
 * Ensures that a target directory exists on the Synology NAS.
 * Recursively creates it if it is missing.
 */
export async function ensureDirectoryExists(path: string): Promise<void> {
    try {
        const exists = await webdavClient.exists(path);
        if (!exists) {
            await webdavClient.createDirectory(path, { recursive: true });
        }
    } catch (error) {
        const exists = await webdavClient.exists(path);
        if (!exists) {
            throw new Error(`Failed to verify or create directory: ${path}. Error: ${(error as Error).message}`);
        }
    }
}