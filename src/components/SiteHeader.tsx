import React from 'react';
import Link from 'next/link';
import { getI18n } from '@/lib/i18nServer';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/** Top bar of the public pages: logo, language switcher and (optionally) the admin link. */
export default async function SiteHeader({ showAdminLink = false }: { showAdminLink?: boolean }) {
    const { t } = await getI18n();

    return (
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                <Link href="/" className="flex items-center gap-2.5 text-base font-semibold">
                    <span aria-hidden="true" className="h-7 w-7 rounded-[9px] bg-accent" />
                    {t('appName')}
                </Link>
                <div className="flex items-center gap-3">
                    <LanguageSwitcher />
                    {showAdminLink && (
                        <Link href="/admin" className="btn btn-secondary !h-9 !px-3.5 !text-sm">
                            {t('adminPanel')}
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
