'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui';
import type { FutureSlotConfig } from '@/lib/dashboard';
import type { Lang } from '@/lib/i18n/translations';
import {
    AlertTriangle,
    ArrowLeftRight,
    ArrowUpRight,
    PlugZap,
    RotateCcw,
    TrendingUp,
} from 'lucide-react';

interface FutureSlotCardProps {
    slot: FutureSlotConfig;
    lang: Lang;
}

function renderSlotIcon(id: string) {
    if (id === 'damaged-inventory') return <AlertTriangle className="w-4 h-4" />;
    if (id === 'warehouse-transfers') return <ArrowLeftRight className="w-4 h-4" />;
    if (id === 'returns-disposals') return <RotateCcw className="w-4 h-4" />;
    return <TrendingUp className="w-4 h-4" />;
}

/**
 * การ์ดพื้นที่สำรองสำหรับโมดูล/ตัวชี้วัดใหม่ในอนาคต
 * - รองรับทั้งโหมด Planned (ยังไม่เชื่อม API) และ Connected (ส่ง value มาแสดงผลจริง)
 */
export function FutureSlotCard({ slot, lang }: FutureSlotCardProps) {
    const title = lang === 'th' ? slot.titleTh : slot.titleEn;
    const description = lang === 'th' ? slot.descriptionTh : slot.descriptionEn;
    const isConnected = slot.status === 'connected';

    const cardInner = (
        <Card
            className={`h-full rounded-2xl transition-all ${
                isConnected
                    ? 'border border-blue-200 dark:border-blue-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md'
                    : 'border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900/50 hover:border-blue-400 dark:hover:border-blue-600'
            }`}
        >
            <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
                <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
                            {renderSlotIcon(slot.id)}
                        </div>

                        <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                isConnected
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                    : 'bg-zinc-200/70 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}
                        >
                            <PlugZap className="w-3 h-3 shrink-0" />
                            {isConnected
                                ? lang === 'th'
                                    ? 'เชื่อมต่อแล้ว'
                                    : 'Connected'
                                : lang === 'th'
                                  ? 'ช่องข้อมูลอนาคต'
                                  : 'Future Slot'}
                        </span>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {title}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="pt-2.5 border-t border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs">
                    {isConnected && slot.value !== undefined ? (
                        <span className="font-bold text-base text-zinc-900 dark:text-zinc-100 tabular-nums">
                            {slot.value}{' '}
                            <span className="text-xs font-normal text-zinc-500">
                                {lang === 'th' ? slot.metricLabelTh : slot.metricLabelEn}
                            </span>
                        </span>
                    ) : (
                        <span className="font-mono text-[11px] text-zinc-400 truncate">
                            {slot.plannedEndpoint || 'API Ready'}
                        </span>
                    )}

                    {slot.href && (
                        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium shrink-0">
                            {lang === 'th' ? 'เปิดหน้า' : 'Open'}
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    if (slot.href) {
        return (
            <Link href={slot.href} className="block h-full">
                {cardInner}
            </Link>
        );
    }

    return cardInner;
}
