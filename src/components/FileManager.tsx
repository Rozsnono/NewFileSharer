'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUp, Columns3, Eye, FolderPlus, LayoutGrid, Link2, List, Search } from 'lucide-react';
import { FolderIcon } from '@/components/FileTile';
import { useI18n } from '@/components/I18nProvider';
import LinkWizard from '@/components/LinkWizard';
import TokenDialog from '@/components/TokenDialog';
import VisibilityDialog from '@/components/VisibilityDialog';
import FinderSidebar from '@/components/fm/FinderSidebar';
import { ColumnView, IconView, InfoPanel, ListView, useKindLabel, type ColumnData } from '@/components/fm/FinderViews';
import {
    ROOT_KEY, UnauthorizedError, fetchListing, itemCreated, itemName, keyOf, sameItem, toItems,
    type FolderListing, type Item, type Selection, type SortDir, type SortKey, type ViewMode,
} from '@/components/fm/folderData';

/**
 * Admin file manager in the style of the macOS Finder:
 * folder tree sidebar, back/forward/up, icon / list / column views, path bar, status bar and an
 * info panel. Folders are ContentCollection documents (nested via parentId); files are Content
 * documents. Data: GET/POST /api/admin/files.
 */

const VIEW_STORAGE_KEY = 'filemanager-view';

/** Remembered view mode; localStorage can be unavailable or blocked, so every access is guarded. */
function readStoredView(): ViewMode {
    try {
        const value = window.localStorage.getItem(VIEW_STORAGE_KEY);
        if (value === 'icons' || value === 'list' || value === 'columns') return value;
    } catch {
        /* storage unavailable: fall back to the default view */
    }
    return 'icons';
}

function storeView(view: ViewMode) {
    try {
        window.localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
        /* storage unavailable: the view just is not remembered */
    }
}

const COARSE_QUERY = '(pointer: coarse)';
const subscribeCoarse = (onChange: () => void) => {
    const media = window.matchMedia(COARSE_QUERY);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
};
const getCoarse = () => window.matchMedia(COARSE_QUERY).matches;

export default function FileManager({ initialFolderId = null }: { initialFolderId?: string | null }) {
    const { t } = useI18n();
    const router = useRouter();
    const kindLabel = useKindLabel();
    const coarse = useSyncExternalStore(subscribeCoarse, getCoarse, () => false);

    // Navigation state
    const [currentId, setCurrentId] = useState<string | null>(initialFolderId); // null = root
    const [back, setBack] = useState<(string | null)[]>([]);
    const [forward, setForward] = useState<(string | null)[]>([]);
    const [selection, setSelection] = useState<Selection>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // View state
    const [view, setView] = useState<ViewMode>(() => (typeof window === 'undefined' ? 'icons' : readStoredView()));
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [query, setQuery] = useState('');

    // Folder contents cache: key = folder id or ROOT_KEY
    const [listings, setListings] = useState<Record<string, FolderListing>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [actionError, setActionError] = useState('');
    const loaded = useRef<Set<string>>(new Set());
    const inflight = useRef<Map<string, Promise<boolean>>>(new Map());

    // New folder form
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creating, setCreating] = useState(false);

    // Collection actions: visibility dialog, link wizard, and the "link created" dialog
    const [showVisibility, setShowVisibility] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [createdToken, setCreatedToken] = useState<string | null>(null);

    const mainRef = useRef<HTMLDivElement>(null);

    /** Loads a folder into the cache (once, unless `force`). Resolves to true when it is available. */
    const ensure = useCallback(
        (folderId: string | null, force = false): Promise<boolean> => {
            const key = keyOf(folderId);
            if (!force && loaded.current.has(key)) return Promise.resolve(true);
            const pending = inflight.current.get(key);
            if (pending && !force) return pending;

            const request = (async () => {
                try {
                    const data = await fetchListing(folderId);
                    loaded.current.add(key);
                    setListings((prev) => ({ ...prev, [key]: data }));
                    setErrors((prev) => {
                        if (!(key in prev)) return prev;
                        const next = { ...prev };
                        delete next[key];
                        return next;
                    });
                    return true;
                } catch (err) {
                    if (err instanceof UnauthorizedError) {
                        router.push('/admin/login');
                        return false;
                    }
                    console.error('Failed to load folder listing:', err);
                    setErrors((prev) => ({ ...prev, [key]: (err as Error).message || t('fmLoadFailed') }));
                    return false;
                } finally {
                    inflight.current.delete(key);
                }
            })();
            inflight.current.set(key, request);
            return request;
        },
        [router, t]
    );

    const currentKey = keyOf(currentId);
    const listing = listings[currentKey];
    const crumbs = useMemo(() => listing?.breadcrumb ?? [], [listing]);
    const parentId = crumbs.length >= 2 ? crumbs[crumbs.length - 2].id : null;

    useEffect(() => {
        void ensure(null);
    }, [ensure]);

    useEffect(() => {
        void ensure(currentId);
    }, [currentId, ensure]);

    // Ancestors are needed for the sidebar tree and the column view.
    useEffect(() => {
        crumbs.forEach((crumb) => void ensure(crumb.id));
    }, [crumbs, ensure]);

    /** Tree expansion: explicit user choice wins, otherwise ancestors of the open folder are open. */
    const sidebarExpanded = useMemo(() => {
        const result: Record<string, boolean> = {};
        crumbs.forEach((c) => (result[c.id] = true));
        return { ...result, ...expanded };
    }, [crumbs, expanded]);

    const toggleExpanded = (id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !sidebarExpanded[id] }));
        void ensure(id);
    };

    /** Opens a folder (after its contents are loaded, so the view never flashes empty). */
    const go = useCallback(
        async (id: string | null) => {
            if (id === currentId) return;
            const ok = await ensure(id);
            if (!ok) {
                setActionError(t('fmLoadFailed'));
                return;
            }
            setActionError('');
            setBack((b) => [...b, currentId]);
            setForward([]);
            setCurrentId(id);
            setSelection(null);
            setQuery('');
        },
        [currentId, ensure, t]
    );

    const goBack = () => {
        if (back.length === 0) return;
        const previous = back[back.length - 1];
        setBack((b) => b.slice(0, -1));
        setForward((f) => [currentId, ...f]);
        setCurrentId(previous);
        setSelection(null);
        setQuery('');
    };

    const goForward = () => {
        if (forward.length === 0) return;
        const [next, ...rest] = forward;
        setForward(rest);
        setBack((b) => [...b, currentId]);
        setCurrentId(next);
        setSelection(null);
        setQuery('');
    };

    const goUp = async () => {
        if (currentId === null) return;
        const from = currentId;
        await go(parentId);
        setSelection({ kind: 'folder', id: from }); // like Finder: the folder we came from stays selected
    };

    const changeView = (next: ViewMode) => {
        setView(next);
        storeView(next);
    };

    const handleSort = (key: SortKey) => {
        if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    // Items of the open folder: folders first, sorted, filtered by the search box.
    const items = useMemo(() => {
        const compareNames = (a: Item, b: Item) =>
            itemName(a).localeCompare(itemName(b), undefined, { numeric: true, sensitivity: 'base' });
        const compare = (a: Item, b: Item): number => {
            let result = 0;
            if (sortKey === 'created') result = itemCreated(a).localeCompare(itemCreated(b));
            else if (sortKey === 'size') result = (a.kind === 'file' ? a.file.size : 0) - (b.kind === 'file' ? b.file.size : 0);
            else if (sortKey === 'kind') result = kindLabel(a).localeCompare(kindLabel(b));
            else result = compareNames(a, b);
            if (result === 0) result = compareNames(a, b);
            return sortDir === 'asc' ? result : -result;
        };

        const all = toItems(listing?.folders ?? [], listing?.files ?? []);
        const needle = query.trim().toLowerCase();
        const filtered = needle ? all.filter((i) => itemName(i).toLowerCase().includes(needle)) : all;
        const folders = filtered.filter((i) => i.kind === 'folder').sort(compare);
        const files = filtered.filter((i) => i.kind === 'file').sort(compare);
        return [...folders, ...files];
    }, [listing, query, sortKey, sortDir, kindLabel]);

    const selectedItem = items.find((i) => sameItem(i, selection)) ?? null;

    const openItem = (item: Item) => {
        if (item.kind === 'folder') void go(item.id);
    };

    // Keep the selected row/icon visible when it changes (keyboard navigation).
    useEffect(() => {
        mainRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [selection]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        const mod = e.metaKey || e.ctrlKey;
        const index = items.findIndex((i) => sameItem(i, selection));
        const select = (next: number) => {
            const item = items[Math.max(0, Math.min(items.length - 1, next))];
            if (item) setSelection({ kind: item.kind, id: item.id });
        };

        if (mod && e.key === 'ArrowUp') {
            e.preventDefault();
            void goUp();
        } else if ((mod && e.key === 'ArrowDown') || e.key === 'Enter') {
            if (selectedItem) {
                e.preventDefault();
                openItem(selectedItem);
            }
        } else if (e.key === 'ArrowDown' || (e.key === 'ArrowRight' && view === 'icons')) {
            e.preventDefault();
            select(index + 1);
        } else if (e.key === 'ArrowUp' || (e.key === 'ArrowLeft' && view === 'icons')) {
            e.preventDefault();
            select(index <= 0 ? 0 : index - 1);
        } else if (view === 'columns' && e.key === 'ArrowLeft') {
            e.preventDefault();
            void goUp();
        } else if (view === 'columns' && e.key === 'ArrowRight' && selectedItem) {
            e.preventDefault();
            openItem(selectedItem);
        }
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newFolderName.trim();
        if (!name) return;

        setCreating(true);
        try {
            const res = await fetch('/api/admin/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, parentId: currentId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || t('fmCreateFailed'));

            setNewFolderName('');
            setShowNewFolder(false);
            setActionError('');
            // Refresh this folder and its parent (the parent's folder count changed).
            await Promise.all([ensure(currentId, true), ensure(parentId, true)]);
            setSelection({ kind: 'folder', id: data.folderId });
        } catch (err) {
            console.error('Failed to create folder:', err);
            setActionError((err as Error).message || t('fmCreateFailed'));
        } finally {
            setCreating(false);
        }
    };

    // Columns for the column view: root + every folder on the path to the open folder.
    const columns: ColumnData[] = [
        { folderId: null, listing: listings[ROOT_KEY], openChildId: crumbs[0]?.id ?? null },
        ...crumbs.map((crumb, i) => ({
            folderId: crumb.id,
            listing: listings[crumb.id],
            openChildId: crumbs[i + 1]?.id ?? null,
        })),
    ];

    const title = listing?.folder?.name ?? t('fmRoot');
    const loadError = !listing ? errors[currentKey] : '';
    const selectedFile = selectedItem?.kind === 'file' ? selectedItem : null;

    // The collection that "Visibility" and "Create link" act on: the selected folder, otherwise the open one.
    const openFolderItem = currentId ? (listings[keyOf(parentId)]?.folders ?? []).find((f) => f.id === currentId) ?? null : null;
    const targetFolder = selectedItem?.kind === 'folder' ? selectedItem.folder : openFolderItem;

    /** Re-reads the open folder and its parent (visibility and link counts changed). */
    const refreshAfterChange = async () => {
        await Promise.all([ensure(currentId, true), ensure(parentId, true)]);
    };

    const viewButtons: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
        { mode: 'icons', label: t('fmViewIcons'), icon: <LayoutGrid className="h-4 w-4" aria-hidden="true" /> },
        { mode: 'list', label: t('fmViewList'), icon: <List className="h-4 w-4" aria-hidden="true" /> },
        { mode: 'columns', label: t('fmViewColumns'), icon: <Columns3 className="h-4 w-4" aria-hidden="true" /> },
    ];

    const navButton = 'flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800';

    return (
        <section className="card flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col overflow-hidden md:h-[calc(100vh-4rem)]">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                <div className="flex items-center">
                    <button type="button" onClick={goBack} disabled={back.length === 0} aria-label={t('fmBack')} title={t('fmBack')} className={navButton}>
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={goForward} disabled={forward.length === 0} aria-label={t('fmForward')} title={t('fmForward')} className={navButton}>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => void goUp()} disabled={currentId === null} aria-label={t('fmUp')} title={t('fmUp')} className={navButton}>
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>

                <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</h1>

                <div role="group" aria-label={t('fmViewAs')} className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
                    {viewButtons.map((b) => (
                        <button
                            key={b.mode}
                            type="button"
                            onClick={() => changeView(b.mode)}
                            aria-pressed={view === b.mode}
                            aria-label={b.label}
                            title={b.label}
                            className={`flex h-9 w-9 items-center justify-center transition ${
                                view === b.mode
                                    ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                            }`}
                        >
                            {b.icon}
                        </button>
                    ))}
                </div>

                <label className="relative block w-full sm:w-44">
                    <span className="sr-only">{t('fmSearch')}</span>
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('fmSearch')}
                        className="input !h-9 !pl-8 !text-sm"
                    />
                </label>

                <button
                    type="button"
                    onClick={() => setShowVisibility(true)}
                    disabled={!targetFolder}
                    title={targetFolder ? t('fmVisibility') : t('fmActionsHint')}
                    className="btn btn-secondary !h-9 !px-3 !text-sm"
                >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden xl:inline">{t('fmVisibility')}</span>
                    <span className="sr-only xl:hidden">{t('fmVisibility')}</span>
                </button>
                <button
                    type="button"
                    onClick={() => setShowWizard(true)}
                    disabled={!targetFolder}
                    title={targetFolder ? t('fmCreateLink') : t('fmActionsHint')}
                    className="btn btn-secondary !h-9 !px-3 !text-sm"
                >
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden xl:inline">{t('fmCreateLink')}</span>
                    <span className="sr-only xl:hidden">{t('fmCreateLink')}</span>
                </button>

                <button type="button" onClick={() => setShowNewFolder((v) => !v)} aria-expanded={showNewFolder} className="btn btn-secondary !h-9 !px-3 !text-sm">
                    <FolderPlus className="h-4 w-4" aria-hidden="true" /> {t('fmNewFolder')}
                </button>
            </div>

            {showNewFolder && (
                <form onSubmit={handleCreateFolder} className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row dark:border-slate-800 dark:bg-slate-900/60">
                    <label className="sr-only" htmlFor="new-folder-name">{t('fmNewFolderName')}</label>
                    <input
                        id="new-folder-name"
                        type="text"
                        autoFocus
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder={t('fmNewFolderName')}
                        maxLength={120}
                        className="input !h-9 min-w-0 flex-1 !text-sm"
                    />
                    <div className="flex gap-2">
                        <button type="submit" disabled={creating || !newFolderName.trim()} className="btn btn-primary !h-9 !px-4 !text-sm">{t('fmCreate')}</button>
                        <button type="button" onClick={() => setShowNewFolder(false)} className="btn btn-secondary !h-9 !px-4 !text-sm">{t('wizCancel')}</button>
                    </div>
                </form>
            )}

            {actionError && (
                <p role="alert" className="border-b border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    {actionError}
                </p>
            )}

            {/* Body: sidebar | content | info panel */}
            <div className="flex min-h-0 flex-1">
                <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-slate-50/80 md:block dark:border-slate-800 dark:bg-slate-900/50">
                    <FinderSidebar
                        listings={listings}
                        currentId={currentId}
                        expanded={sidebarExpanded}
                        onToggle={toggleExpanded}
                        onNavigate={(id) => void go(id)}
                    />
                </aside>

                <div
                    ref={mainRef}
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => {
                        // Click on empty space deselects (like Finder).
                        if (e.target === e.currentTarget) setSelection(null);
                    }}
                    className={`min-w-0 flex-1 outline-none ${view === 'columns' ? 'overflow-hidden' : 'overflow-auto'}`}
                >
                    {!listing && !loadError && <p className="p-8 text-center text-[15px] text-slate-500">{t('fmLoading')}</p>}

                    {loadError && (
                        <div role="alert" className="m-4 flex items-center justify-between gap-3 rounded-[10px] bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
                            <span>{loadError}</span>
                            <button type="button" onClick={() => void ensure(currentId, true)} className="btn btn-secondary !h-9 !px-3 !text-sm">↻</button>
                        </div>
                    )}

                    {listing && view === 'columns' && (
                        <ColumnView
                            columns={columns}
                            selection={selection}
                            onOpenFolder={(id) => void go(id)}
                            onSelectFile={(item) => setSelection({ kind: item.kind, id: item.id })}
                            preview={selectedFile ? <InfoPanel item={selectedFile} listing={listing} /> : null}
                        />
                    )}

                    {listing && view !== 'columns' && items.length === 0 && (
                        <p className="p-10 text-center text-[15px] text-slate-500">{query.trim() ? t('fmNoResults') : t('fmEmpty')}</p>
                    )}

                    {listing && view === 'icons' && items.length > 0 && (
                        <IconView
                            items={items}
                            selection={selection}
                            onSelect={(item) => setSelection({ kind: item.kind, id: item.id })}
                            onOpen={openItem}
                            coarse={coarse}
                        />
                    )}

                    {listing && view === 'list' && items.length > 0 && (
                        <ListView
                            items={items}
                            selection={selection}
                            onSelect={(item) => setSelection({ kind: item.kind, id: item.id })}
                            onOpen={openItem}
                            coarse={coarse}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                        />
                    )}
                </div>

                {view !== 'columns' && (
                    <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50/60 lg:block dark:border-slate-800 dark:bg-slate-900/40">
                        <InfoPanel
                            item={selectedItem}
                            listing={listing}
                            currentFolder={openFolderItem}
                            onVisibility={() => setShowVisibility(true)}
                            onCreateLink={() => setShowWizard(true)}
                        />
                    </aside>
                )}
            </div>

            {/* Path bar + status bar */}
            <div className="border-t border-slate-200 dark:border-slate-800">
                <nav aria-label={t('fmBreadcrumb')} className="flex items-center gap-0.5 overflow-x-auto px-3 py-1.5 text-xs">
                    <button type="button" onClick={() => void go(null)} className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                        {t('fmRoot')}
                    </button>
                    {crumbs.map((crumb) => (
                        <React.Fragment key={crumb.id}>
                            <span className="text-slate-400" aria-hidden="true">›</span>
                            <button
                                type="button"
                                onClick={() => void go(crumb.id)}
                                aria-current={crumb.id === currentId ? 'page' : undefined}
                                className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                                    crumb.id === currentId ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'
                                }`}
                            >
                                <FolderIcon size={14} />
                                {crumb.name}
                            </button>
                        </React.Fragment>
                    ))}
                </nav>
                <p aria-live="polite" className="border-t border-slate-100 px-3 py-1 text-center text-xs text-slate-500 dark:border-slate-800/70">
                    {selectedItem ? t('fmItemsSelected', { n: items.length }) : t('fmItems', { n: items.length })}
                </p>
            </div>

            {showVisibility && targetFolder && (
                <VisibilityDialog
                    folder={targetFolder}
                    onClose={() => setShowVisibility(false)}
                    onSaved={() => {
                        setShowVisibility(false);
                        void refreshAfterChange();
                    }}
                />
            )}

            {showWizard && targetFolder && (
                <LinkWizard
                    initialCollectionId={targetFolder.id}
                    onClose={() => setShowWizard(false)}
                    onCreated={(token) => {
                        setShowWizard(false);
                        setCreatedToken(token);
                        void refreshAfterChange();
                    }}
                />
            )}

            {createdToken && <TokenDialog token={createdToken} onClose={() => setCreatedToken(null)} />}
        </section>
    );
}
