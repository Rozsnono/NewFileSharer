'use client';

import React, { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Eye, Link2 } from 'lucide-react';
import { FilePageIcon, FolderIcon } from '@/components/FileTile';
import { useI18n } from '@/components/I18nProvider';
import {
    extensionOf, formatBytes, itemCreated, itemName, sameItem,
    type FolderItem, type FolderListing, type Item, type Selection, type SortDir, type SortKey,
} from '@/components/fm/folderData';

/** Shared look of a selected row/cell (macOS-style accent selection). */
const SELECTED = 'bg-blue-600 text-white';

interface CommonViewProps {
    items: Item[];
    selection: Selection;
    onSelect: (item: Item) => void;
    onOpen: (item: Item) => void;
    /** Touch devices have no double-click: a tap opens folders directly. */
    coarse: boolean;
}

/** Display name of the kind of an item ("Folder", "PDF file", …). */
export function useKindLabel() {
    const { t } = useI18n();
    return (item: Item): string => {
        if (item.kind === 'folder') return t('fmKindFolder');
        const ext = extensionOf(item.file.originalName);
        return ext ? t('fmKindFile', { ext }) : t('fmKindFileGeneric');
    };
}

/* ───────────────────────────── Icon view ───────────────────────────── */

export function IconView({ items, selection, onSelect, onOpen, coarse }: CommonViewProps) {
    return (
        <ul role="listbox" className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-1 p-3">
            {items.map((item) => {
                const selected = sameItem(item, selection);
                const name = itemName(item);
                return (
                    <li key={`${item.kind}-${item.id}`} role="option" aria-selected={selected}>
                        <button
                            type="button"
                            onClick={() => {
                                onSelect(item);
                                if (coarse) onOpen(item);
                            }}
                            onDoubleClick={() => onOpen(item)}
                            className="flex w-full flex-col items-center gap-1.5 rounded-lg p-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        >
                            <span className={`flex h-[72px] w-20 items-center justify-center rounded-lg ${selected ? 'bg-slate-300/70 dark:bg-slate-700/70' : ''}`}>
                                {item.kind === 'folder' ? <FolderIcon size={60} /> : <FilePageIcon name={name} size={58} />}
                            </span>
                            <span
                                className={`line-clamp-2 max-w-full break-words rounded px-1.5 text-center text-[13px] leading-tight ${
                                    selected ? SELECTED : 'text-slate-800 dark:text-slate-200'
                                }`}
                            >
                                {name}
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

/* ───────────────────────────── List view ───────────────────────────── */

interface ListViewProps extends CommonViewProps {
    sortKey: SortKey;
    sortDir: SortDir;
    onSort: (key: SortKey) => void;
}

const LIST_COLUMNS = 'grid-cols-[minmax(0,1fr)_84px] md:grid-cols-[minmax(0,1fr)_110px_84px_120px]';

export function ListView({ items, selection, onSelect, onOpen, coarse, sortKey, sortDir, onSort }: ListViewProps) {
    const { t, lang } = useI18n();
    const kindLabel = useKindLabel();
    const locale = lang === 'hu' ? 'hu-HU' : 'en-GB';

    const header = (key: SortKey, label: string, extraClass = '') => (
        <button
            type="button"
            onClick={() => onSort(key)}
            className={`flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 ${extraClass}`}
        >
            {label}
            {sortKey === key && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />)}
        </button>
    );

    return (
        <div role="listbox" className="min-w-0">
            <div className={`sticky top-0 z-10 grid ${LIST_COLUMNS} gap-3 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95`}>
                {header('name', t('fmColName'))}
                {header('created', t('fmColCreated'), 'hidden md:flex')}
                {header('size', t('fmColSize'))}
                {header('kind', t('fmColKind'), 'hidden md:flex')}
            </div>
            {items.map((item) => {
                const selected = sameItem(item, selection);
                const name = itemName(item);
                const muted = selected ? 'text-blue-100' : 'text-slate-500';
                return (
                    <button
                        key={`${item.kind}-${item.id}`}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                            onSelect(item);
                            if (coarse) onOpen(item);
                        }}
                        onDoubleClick={() => onOpen(item)}
                        className={`grid ${LIST_COLUMNS} w-full items-center gap-3 px-4 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
                            selected ? SELECTED : 'odd:bg-slate-50 dark:odd:bg-slate-900/40'
                        }`}
                    >
                        <span className="flex min-w-0 items-center gap-2.5">
                            {item.kind === 'folder' ? <FolderIcon size={24} /> : <FilePageIcon name={name} size={24} />}
                            <span className="truncate font-medium">{name}</span>
                            {item.kind === 'folder' && item.folder.isPublic && <Eye className="h-3.5 w-3.5 shrink-0" aria-label={t('fmPublic')} />}
                        </span>
                        <span className={`hidden md:block ${muted}`}>{new Date(itemCreated(item)).toLocaleDateString(locale)}</span>
                        <span className={muted}>{item.kind === 'file' ? formatBytes(item.file.size) : '–'}</span>
                        <span className={`hidden truncate md:block ${muted}`}>{kindLabel(item)}</span>
                    </button>
                );
            })}
        </div>
    );
}

/* ───────────────────────────── Column view ───────────────────────────── */

export interface ColumnData {
    /** Folder id of this column (null = root). */
    folderId: string | null;
    listing: FolderListing | undefined;
    /** Id of the folder that is open in the next column (highlighted in gray). */
    openChildId: string | null;
}

interface ColumnViewProps {
    columns: ColumnData[];
    selection: Selection;
    onOpenFolder: (folderId: string) => void;
    onSelectFile: (item: Item) => void;
    /** Details of the selected file (shown as the rightmost "preview" column). */
    preview: React.ReactNode;
}

export function ColumnView({ columns, selection, onOpenFolder, onSelectFile, preview }: ColumnViewProps) {
    const { t } = useI18n();
    const scroller = useRef<HTMLDivElement>(null);

    // Keep the newest column in view, like Finder does.
    useEffect(() => {
        scroller.current?.scrollTo({ left: scroller.current.scrollWidth, behavior: 'smooth' });
    }, [columns.length, selection]);

    return (
        <div ref={scroller} className="flex h-full overflow-x-auto">
            {columns.map((column, index) => {
                const isLast = index === columns.length - 1;
                const folders = column.listing?.folders ?? [];
                const files = column.listing?.files ?? [];
                return (
                    <div key={column.folderId ?? 'root'} role="listbox" className="h-full w-56 shrink-0 overflow-y-auto border-r border-slate-200 p-1.5 dark:border-slate-800">
                        {!column.listing && <p className="p-3 text-sm text-slate-500">{t('fmLoading')}</p>}
                        {folders.map((folder) => {
                            const open = column.openChildId === folder.id;
                            return (
                                <button
                                    key={folder.id}
                                    type="button"
                                    role="option"
                                    aria-selected={open}
                                    onClick={() => onOpenFolder(folder.id)}
                                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                                        open ? (isLast ? SELECTED : 'bg-slate-300 dark:bg-slate-700') : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <FolderIcon size={20} />
                                    <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                                </button>
                            );
                        })}
                        {files.map((file) => {
                            const item: Item = { kind: 'file', id: file.id, file };
                            const selected = sameItem(item, selection);
                            return (
                                <button
                                    key={file.id}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    onClick={() => onSelectFile(item)}
                                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                                        selected ? SELECTED : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <FilePageIcon name={file.originalName} size={20} />
                                    <span className="min-w-0 flex-1 truncate">{file.originalName}</span>
                                </button>
                            );
                        })}
                        {column.listing && folders.length === 0 && files.length === 0 && (
                            <p className="p-3 text-sm text-slate-500">{t('fmEmpty')}</p>
                        )}
                    </div>
                );
            })}
            {preview && <div className="h-full w-72 shrink-0 overflow-y-auto p-4">{preview}</div>}
        </div>
    );
}

/* ───────────────────────────── Info panel ───────────────────────────── */

interface InfoPanelProps {
    /** Selected item, or null to describe the current folder. */
    item: Item | null;
    listing: FolderListing | undefined;
    /** Data of the open folder (visibility, links); used when nothing is selected. */
    currentFolder?: FolderItem | null;
    /** Collection actions; shown for folders only. */
    onVisibility?: () => void;
    onCreateLink?: () => void;
}

/** Details of the selected item (or of the open folder), like Finder's Get Info / preview pane. */
export function InfoPanel({ item, listing, currentFolder = null, onVisibility, onCreateLink }: InfoPanelProps) {
    const { t, lang } = useI18n();
    const kindLabel = useKindLabel();
    const locale = lang === 'hu' ? 'hu-HU' : 'en-GB';
    const date = (iso: string) => new Date(iso).toLocaleDateString(locale);

    const where = (listing?.breadcrumb ?? []).map((c) => c.name);

    let title = '';
    let icon: React.ReactNode = null;
    const rows: [string, string][] = [];

    /** Rows shared by every folder description: contents, visibility and links. */
    const folderRowsFor = (folder: FolderItem) => {
        rows.push([
            t('fmInfoVisibility'),
            folder.isPublic && folder.publicExpiresAt ? t('fmPublicUntil', { date: date(folder.publicExpiresAt) }) : t('fmPrivate'),
        ]);
        rows.push([t('fmActiveLinks'), String(folder.linkCount)]);
    };
    const folderForActions: FolderItem | null = item ? (item.kind === 'folder' ? item.folder : null) : currentFolder;

    if (item) {
        title = itemName(item);
        icon = item.kind === 'folder' ? <FolderIcon size={72} /> : <FilePageIcon name={title} size={72} />;
        rows.push([t('fmColKind'), kindLabel(item)]);
        if (item.kind === 'file') {
            rows.push([t('fmColSize'), formatBytes(item.file.size)]);
        } else {
            rows.push([t('fmInfoContains'), t('fmContains', { folders: item.folder.folderCount, files: item.folder.fileCount })]);
            folderRowsFor(item.folder);
        }
        rows.push([t('fmColCreated'), date(itemCreated(item))]);
        rows.push([t('fmInfoWhere'), (where.length ? where : [t('fmRoot')]).join(' / ')]);
    } else if (listing?.folder) {
        title = listing.folder.name;
        icon = <FolderIcon size={72} />;
        rows.push([t('fmColKind'), t('fmKindFolder')]);
        rows.push([t('fmInfoContains'), t('fmContains', { folders: listing.folders.length, files: listing.files.length })]);
        if (currentFolder) folderRowsFor(currentFolder);
        rows.push([t('fmInfoWhere'), where.slice(0, -1).join(' / ') || t('fmRoot')]);
    }

    if (!title) {
        return <p className="p-4 text-sm text-slate-500">{t('fmSelectHint')}</p>;
    }

    return (
        <div className="space-y-4 p-4">
            <div className="flex flex-col items-center gap-3 text-center">
                {icon}
                <p className="break-words text-[15px] font-semibold">{title}</p>
            </div>
            <dl className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
                {rows.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 py-2">
                        <dt className="shrink-0 text-slate-500">{label}</dt>
                        <dd className="min-w-0 break-words text-right font-medium">{value}</dd>
                    </div>
                ))}
            </dl>
            {folderForActions && (onVisibility || onCreateLink) && (
                <div className="flex flex-col gap-2 pt-1">
                    {onVisibility && (
                        <button type="button" onClick={onVisibility} className="btn btn-secondary !h-10 !text-sm">
                            <Eye className="h-4 w-4" aria-hidden="true" /> {t('fmVisibility')}
                        </button>
                    )}
                    {onCreateLink && (
                        <button type="button" onClick={onCreateLink} className="btn btn-primary !h-10 !text-sm">
                            <Link2 className="h-4 w-4" aria-hidden="true" /> {t('fmCreateLink')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
