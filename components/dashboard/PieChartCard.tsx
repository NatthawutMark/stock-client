'use client';

import { useState, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui';
import type { PieSliceDatum } from '@/lib/dashboard';
import { PieChart } from 'lucide-react';

interface PieChartCardProps {
    title: string;
    subtitle?: string;
    data: PieSliceDatum[];
    centerLabel?: string;
    formatValue?: (val: number) => string;
    loading?: boolean;
    emptyText?: string;
    headerAction?: ReactNode;
}

/**
 * การ์ดกราฟวงกลม (Donut Pie Chart) แบบ SVG + Accessible Legend (<dl>)
 * - ใช้ strokeDasharray / strokeDashoffset เพื่อให้แสดงผลแม่นยำแม้มีเพียง 1 รายการ (100%)
 * - จับคู่กราฟกับคำอธิบาย <dl> เสมอเพื่อให้ Screen Reader และผู้ใช้มือถืออ่านค่าได้ทันที
 */
export function PieChartCard({
    title,
    subtitle,
    data,
    centerLabel = 'รวมทั้งหมด',
    formatValue = (val) => val.toLocaleString('th-TH'),
    loading = false,
    emptyText = 'ยังไม่มีข้อมูลสำหรับแสดงกราฟ',
    headerAction,
}: PieChartCardProps) {
    const [activeSliceId, setActiveSliceId] = useState<string | null>(null);

    const validSlices = data.filter((d) => d.value > 0);
    const total = validSlices.reduce((sum, slice) => sum + slice.value, 0);

    const activeSlice =
        validSlices.find((slice) => slice.id === activeSliceId) ?? null;

    const radius = 64;
    const circumference = 2 * Math.PI * radius;

    // คำนวณระยะ Dash Offset ของแต่ละ Segment ล่วงหน้า
    const segments = validSlices.reduce<
        Array<PieSliceDatum & { pct: number; dashLength: number; offset: number }>
    >((acc, slice) => {
        const previousLength =
            acc.length > 0
                ? Math.abs(acc[acc.length - 1].offset) + acc[acc.length - 1].dashLength
                : 0;
        const fraction = total > 0 ? slice.value / total : 0;
        const dashLength = fraction * circumference;
        acc.push({
            ...slice,
            pct: Math.round(fraction * 1000) / 10,
            dashLength,
            offset: -previousLength,
        });
        return acc;
    }, []);

    return (
        <Card className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm h-full flex flex-col">
            <CardContent className="p-4 sm:p-6 flex flex-col flex-1 gap-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">{title}</span>
                        </h3>
                        {subtitle && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>
                        )}
                    </div>
                    {headerAction && <div className="shrink-0">{headerAction}</div>}
                </div>

                {/* Body */}
                {loading ? (
                    <div className="flex-1 min-h-[200px] flex items-center justify-center">
                        <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : total <= 0 ? (
                    <div className="flex-1 min-h-[200px] flex items-center justify-center text-sm text-zinc-400">
                        {emptyText}
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 flex-1">
                        {/* SVG Donut Chart */}
                        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                            <svg
                                viewBox="0 0 180 180"
                                role="img"
                                aria-label={title}
                                className="w-full h-full -rotate-90"
                            >
                                <circle
                                    cx={90}
                                    cy={90}
                                    r={radius}
                                    fill="none"
                                    stroke="currentColor"
                                    className="text-zinc-100 dark:text-zinc-800"
                                    strokeWidth={24}
                                />
                                {segments.map((seg) => {
                                    const isActive = activeSliceId === seg.id;
                                    const isDimmed = activeSliceId !== null && !isActive;
                                    return (
                                        <circle
                                            key={seg.id}
                                            cx={90}
                                            cy={90}
                                            r={radius}
                                            fill="none"
                                            stroke={seg.color}
                                            strokeWidth={isActive ? 28 : 24}
                                            strokeDasharray={`${seg.dashLength} ${Math.max(
                                                0,
                                                circumference - seg.dashLength
                                            )}`}
                                            strokeDashoffset={seg.offset}
                                            opacity={isDimmed ? 0.35 : 1}
                                            tabIndex={0}
                                            role="button"
                                            aria-label={`${seg.label}: ${formatValue(seg.value)} (${seg.pct}%)`}
                                            onMouseEnter={() => setActiveSliceId(seg.id)}
                                            onMouseLeave={() => setActiveSliceId(null)}
                                            onFocus={() => setActiveSliceId(seg.id)}
                                            onBlur={() => setActiveSliceId(null)}
                                            onClick={() =>
                                                setActiveSliceId((prev) =>
                                                    prev === seg.id ? null : seg.id
                                                )
                                            }
                                            className="cursor-pointer transition-all duration-150 outline-none"
                                        />
                                    );
                                })}
                            </svg>

                            {/* Center Summary */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-7">
                                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-full">
                                    {activeSlice ? activeSlice.label : centerLabel}
                                </span>
                                <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums truncate max-w-full mt-0.5">
                                    {activeSlice ? formatValue(activeSlice.value) : formatValue(total)}
                                </span>
                                {activeSlice && (
                                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                                        {Math.round((activeSlice.value / total) * 1000) / 10}%
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Accessible Breakdown Legend */}
                        <dl className="w-full flex-1 space-y-2 min-w-0">
                            {segments.map((seg) => {
                                const isActive = activeSliceId === seg.id;
                                return (
                                    <div
                                        key={seg.id}
                                        onMouseEnter={() => setActiveSliceId(seg.id)}
                                        onMouseLeave={() => setActiveSliceId(null)}
                                        onClick={() =>
                                            setActiveSliceId((prev) =>
                                                prev === seg.id ? null : seg.id
                                            )
                                        }
                                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors ${
                                            isActive
                                                ? 'bg-zinc-100 dark:bg-zinc-800'
                                                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                                        }`}
                                    >
                                        <dt className="flex items-center gap-2 min-w-0 text-xs sm:text-sm">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: seg.color }}
                                            />
                                            <div className="min-w-0">
                                                <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate block">
                                                    {seg.label}
                                                </span>
                                                {seg.subLabel && (
                                                    <span className="text-[11px] text-zinc-400 block truncate">
                                                        {seg.subLabel}
                                                    </span>
                                                )}
                                            </div>
                                        </dt>
                                        <dd className="text-right shrink-0 tabular-nums">
                                            <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                                                {formatValue(seg.value)}
                                            </span>
                                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                                                {seg.pct}%
                                            </span>
                                        </dd>
                                    </div>
                                );
                            })}
                        </dl>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
