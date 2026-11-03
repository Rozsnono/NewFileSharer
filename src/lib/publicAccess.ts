import mongoose, { Types } from 'mongoose';
import ContentCollection from '@/models/ContentCollection';

/**
 * Public visibility of collections (folders).
 *
 * A collection is publicly reachable when it, or any of its ancestors, is public and its
 * public period has not ended. Subfolders therefore INHERIT the visibility of a public parent.
 * The highest public ancestor is the "share root": the public browser starts there and never
 * reveals anything above it.
 *
 * Callers must have connected to the database (dbConnect) before using these helpers.
 */

// Protects against cycles in bad data when walking up the folder tree.
const MAX_DEPTH = 50;

interface FolderDoc {
    _id: Types.ObjectId;
    name?: string;
    isPublic?: boolean;
    publicExpiresAt?: Date | null;
    parentId?: Types.ObjectId | null;
    createdAt: Date;
}

export interface PublicCrumb {
    id: string;
    name: string;
}

export interface PublicResolution {
    /** Path from the share root down to the requested folder (both included). */
    path: PublicCrumb[];
    /** When the public period of the share root ends. */
    expiresAt: Date;
}

const isActivePublic = (folder: FolderDoc, now: Date): boolean =>
    !!folder.isPublic && !!folder.publicExpiresAt && new Date(folder.publicExpiresAt) > now;

/** The folder and its ancestors, nearest first. */
async function chainUp(folderId: string): Promise<FolderDoc[]> {
    const chain: FolderDoc[] = [];
    let currentId: string | null = folderId;
    for (let depth = 0; currentId && depth < MAX_DEPTH; depth++) {
        const doc = (await ContentCollection.findById(currentId).lean()) as FolderDoc | null;
        if (!doc) break;
        chain.push(doc);
        currentId = doc.parentId ? doc.parentId.toString() : null;
    }
    return chain;
}

/**
 * Resolves the public path of a folder, or null when the folder does not exist or is not
 * (or no longer) publicly reachable.
 */
export async function resolvePublic(folderId: string): Promise<PublicResolution | null> {
    if (!mongoose.isValidObjectId(folderId)) return null;

    const chain = await chainUp(folderId);
    if (chain.length === 0 || chain[0]._id.toString() !== folderId) return null;

    const now = new Date();
    let rootIndex = -1;
    chain.forEach((folder, index) => {
        if (isActivePublic(folder, now)) rootIndex = index; // ends on the highest public ancestor
    });
    if (rootIndex === -1) return null;

    return {
        path: chain
            .slice(0, rootIndex + 1)
            .reverse()
            .map((folder) => ({ id: folder._id.toString(), name: folder.name || '' })),
        expiresAt: new Date(chain[rootIndex].publicExpiresAt as Date),
    };
}

/** True when the folder is publicly reachable (it or an ancestor is public and not expired). */
export async function isPubliclyReachable(folderId: string): Promise<boolean> {
    return (await resolvePublic(folderId)) !== null;
}

/** The share roots: public folders that are not inside another public folder, newest first. */
export async function listPublicRoots(): Promise<FolderDoc[]> {
    const candidates = (await ContentCollection.find({
        isPublic: true,
        publicExpiresAt: { $gt: new Date() },
    })
        .sort({ createdAt: -1 })
        .lean()) as FolderDoc[];

    const roots: FolderDoc[] = [];
    for (const candidate of candidates) {
        const resolution = await resolvePublic(candidate._id.toString());
        if (resolution && resolution.path[0].id === candidate._id.toString()) roots.push(candidate);
    }
    return roots;
}
