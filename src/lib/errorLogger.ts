import dbConnect from './dbConnect';
import Log from '@/models/Log';

/**
 * Standardized system logging utility.
 * Automatically handles database connection and records logs to MongoDB.
 */
export async function writeLog(
    level: 'info' | 'warning' | 'error',
    message: string,
    details?: Record<string, any>
): Promise<void> {
    try {
        await dbConnect();
        await Log.create({
            level,
            message,
            details: details ? JSON.parse(JSON.stringify(details)) : undefined,
        });
    } catch (dbError) {
        // Fallback console logging in case of MongoDB connection breaks
        console.error('Fatal: Failed to write log to MongoDB:', dbError);
        console.error(`Original Log [${level}]: ${message}`, details);
    }
}