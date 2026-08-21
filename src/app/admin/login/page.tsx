'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
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
                const data = await res.json();
                throw new Error(data.error || 'Login rejected.');
            }

            router.push('/admin');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm space-y-6">
                <div className="text-center space-y-2">
                    <ShieldCheck className="h-10 w-10 text-blue-500 mx-auto animate-pulse" />
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Admin Authentication</h1>
                    <p className="text-xs text-slate-500">Provide the master password configured in your environment.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                            type="password"
                            placeholder="Master Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {error && <p className="text-xs text-red-500">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}