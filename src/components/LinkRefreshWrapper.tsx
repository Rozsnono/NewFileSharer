'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LinkRefreshWrapper({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    useEffect(() => {
        // Listen for cross-component triggers or let client hooks perform a refresh.
        // Using simple polling or custom event triggers on completed upload can trigger router.refresh()
        const handleRefresh = () => {
            router.refresh();
        };

        window.addEventListener('refresh-share-page', handleRefresh);
        return () => {
            window.removeEventListener('refresh-share-page', handleRefresh);
        };
    }, [router]);

    return <>{children}</>;
}