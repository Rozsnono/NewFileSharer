'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import Modal from '@/components/Modal';
import { useI18n } from '@/components/I18nProvider';

/** Shows the freshly created share link. The plain token is never stored, so this is the only time it is visible. */
export default function TokenDialog({ token, onClose }: { token: string; onClose: () => void }) {
    const { t } = useI18n();
    const [copied, setCopied] = useState(false);
    const url = `${window.location.origin}/l/${token}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Clipboard can be unavailable (insecure context); the link stays selectable in the dialog.
            console.error('Failed to copy link to clipboard:', err);
        }
    };

    return (
        <Modal title={t('tokTitle')} onClose={onClose}>
            <div className="space-y-4">
                <p role="alert" className="rounded-[10px] bg-amber-100 px-3.5 py-3 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    {t('tokWarn')}
                </p>
                <div className="flex items-center gap-2 rounded-[10px] border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                    <span className="w-full select-all break-all font-mono text-sm">{url}</span>
                    <button
                        type="button"
                        onClick={copy}
                        aria-label={t('tokCopy')}
                        title={t('tokCopy')}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        {copied ? <Check className="h-4 w-4 text-green-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                    </button>
                </div>
                <p aria-live="polite" className="h-5 text-sm text-green-700 dark:text-green-400">{copied ? t('tokCopied') : ''}</p>
                <button type="button" onClick={onClose} className="btn btn-primary w-full">{t('tokDone')}</button>
            </div>
        </Modal>
    );
}
