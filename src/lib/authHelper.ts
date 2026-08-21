import bcrypt from 'bcryptjs';
import dbConnect from './dbConnect';
import Link, { ILink } from '@/models/Link';

/**
 * Searches and validates a hashed link token against active database records.
 */
export async function findLinkByToken(plainToken: string): Promise<ILink | null> {
    await dbConnect();

    // Filter only active, non-expired links
    const activeLinks = await Link.find({
        availableTo: { $gt: new Date() }
    });

    for (const link of activeLinks) {
        const isMatch = await bcrypt.compare(plainToken, link.token);
        if (isMatch) {
            return link;
        }
    }
    return null;
}