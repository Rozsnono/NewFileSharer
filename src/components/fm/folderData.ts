/**
 * Shared types and helpers of the admin file manager (Finder-like).
 * Folders are ContentCollection documents (nested via parentId), files are Content documents.
 * The data comes from GET /api/admin/files[?folderId=<id>].
 */

export interface FolderItem {
    id: string;
    name: string;
    isPublic: boolean;
    publicExpiresAt: string | null;
    folderCount: number;
    fileCount: number;
    /** Number of active (not expired) links pointing at this folder. */
    linkCount: number;
    createdAt: string;
}

export interface FileItem {
    id: string;
    originalName: string;
    size: number;
    mimeType: string;
    createdAt: string;
}

export interface Crumb {
    id: string;
    name: string;
}

export interface FolderListing {
    folder: Crumb | null;
    breadcrumb: Crumb[];
    folders: FolderItem[];
    files: FileItem[];
}

export type ViewMode = 'icons' | 'list' | 'columns';
export type SortKey = 'name' | 'created' | 'size' | 'kind';
export type SortDir = 'asc' | 'desc';

/** A folder or a file shown in a view. */
export type Item =
    | { kind: 'folder'; id: string; folder: FolderItem }
    | { kind: 'file'; id: string; file: FileItem };

/** Selected item; `kind` is kept because folder and file ids come from different collections. */
export type Selection = { kind: 'folder' | 'file'; id: string } | null;

export const ROOT_KEY = 'root';
export const keyOf = (folderId: string | null): string => folderId ?? ROOT_KEY;

/** Thrown when the admin session is no longer valid (HTTP 401). */
export class UnauthorizedError extends Error {}

export async function fetchListing(folderId: string | null): Promise<FolderListing> {
    const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : '';
    const res = await fetch(`/api/admin/files${query}`);
    if (res.status === 401) throw new UnauthorizedError('Unauthorized');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data as FolderListing;
}

export function formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
}

/** Upper-case file extension without the dot, or '' when there is none. */
export function extensionOf(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toUpperCase() : '';
}

export function toItems(folders: FolderItem[], files: FileItem[]): Item[] {
    return [
        ...folders.map((folder): Item => ({ kind: 'folder', id: folder.id, folder })),
        ...files.map((file): Item => ({ kind: 'file', id: file.id, file })),
    ];
}

export const itemName = (item: Item): string => (item.kind === 'folder' ? item.folder.name : item.file.originalName);
export const itemCreated = (item: Item): string => (item.kind === 'folder' ? item.folder.createdAt : item.file.createdAt);
export const sameItem = (item: Item, selection: Selection): boolean =>
    !!selection && selection.kind === item.kind && selection.id === item.id;
