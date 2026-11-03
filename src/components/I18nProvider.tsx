'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { makeT, type DictKey, type Lang } from '@/lib/i18n';

interface I18nValue {
    lang: Lang;
    t: (key: DictKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Makes the language chosen on the server available to client components. */
export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
    const value = useMemo<I18nValue>(() => ({ lang, t: makeT(lang) }), [lang]);
    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Client-side `{ lang, t }`; must be used below <I18nProvider> (set up in the root layout). */
export function useI18n(): I18nValue {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
    return ctx;
}
