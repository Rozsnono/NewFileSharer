'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LANGS, LANG_COOKIE, type Lang } from '@/lib/i18n';
import { useI18n } from '@/components/I18nProvider';

/** Stores the chosen language in a cookie (1 year) that the server reads on the next render. */
function persistLang(lang: Lang) {
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

/** HU / EN toggle. Stores the choice in a cookie and re-renders the server components. */
export default function LanguageSwitcher() {
    const { lang, t } = useI18n();
    const router = useRouter();

    const choose = (next: Lang) => {
        if (next === lang) return;
        persistLang(next);
        router.refresh();
    };

    return (
        <div role="group" aria-label={t('language')} className="inline-flex overflow-hidden rounded-[10px] border border-slate-300 dark:border-slate-700">
            {LANGS.map((code) => (
                <button
                    key={code}
                    type="button"
                    onClick={() => choose(code)}
                    aria-pressed={code === lang}
                    className={`h-9 min-w-11 px-3 text-xs font-semibold uppercase transition ${
                        code === lang
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                >
                    {code}
                </button>
            ))}
        </div>
    );
}
