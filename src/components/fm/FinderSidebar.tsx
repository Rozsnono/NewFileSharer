'use client';

import React from 'react';
import { ChevronRight, HardDrive } from 'lucide-react';
import { FolderIcon } from '@/components/FileTile';
import { useI18n } from '@/components/I18nProvider';
import { ROOT_KEY, type FolderListing } from '@/components/fm/folderData';

interface FinderSidebarProps {
    listings: Record<string, FolderListing>;
    currentId: string | null;
    expanded: Record<string, boolean>;
    onToggle: (id: string) => void;
    onNavigate: (id: string | null) => void;
}

const ROW_BASE = 'flex min-h-8 items-center rounded-md text-sm';
const ROW_ACTIVE = 'bg-blue-600 text-white';
const ROW_IDLE = 'text-slate-700 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800';

/** Left column of the file manager: the collapsible folder tree (children are loaded lazily). */
export default function FinderSidebar({ listings, currentId, expanded, onToggle, onNavigate }: FinderSidebarProps) {
    const { t } = useI18n();

    /** Rows of the folders inside `parentKey` (ROOT_KEY or a folder id), indented by depth. */
    const renderChildren = (parentKey: string, depth: number): React.ReactNode =>
        (listings[parentKey]?.folders ?? []).map((folder) => {
            const isOpen = !!expanded[folder.id];
            const isCurrent = currentId === folder.id;
            const hasChildren = folder.folderCount > 0;
            return (
                <li key={folder.id} role="none">
                    <div
                        role="treeitem"
                        aria-expanded={hasChildren ? isOpen : undefined}
                        aria-selected={isCurrent}
                        style={{ paddingLeft: 4 + depth * 14 }}
                        className={`${ROW_BASE} gap-1 pr-2 ${isCurrent ? ROW_ACTIVE : ROW_IDLE}`}
                    >
                        <button
                            type="button"
                            onClick={() => onToggle(folder.id)}
                            aria-label={t('fmExpand')}
                            tabIndex={-1}
                            className={`flex h-6 w-5 shrink-0 items-center justify-center ${hasChildren ? '' : 'invisible'}`}
                        >
                            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onNavigate(folder.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
                        >
                            <FolderIcon size={18} />
                            <span className="truncate">{folder.name}</span>
                        </button>
                    </div>
                    {isOpen && hasChildren && <ul role="group">{renderChildren(folder.id, depth + 1)}</ul>}
                </li>
            );
        });

    return (
        <nav aria-label={t('fmSidebar')} className="h-full overflow-y-auto p-2">
            <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('fmSidebar')}</p>
            <ul role="tree" className="space-y-0.5">
                <li role="none">
                    <div role="treeitem" aria-selected={currentId === null} className={`${ROW_BASE} ${currentId === null ? ROW_ACTIVE : ROW_IDLE}`}>
                        <button type="button" onClick={() => onNavigate(null)} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1 text-left font-semibold">
                            <HardDrive className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="truncate">{t('fmRoot')}</span>
                        </button>
                    </div>
                    <ul role="group" className="mt-0.5 space-y-0.5">{renderChildren(ROOT_KEY, 0)}</ul>
                </li>
            </ul>
        </nav>
    );
}
