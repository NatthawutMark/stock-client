'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/ui';
import { useI18n } from '../providers';

export default function DashboardPage() {
    const { t } = useI18n();
    const [stats, setStats] = useState<Record<string, number> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.success) {
                    setStats(data.data);
                }
            })
            .catch(() => {
                // กรณีไม่มี endpoint /api/dashboard ให้แสดงค่าเริ่มต้น 0
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <AppLayout>
            <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-bold">{t.dashboard.title}</h1>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <StatCard
                        title={t.dashboard.totalItems}
                        value={stats?.totalItems || 0}
                        icon="📦"
                        accent="blue"
                    />
                    <StatCard
                        title={t.dashboard.totalStock}
                        value={stats?.totalStock || 0}
                        icon="🗃️"
                        accent="green"
                    />
                    <StatCard
                        title={t.dashboard.lowStock}
                        value={stats?.lowStock || 0}
                        icon="⚠️"
                        accent="yellow"
                        trend={(stats?.lowStock ?? 0) > 0 ? 'up' : 'neutral'}
                    />
                    <StatCard
                        title={t.dashboard.pendingDocs}
                        value={stats?.pendingDocs || 0}
                        icon="📄"
                        accent="purple"
                    />
                </div>
            )}

            <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div
                    className="rounded-2xl p-4 sm:p-6 border bg-card text-card-foreground shadow-sm"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                    <h3 className="font-semibold mb-4">{t.dashboard.recentActivity}</h3>
                    <p className="text-sm text-secondary" style={{ color: 'var(--text-secondary)' }}>
                        {t.common.noData}
                    </p>
                </div>
                <div
                    className="rounded-2xl p-4 sm:p-6 border bg-card text-card-foreground shadow-sm"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                    <h3 className="font-semibold mb-4">{t.dashboard.stockByWarehouse}</h3>
                    <p className="text-sm text-secondary" style={{ color: 'var(--text-secondary)' }}>
                        {t.common.noData}
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
