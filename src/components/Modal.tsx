'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';

interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    /** Tailwind max-width class for the dialog box, e.g. `max-w-lg`. */
    widthClass?: string;
}

/**
 * Accessible dialog: role="dialog", labelled by its title, closes on Escape, focus moves into it.
 * It does NOT close on backdrop click, so a half-filled form is never lost by accident.
 */
export default function Modal({ title, onClose, children, widthClass = 'max-w-md' }: ModalProps) {
    const { t } = useI18n();
    const titleId = useId();
    const boxRef = useRef<HTMLDivElement>(null);

    // Move focus into the dialog once, when it opens (not on every re-render).
    useEffect(() => {
        boxRef.current?.focus();
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4">
            <div
                ref={boxRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={`card max-h-[92vh] w-full ${widthClass} overflow-y-auto rounded-b-none p-5 shadow-xl outline-none sm:rounded-2xl sm:rounded-b-2xl sm:p-7`}
            >
                <div className="mb-5 flex items-start justify-between gap-4">
                    <h2 id={titleId} className="text-xl font-bold tracking-tight">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('close')}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
