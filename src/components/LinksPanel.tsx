'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Download, ExternalLink, Plus, Search, Trash2, Upload } from 'lucide-react';
import { FolderIcon } from '@/components/FileTile';
import { useI18n } from '@/components/I18nProvider';
import type { DictKey } from '@/lib/i18n';

type LinkType = 'send' | 'receive' | 'share';
type LinkStatus = 'active' | 'soon' | 'expired';
type Filter = 'all' | LinkStatus;

interface AdminLink {
    _id: string;
    type: LinkType;
    availableDownloads: number | null;
    availableBytesToUpload: number;
    maxBytesToUpload: number;
    availableTo: string;
    createdAt: string;
    contentCollectionId: { _id: string; name?: string } | null;
}

interface LinksPanelProps {
    /** Incremented by the parent after a link was created, to reload the list. */
    reloadKey: number;
    onNewLink: () => void;
    /** Opens a collection in the file manager. */
    onOpenCollection: (collectionId: string) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SOON_MS = 7 * DAY_MS; // links expiring within 7 days are flagged

const TYPE_LABEL: Record<LinkType, DictKey> = { send: 'typeSend', receive: 'typeReceive', share: 'typeShare' };
const TYPE_ICON: Record<LinkType, React.ReactNode> = {
    send: <Download className="h-3.5 w-3.5" aria-hidden="true" />,
    receive: <Upload className="h-3.5 w-3.5" aria-hidden="true" />,
    share: <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />,
};
const STATUS_LABEL: Record<LinkStatus, DictKey> = { active: 'statusActive', soon: 'statusSoon', expired: 'statusExpired' };
const STATUS_BADGE: Record<LinkStatus, string> = { active: 'badge-success', soon: 'badge-warning', expired: 'badge-danger' };
const STATUS_BAR: Record<LinkStatus, string> = { active: 'bg-green-600', soon: 'bg-amber-500', expired: 'bg-red-500' };

function statusOf(availableTo: string, now: number): LinkStatus {
    const left = new Date(availableTo).getTime() - now;
    if (left <= 0) return 'expired';
    return left < SOON_MS ? 'soon' : 'active';
}

function formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
}

/** Links page: filter chips, search and one card per link. */
export default function LinksPanel({ reloadKey, onNewLink, onOpenCollection }: LinksPanelProps) {
    const { lang, t } = useI18n();
    const router = useRouter();
    const locale = lang === 'hu' ? 'hu-HU' : 'en-GB';

    const [links, setLinks] = useState<AdminLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');
    const [localReload, setLocalReload] = useState(0);
    // "Now" is taken when the list is (re)loaded, so rendering stays pure.
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        let ignore = false;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch('/api/admin/links');
                if (res.status === 401) {
                    router.push('/admin/login');
                    return;
                }
                const data = await res.json();
                if (!res.ok || !Array.isArray(data)) throw new Error(data?.error || t('admLoadFailed'));
                if (!ignore) {
                    setLinks(data);
                    setNow(Date.now());
                }
            } catch (err) {
                console.error('Failed to load links:', err);
                if (!ignore) setError((err as Error).message || t('admLoadFailed'));
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        load();
        return () => {
            ignore = true;
        };
    }, [reloadKey, localReload, t, router]);

    const handleDelete = async (id: string) => {
        if (!confirm(t('admConfirmDeleteLink'))) return;
        try {
            const res = await fetch(`/api/admin/links?id=${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || t('admLoadFailed'));
            }
        } catch (err) {
            console.error('Failed to delete link:', err);
            alert((err as Error).message);
        }
        setLocalReload((k) => k + 1);
    };

    const counts = useMemo(() => {
        const result: Record<Filter, number> = { all: links.length, active: 0, soon: 0, expired: 0 };
        links.forEach((l) => (result[statusOf(l.availableTo, now)] += 1));
        return result;
    }, [links, now]);

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return links.filter((l) => {
            if (filter !== 'all' && statusOf(l.availableTo, now) !== filter) return false;
            return !needle || (l.contentCollectionId?.name ?? '').toLowerCase().includes(needle);
        });
    }, [links, filter, query, now]);

    const chips: { key: Filter; label: string }[] = [
        { key: 'all', label: t('lnkFilterAll') },
        { key: 'active', label: t('statusActive') },
        { key: 'soon', label: t('statusSoon') },
        { key: 'expired', label: t('statusExpired') },
    ];

    /** Text under the expiry bar, e.g. "Expires in 12 days". */
    const expiryText = (link: AdminLink, status: LinkStatus): string => {
        const diff = new Date(link.availableTo).getTime() - now;
        if (status === 'expired') return t('lnkExpiredAgo', { n: Math.max(1, Math.floor(-diff / DAY_MS)) });
        const days = Math.ceil(diff / DAY_MS);
        return days <= 1 ? t('lnkExpiresToday') : t('lnkExpiresIn', { n: days });
    };

    return (
        <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{t('admLinksTitle')}</h1>
                    <p className="mt-1 text-[15px] text-slate-600 dark:text-slate-400">
                        {t('admLinksSubtitle', { active: counts.active + counts.soon, soon: counts.soon })}
                    </p>
                </div>
                <button type="button" onClick={onNewLink} className="btn btn-primary">
                    <Plus className="h-4 w-4" aria-hidden="true" /> {t('admNewLink')}
                </button>
            </div>

            {/* Filter chips + search */}
            <div className="flex flex-wrap items-center gap-3">
                <div role="group" aria-label={t('admColStatus')} className="flex flex-wrap gap-2">
                    {chips.map((chip) => (
                        <button
                            key={chip.key}
                            type="button"
                            onClick={() => setFilter(chip.key)}
                            aria-pressed={filter === chip.key}
                            className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition ${
                                filter === chip.key
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                        >
                            {chip.label}
                            <span className={`rounded-full px-1.5 text-xs ${filter === chip.key ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'}`}>{counts[chip.key]}</span>
                        </button>
                    ))}
                </div>

                <label className="relative block w-full sm:ml-auto sm:w-64">
                    <span className="sr-only">{t('lnkSearch')}</span>
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('lnkSearch')} className="input !h-10 !pl-9 !text-sm" />
                </label>
            </div>

            {loading && <p className="py-20 text-center text-[15px] text-slate-500">{t('admLoading')}</p>}

            {!loading && error && (
                <div role="alert" className="rounded-[10px] bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">{error}</div>
            )}

            {!loading && !error && visible.length === 0 && (
                <div className="card p-10 text-center text-[15px] text-slate-500">{links.length === 0 ? t('admNoLinks') : t('lnkNoMatch')}</div>
            )}

            {!loading && !error && visible.length > 0 && (
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {visible.map((link) => {
                        const status = statusOf(link.availableTo, now);
                        const start = new Date(link.createdAt).getTime();
                        const end = new Date(link.availableTo).getTime();
                        const elapsed = end > start ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : 100;
                        const used = Math.max(0, link.maxBytesToUpload - link.availableBytesToUpload);
                        const usedPercent = link.maxBytesToUpload > 0 ? Math.min(100, (used / link.maxBytesToUpload) * 100) : 0;
                        const showDownloads = link.type !== 'receive';
                        const showUploads = link.type !== 'send';
                        const collection = link.contentCollectionId;

                        return (
                            <li key={link._id} className={`card flex flex-col gap-4 p-5 ${status === 'expired' ? 'opacity-75' : ''}`}>
                                <div className="flex items-start gap-3">
                                    <FolderIcon size={44} />
                                    <div className="min-w-0 flex-1">
                                        <h2 className="truncate text-base font-semibold">{collection?.name || t('admCollectionDeleted')}</h2>
                                        <p className="text-sm text-slate-500">{t('lnkCreated', { date: new Date(link.createdAt).toLocaleDateString(locale) })}</p>
                                    </div>
                                    <span className={`badge ${STATUS_BADGE[status]}`}>{t(STATUS_LABEL[status])}</span>
                                </div>

                                <span className="badge badge-neutral self-start">
                                    {TYPE_ICON[link.type]} {t(TYPE_LABEL[link.type])}
                                </span>

                                {/* Time until expiry */}
                                <div className="space-y-1.5">
                                    <div className="flex items-baseline justify-between gap-2 text-sm">
                                        <span className="font-semibold">{expiryText(link, status)}</span>
                                        <span className="text-slate-500">{new Date(link.availableTo).toLocaleDateString(locale)}</span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                        <div className={`h-full rounded-full ${STATUS_BAR[status]}`} style={{ width: `${elapsed}%` }} />
                                    </div>
                                </div>

                                {(showDownloads || showUploads) && (
                                    <dl className="grid grid-cols-2 gap-3 text-sm">
                                        {showDownloads && (
                                            <div>
                                                <dt className="text-slate-500">{t('admColDownloads')}</dt>
                                                <dd className="font-semibold">{link.availableDownloads === null ? t('admUnlimited') : link.availableDownloads}</dd>
                                            </div>
                                        )}
                                        {showUploads && (
                                            <div className={showDownloads ? '' : 'col-span-2'}>
                                                <dt className="text-slate-500">{t('lnkUploaded', { used: formatBytes(used), max: formatBytes(link.maxBytesToUpload) })}</dt>
                                                <dd className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${usedPercent}%` }} />
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                )}

                                <div className="mt-auto flex items-center gap-2 pt-1">
                                    {collection && (
                                        <button type="button" onClick={() => onOpenCollection(collection._id)} className="btn btn-secondary !h-10 flex-1 !text-sm">
                                            <ExternalLink className="h-4 w-4" aria-hidden="true" /> {t('lnkOpenCollection')}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(link._id)}
                                        aria-label={t('admDeleteLink')}
                                        title={t('admDeleteLink')}
                                        className="btn btn-danger !h-10 !w-10 !px-0"
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
