'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';
import { useI18n } from '@/components/I18nProvider';

interface VisibilityDialogProps {
    folder: { id: string; name: string; isPublic: boolean; publicExpiresAt: string | null };
    onClose: () => void;
    /** Called after the setting was saved on the server. */
    onSaved: () => void;
}

/** Public visibility of a collection: on/off plus the date when it turns private again. */
export default function VisibilityDialog({ folder, onClose, onSaved }: VisibilityDialogProps) {
    const { t } = useI18n();
    const [isPublic, setIsPublic] = useState(folder.isPublic);
    const [expiresAt, setExpiresAt] = useState(folder.publicExpiresAt ? folder.publicExpiresAt.split('T')[0] : '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/admin/collections/public', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: folder.id,
                    isPublic,
                    publicExpiresAt: isPublic ? expiresAt : null,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || t('pubFailed'));
            onSaved();
        } catch (err) {
            console.error('Failed to update public settings:', err);
            setError((err as Error).message || t('pubFailed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title={`${t('pubTitle')} – ${folder.name}`} onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">{t('pubDesc')}</p>

                <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-[10px] border border-slate-300 px-4 py-3 text-[15px] font-semibold dark:border-slate-700">
                    {t('pubEnable')}
                    <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="h-5 w-5 cursor-pointer accent-blue-600"
                    />
                </label>

                {isPublic && (
                    <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {t('pubExpiry')}
                        <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="input" required />
                        <span className="text-sm font-normal text-slate-500">{t('pubExpiryHint')}</span>
                    </label>
                )}

                {error && (
                    <p role="alert" className="rounded-[10px] bg-red-100 px-3.5 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">{error}</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} className="btn btn-secondary">{t('wizCancel')}</button>
                    <button type="submit" disabled={saving} className="btn btn-primary">{t('pubSave')}</button>
                </div>
            </form>
        </Modal>
    );
}
