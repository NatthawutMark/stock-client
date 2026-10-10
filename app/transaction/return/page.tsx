'use client';

import { AppLayout } from '@/app/components/layout/AppLayout';
import { useLayout } from '@/app/providers';

export default function RequestPage() {
    const { pageTitle } = useLayout();

    return (
        <AppLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{pageTitle || 'Request'}</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>This page is under construction.</p>
            </div>
        </AppLayout>
    );
}
