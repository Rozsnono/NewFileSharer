'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';

type Level = 'info' | 'warning' | 'error';
type Filter = 'all' | Level;

interface AdminLog {
    _id: string;
    level: Level;
    message: string;
    createdAt: string;
    details?: Record<string, unknown>;
}

const DOT: Record<Level, string> = { info: 'bg-blue-500', warning: 'bg-amber-500', error: 'bg-red-500' };
const BADGE: Record<Level, string> = { info: 'badge-info', warning: 'badge-warning', error: 'badge-danger' };

/** Local calendar day key (YYYY-MM-DD) used to group entries. */
const dayKey = (iso: string): string => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** System log page: level chips with counts, search, entries grouped by day, expandable details. */
export default function LogsPanel() {
    const { lang, t } = useI18n();
    const router = useRouter();
    const locale = lang === 'hu' ? 'hu-HU' : 'en-GB';

    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState<Record<string, boolean>>({});
    const [reloadKey, setReloadKey] = useState(0);
    // "Now" is taken when the logs are (re)loaded, so rendering stays pure.
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        let ignore = false;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                // All levels are loaded once; the chips filter on the client so counts stay visible.
                const res = await fetch('/api/admin/logs?level=all');
                if (res.status === 401) {
                    router.push('/admin/login');
                    return;
                }
                const data = await res.json();
                if (!res.ok || !Array.isArray(data)) throw new Error(data?.error || t('admLoadFailed'));
                if (!ignore) {
                    setLogs(data);
                    setNow(Date.now());
                }
            } catch (err) {
                console.error('Failed to load logs:', err);
                if (!ignore) setError((err as Error).message || t('admLoadFailed'));
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        load();
        return () => {
            ignore = true;
        };
    }, [reloadKey, t, router]);

    const counts = useMemo(() => {
        const result: Record<Filter, number> = { all: logs.length, info: 0, warning: 0, error: 0 };
        logs.forEach((l) => (result[l.level] += 1));
        return result;
    }, [logs]);

    // Filtered entries grouped by day (the API already returns newest first).
    const groups = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const byDay = new Map<string, AdminLog[]>();
        logs
            .filter((l) => (filter === 'all' || l.level === filter) && (!needle || l.message.toLowerCase().includes(needle)))
            .forEach((l) => {
                const key = dayKey(l.createdAt);
                byDay.set(key, [...(byDay.get(key) ?? []), l]);
            });
        return Array.from(byDay.entries());
    }, [logs, filter, query]);

    const dayLabel = (key: string, sample: AdminLog): string => {
        const today = dayKey(new Date(now).toISOString());
        const yesterday = dayKey(new Date(now - 24 * 60 * 60 * 1000).toISOString());
        if (key === today) return t('logToday');
        if (key === yesterday) return t('logYesterday');
        return new Date(sample.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const chips: { key: Filter; label: string }[] = [
        { key: 'all', label: t('logAll') },
        { key: 'info', label: t('logInfo') },
        { key: 'warning', label: t('logWarnings') },
        { key: 'error', label: t('logErrors') },
    ];

    const shown = groups.reduce((sum, [, entries]) => sum + entries.length, 0);

    return (
        <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{t('logTitle')}</h1>
                    <p className="mt-1 text-[15px] text-slate-600 dark:text-slate-400">{t('logCount', { n: shown })}</p>
                </div>
                <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="btn btn-secondary">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> {t('logRefresh')}
                </button>
            </div>

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
                            {chip.key !== 'all' && <span aria-hidden="true" className={`h-2 w-2 rounded-full ${DOT[chip.key]}`} />}
                            {chip.label}
                            <span className={`rounded-full px-1.5 text-xs ${filter === chip.key ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'}`}>{counts[chip.key]}</span>
                        </button>
                    ))}
                </div>

                <label className="relative block w-full sm:ml-auto sm:w-64">
                    <span className="sr-only">{t('logSearch')}</span>
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('logSearch')} className="input !h-10 !pl-9 !text-sm" />
                </label>
            </div>

            {loading && logs.length === 0 && <p className="py-20 text-center text-[15px] text-slate-500">{t('admLoading')}</p>}

            {error && (
                <div role="alert" className="rounded-[10px] bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">{error}</div>
            )}

            {!error && !loading && groups.length === 0 && (
                <div className="card p-10 text-center text-[15px] text-slate-500">{t('logEmpty')}</div>
            )}

            <div className="space-y-6">
                {groups.map(([key, entries]) => (
                    <div key={key} className="space-y-2">
                        <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{dayLabel(key, entries[0])}</h2>
                        <ul className="card divide-y divide-slate-200 overflow-hidden dark:divide-slate-800">
                            {entries.map((log) => {
                                const hasDetails = !!log.details && Object.keys(log.details).length > 0;
                                const expanded = !!open[log._id];
                                return (
                                    <li key={log._id} className="px-4 py-3">
                                        <div className="flex items-start gap-3">
                                            <span aria-hidden="true" className={`mt-2 h-2 w-2 shrink-0 rounded-full ${DOT[log.level]}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="break-words text-[15px] font-medium">{log.message}</p>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                                    <span className={`badge ${BADGE[log.level]}`}>{log.level}</span>
                                                    <time dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleTimeString(locale)}</time>
                                                    {hasDetails && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpen((prev) => ({ ...prev, [log._id]: !expanded }))}
                                                            aria-expanded={expanded}
                                                            className="inline-flex items-center gap-1 rounded px-1 font-semibold text-blue-700 hover:underline dark:text-blue-300"
                                                        >
                                                            {expanded ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                                                            {expanded ? t('logHideDetails') : t('logDetails')}
                                                        </button>
                                                    )}
                                                </div>
                                                {hasDetails && expanded && (
                                                    <pre className="mt-2 max-h-72 overflow-auto rounded-[10px] bg-slate-100 p-3 font-mono text-xs leading-relaxed dark:bg-slate-950">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </div>
        </section>
    );
}
