'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { Construction } from 'lucide-react';

export default function TransferOutPage() {
    const { pageTitle } = useLayout();
    const title = pageTitle || 'โอนย้ายสินค้าระหว่างคลัง (Transfer Out)';

    return (
        <AppLayout>
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {title}
                </h1>
                <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    This page is under construction.
                </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-10 text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto mb-3 flex items-center justify-center">
                    <Construction className="w-6 h-6" />
                </div>
                <p className="text-sm sm:text-base font-medium text-zinc-700 dark:text-zinc-300">
                    {title}
                </p>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    This page is under construction.
                </p>
            </div>
        </AppLayout>
    );
}
