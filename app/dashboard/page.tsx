'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { StatCard } from '../components/ui/StatCard';
import { useI18n } from '../providers';
import { apiClient } from '@/lib/api/client';
import { masterService } from '@/lib/api/services/master';
import { env } from 'process';

export default function DashboardPage() {
    const { t } = useI18n();
    const [stats, setStats] = useState<Record<string, number> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setStats(data.data);
                }
            })
            .finally(() => setLoading(false));

        masterService.warehouses.list({ limit: 5 }).then(data => {
            console.log('Warehouses:', data);
        })
    }, []);

    return (
        <AppLayout>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t.dashboard.title}</h1>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

            {/* Placeholder for more content */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl p-6 border bg-card text-card-foreground shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <h3 className="font-semibold mb-4">{t.dashboard.recentActivity}</h3>
                    <p className="text-sm text-secondary" style={{ color: 'var(--text-secondary)' }}>{t.common.noData}</p>
                </div>
                <div className="rounded-2xl p-6 border bg-card text-card-foreground shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <h3 className="font-semibold mb-4">{t.dashboard.stockByWarehouse}</h3>
                    <p className="text-sm text-secondary" style={{ color: 'var(--text-secondary)' }}>{t.common.noData}</p>
                </div>
            </div>
        </AppLayout>
    );
}
