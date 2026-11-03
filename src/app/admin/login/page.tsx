'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function AdminLoginPage() {
    const { t } = useI18n();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (!res.ok) {
                // Show a translated message for the common rejection; keep other server errors as is.
                const data = await res.json().catch(() => ({}));
                throw new Error(res.status === 401 ? t('loginRejected') : data.error || t('loginRejected'));
            }

            router.push('/admin');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="absolute right-4 top-4">
                <LanguageSwitcher />
            </div>

            <div className="card w-full max-w-md space-y-5 p-8">
                <div className="flex items-center gap-2.5 text-base font-semibold">
                    <span aria-hidden="true" className="h-8 w-8 rounded-[9px] bg-accent" />
                    {t('appName')}
                </div>

                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('loginTitle')}</h1>
                    <p className="mt-1.5 text-[15px] text-slate-600 dark:text-slate-400">{t('loginSubtitle')}</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {t('password')}
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input"
                            autoComplete="current-password"
                            required
                        />
                    </label>

                    {error && (
                        <p role="alert" className="rounded-[10px] bg-red-100 px-3.5 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
                            {error}
                        </p>
                    )}

                    <button type="submit" disabled={loading} className="btn btn-primary w-full">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : t('signIn')}
                    </button>
                </form>
            </div>
        </div>
    );
}
