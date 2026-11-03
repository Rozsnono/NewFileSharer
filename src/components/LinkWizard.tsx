'use client';

import React, { useEffect, useState } from 'react';
import { Check, Download, Upload, ArrowLeftRight } from 'lucide-react';
import Modal from '@/components/Modal';
import { useI18n } from '@/components/I18nProvider';

type LinkType = 'send' | 'receive' | 'share';

interface CollectionOption {
    id: string;
    name?: string;
}

interface LinkWizardProps {
    /** Pre-selected collection (e.g. when started from a collection row). */
    initialCollectionId?: string;
    onClose: () => void;
    /** Called with the plain token (shown to the admin only once) after the link was created. */
    onCreated: (plainToken: string) => void;
}

const TOTAL_STEPS = 3;

/** Local YYYY-MM-DD for "tomorrow": the earliest allowed expiry date. */
function tomorrowIso(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 3-step dialog for creating a sharing link: permission → collection/limits/expiry → summary. */
export default function LinkWizard({ initialCollectionId = '', onClose, onCreated }: LinkWizardProps) {
    const { t } = useI18n();
    const [step, setStep] = useState(1);
    const [type, setType] = useState<LinkType>('send');
    const [collectionId, setCollectionId] = useState(initialCollectionId);
    const [quotaGb, setQuotaGb] = useState('5');
    const [maxDownloads, setMaxDownloads] = useState('');
    // Default expiry: tomorrow (also the earliest allowed date)
    const [availableTo, setAvailableTo] = useState(tomorrowIso);
    const [collections, setCollections] = useState<CollectionOption[]>([]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // The collection list is loaded here so the wizard also works when opened from the Links tab.
    useEffect(() => {
        let ignore = false;
        fetch('/api/admin/collections')
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => {
                if (!ignore && Array.isArray(data)) setCollections(data);
            })
            .catch((err) => console.error('Failed to load collections for the link wizard:', err));
        return () => {
            ignore = true;
        };
    }, []);

    const typeOptions: { value: LinkType; label: string; desc: string; icon: React.ReactNode }[] = [
        { value: 'send', label: t('typeSend'), desc: t('typeSendDesc'), icon: <Download className="h-5 w-5" aria-hidden="true" /> },
        { value: 'receive', label: t('typeReceive'), desc: t('typeReceiveDesc'), icon: <Upload className="h-5 w-5" aria-hidden="true" /> },
        { value: 'share', label: t('typeShare'), desc: t('typeShareDesc'), icon: <ArrowLeftRight className="h-5 w-5" aria-hidden="true" /> },
    ];

    /** Validates the limits (step 2); returns an error message or '' when valid. */
    const validateLimits = (): string => {
        if (!(parseFloat(quotaGb) >= 1)) return t('wizErrQuota');
        if (maxDownloads && !(parseInt(maxDownloads, 10) >= 1)) return t('wizErrDownloads');
        if (!availableTo || availableTo < tomorrowIso()) return t('wizErrExpiry');
        return '';
    };

    const goNext = () => {
        if (step === 2) {
            const problem = validateLimits();
            if (problem) {
                setError(problem);
                return;
            }
        }
        setError('');
        setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    };

    const goBack = () => {
        setError('');
        setStep((s) => Math.max(s - 1, 1));
    };

    const submit = async () => {
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/admin/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    contentCollectionId: collectionId || null,
                    availableDownloads: maxDownloads ? parseInt(maxDownloads, 10) : null,
                    maxBytesToUpload: parseFloat(quotaGb) * 1024 * 1024 * 1024,
                    availableTo,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t('wizCreateFailed'));
            onCreated(data.plainToken);
        } catch (err) {
            console.error('Failed to create link:', err);
            setError((err as Error).message || t('wizCreateFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    const selectedType = typeOptions.find((o) => o.value === type)!;
    const collectionName = collections.find((c) => c.id === collectionId)?.name || t('wizNewFolder');

    return (
        <Modal title={t('wizTitle')} onClose={onClose} widthClass="max-w-xl">
            <div className="space-y-6">
                {/* Progress */}
                <div>
                    <p className="mb-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
                        {t('wizStep', { n: step, total: TOTAL_STEPS })}
                    </p>
                    <div className="flex gap-2" aria-hidden="true">
                        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-accent' : 'bg-slate-200 dark:bg-slate-800'}`} />
                        ))}
                    </div>
                </div>

                {/* Step 1: permission */}
                {step === 1 && (
                    <fieldset className="space-y-3">
                        <legend className="mb-1 text-[15px] font-semibold">{t('wizStep1Title')}</legend>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {typeOptions.map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex min-h-[44px] cursor-pointer flex-col gap-1 rounded-xl border-2 p-4 transition ${
                                        type === option.value
                                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="link-type"
                                        value={option.value}
                                        checked={type === option.value}
                                        onChange={() => setType(option.value)}
                                        className="sr-only"
                                    />
                                    <span className={type === option.value ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}>{option.icon}</span>
                                    <span className="text-[15px] font-semibold">{option.label}</span>
                                    <span className="text-sm text-slate-500">{option.desc}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                )}

                {/* Step 2: collection + limits + expiry */}
                {step === 2 && (
                    <div className="space-y-4">
                        <h3 className="text-[15px] font-semibold">{t('wizStep2Title')}</h3>
                        <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {t('wizCollection')}
                            <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="input">
                                <option value="">{t('wizNewFolder')}</option>
                                {collections.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name || c.id}</option>
                                ))}
                            </select>
                        </label>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {t('wizQuota')}
                                <input type="number" min="1" step="any" value={quotaGb} onChange={(e) => setQuotaGb(e.target.value)} className="input" />
                            </label>
                            <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {t('wizMaxDownloads')}
                                <input
                                    type="number"
                                    min="1"
                                    placeholder={t('admUnlimited')}
                                    value={maxDownloads}
                                    onChange={(e) => setMaxDownloads(e.target.value)}
                                    className="input"
                                />
                            </label>
                        </div>

                        <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {t('wizExpiry')}
                            <input type="date" min={tomorrowIso()} value={availableTo} onChange={(e) => setAvailableTo(e.target.value)} className="input" />
                        </label>
                    </div>
                )}

                {/* Step 3: summary */}
                {step === 3 && (
                    <div className="space-y-3">
                        <h3 className="text-[15px] font-semibold">{t('wizStep3Title')}</h3>
                        <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
                            {[
                                [t('admColType'), selectedType.label],
                                [t('wizCollection'), collectionName],
                                [t('wizQuota'), `${quotaGb} GB`],
                                [t('wizMaxDownloads'), maxDownloads || t('admUnlimited')],
                                [t('wizExpiry'), availableTo],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between gap-4 px-4 py-3">
                                    <dt className="text-slate-500">{label}</dt>
                                    <dd className="text-right font-semibold">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}

                {error && (
                    <p role="alert" className="rounded-[10px] bg-red-100 px-3.5 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
                        {error}
                    </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={step === 1 ? onClose : goBack} className="btn btn-secondary">
                        {step === 1 ? t('wizCancel') : t('wizBack')}
                    </button>
                    {step < TOTAL_STEPS ? (
                        <button type="button" onClick={goNext} className="btn btn-primary">{t('wizNext')}</button>
                    ) : (
                        <button type="button" onClick={submit} disabled={submitting} className="btn btn-primary">
                            <Check className="h-4 w-4" aria-hidden="true" /> {t('wizCreate')}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
