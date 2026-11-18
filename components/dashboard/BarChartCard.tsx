'use client';

import { useState, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui';
import type { GroupedBarDatum, HorizontalBarDatum } from '@/lib/dashboard';
import { BarChart3 } from 'lucide-react';

export interface BarSeriesConfig {
    key: string;
    label: string;
    color: string;
}

interface BarChartCardProps {
    title: string;
    subtitle?: string;
    mode?: 'grouped' | 'horizontal';
    series?: BarSeriesConfig[];
    groupedData?: GroupedBarDatum[];
    horizontalData?: HorizontalBarDatum[];
    loading?: boolean;
    emptyText?: string;
    headerAction?: ReactNode;
    unitLabel?: string;
}

function getNiceMaxScale(maxValue: number): number {
    if (maxValue <= 0) return 4;
    if (maxValue <= 4) return 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
    const normalized = maxValue / magnitude;
    if (normalized <= 1.2) return Math.ceil(1.2 * magnitude);
    if (normalized <= 2) return 2 * magnitude;
    if (normalized <= 5) return 5 * magnitude;
    return 10 * magnitude;
}

/**
 * การ์ดกราฟแท่งแบบ Interactive (SVG + Responsive Layout)
 * - mode="grouped": เปรียบเทียบหลายชุดข้อมูลตามแกนเวลา (เช่น รับเข้า vs จ่ายออก รายเดือน)
 * - mode="horizontal": จัดอันดับ Top Items แนวนอนที่อ่านชื่อภาษาไทยยาวๆ บนมือถือได้ชัดเจน
 */
export function BarChartCard({
    title,
    subtitle,
    mode = 'grouped',
    series = [],
    groupedData = [],
    horizontalData = [],
    loading = false,
    emptyText = 'ยังไม่มีข้อมูลสำหรับแสดงกราฟ',
    headerAction,
    unitLabel = '',
}: BarChartCardProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const hasGroupedValues =
        groupedData.length > 0 &&
        groupedData.some((d) => series.some((s) => (d.values[s.key] || 0) > 0));

    const maxGroupedVal = groupedData.reduce((acc, item) => {
        const itemMax = series.reduce((m, s) => Math.max(m, item.values[s.key] || 0), 0);
        return Math.max(acc, itemMax);
    }, 0);
    const scaleMax = getNiceMaxScale(maxGroupedVal);

    const maxHorizontalVal = horizontalData.reduce((m, d) => Math.max(m, d.value), 0);

    // พิกัดพื้นที่วาด SVG สำหรับ Grouped Bar Chart
    const svgWidth = 640;
    const svgHeight = 230;
    const padLeft = 40;
    const padRight = 16;
    const padTop = 16;
    const padBottom = 34;
    const chartWidth = svgWidth - padLeft - padRight;
    const chartHeight = svgHeight - padTop - padBottom;

    const activeGroup = activeIndex !== null ? groupedData[activeIndex] : null;

    return (
        <Card className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm h-full flex flex-col">
            <CardContent className="p-4 sm:p-6 flex flex-col flex-1 gap-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="truncate">{title}</span>
                        </h3>
                        {subtitle && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>
                        )}
                    </div>
                    {headerAction && <div className="shrink-0">{headerAction}</div>}
                </div>

                {/* Legend (Grouped Mode) */}
                {mode === 'grouped' && series.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-4">
                            {series.map((s) => (
                                <span
                                    key={s.key}
                                    className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium"
                                >
                                    <span
                                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                                        style={{ backgroundColor: s.color }}
                                    />
                                    {s.label}
                                </span>
                            ))}
                        </div>

                        {activeGroup && (
                            <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-medium tabular-nums">
                                <span className="font-semibold mr-2">{activeGroup.label}:</span>
                                {series
                                    .map(
                                        (s) =>
                                            `${s.label} ${(activeGroup.values[s.key] || 0).toLocaleString('th-TH')}${unitLabel ? ` ${unitLabel}` : ''}`
                                    )
                                    .join(' • ')}
                            </div>
                        )}
                    </div>
                )}

                {/* Chart Body */}
                {loading ? (
                    <div className="flex-1 min-h-[200px] flex items-center justify-center">
                        <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : mode === 'grouped' ? (
                    !hasGroupedValues && groupedData.length === 0 ? (
                        <div className="flex-1 min-h-[200px] flex items-center justify-center text-sm text-zinc-400">
                            {emptyText}
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto overscroll-x-contain">
                            <svg
                                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                                role="img"
                                aria-label={title}
                                className="w-full min-w-[340px] h-52 sm:h-60 select-none"
                            >
                                {/* เส้นตารางแนวนอนและค่าแกน Y */}
                                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                                    const y = padTop + chartHeight * (1 - ratio);
                                    const tickVal = Math.round(scaleMax * ratio);
                                    return (
                                        <g key={ratio}>
                                            <line
                                                x1={padLeft}
                                                y1={y}
                                                x2={svgWidth - padRight}
                                                y2={y}
                                                stroke="currentColor"
                                                className="text-zinc-200 dark:text-zinc-800"
                                                strokeDasharray={ratio === 0 ? undefined : '4 4'}
                                                strokeWidth={1}
                                            />
                                            <text
                                                x={padLeft - 8}
                                                y={y + 4}
                                                textAnchor="end"
                                                className="fill-zinc-400 dark:fill-zinc-500 text-[10px] tabular-nums"
                                            >
                                                {tickVal.toLocaleString('th-TH')}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* กลุ่มแท่งกราฟในแต่ละเดือน */}
                                {groupedData.map((datum, idx) => {
                                    const groupWidth = chartWidth / Math.max(1, groupedData.length);
                                    const groupStartX = padLeft + idx * groupWidth;
                                    const barCount = Math.max(1, series.length);
                                    const maxGroupBarsWidth = Math.min(groupWidth * 0.68, 56);
                                    const barGap = 4;
                                    const barWidth = Math.max(
                                        8,
                                        (maxGroupBarsWidth - barGap * (barCount - 1)) / barCount
                                    );
                                    const totalBarsWidth =
                                        barWidth * barCount + barGap * (barCount - 1);
                                    const barsStartX =
                                        groupStartX + (groupWidth - totalBarsWidth) / 2;
                                    const isActive = activeIndex === idx;

                                    return (
                                        <g
                                            key={datum.key}
                                            tabIndex={0}
                                            role="group"
                                            aria-label={`${datum.label}: ${series
                                                .map((s) => `${s.label} ${datum.values[s.key] || 0}`)
                                                .join(', ')}`}
                                            onMouseEnter={() => setActiveIndex(idx)}
                                            onMouseLeave={() => setActiveIndex(null)}
                                            onFocus={() => setActiveIndex(idx)}
                                            onBlur={() => setActiveIndex(null)}
                                            onClick={() =>
                                                setActiveIndex((prev) => (prev === idx ? null : idx))
                                            }
                                            className="cursor-pointer outline-none"
                                        >
                                            <rect
                                                x={groupStartX + 2}
                                                y={padTop}
                                                width={Math.max(0, groupWidth - 4)}
                                                height={chartHeight}
                                                rx={6}
                                                className={
                                                    isActive
                                                        ? 'fill-zinc-100/80 dark:fill-zinc-800/70'
                                                        : 'fill-transparent'
                                                }
                                            />

                                            {series.map((s, sIdx) => {
                                                const val = datum.values[s.key] || 0;
                                                const barHeight =
                                                    val > 0
                                                        ? Math.max(3, (val / scaleMax) * chartHeight)
                                                        : 0;
                                                const x = barsStartX + sIdx * (barWidth + barGap);
                                                const y = padTop + chartHeight - barHeight;

                                                return (
                                                    <g key={s.key}>
                                                        <rect
                                                            x={x}
                                                            y={y}
                                                            width={barWidth}
                                                            height={barHeight}
                                                            rx={4}
                                                            fill={s.color}
                                                            opacity={
                                                                activeIndex === null || isActive
                                                                    ? 1
                                                                    : 0.45
                                                            }
                                                            className="transition-opacity duration-150"
                                                        />
                                                        {val > 0 && (isActive || groupedData.length <= 6) && (
                                                            <text
                                                                x={x + barWidth / 2}
                                                                y={Math.max(11, y - 4)}
                                                                textAnchor="middle"
                                                                className="fill-zinc-600 dark:fill-zinc-300 text-[10px] font-semibold tabular-nums"
                                                            >
                                                                {val}
                                                            </text>
                                                        )}
                                                    </g>
                                                );
                                            })}

                                            <text
                                                x={groupStartX + groupWidth / 2}
                                                y={svgHeight - 10}
                                                textAnchor="middle"
                                                className={`text-[11px] font-medium ${
                                                    isActive
                                                        ? 'fill-blue-600 dark:fill-blue-400 font-semibold'
                                                        : 'fill-zinc-500 dark:fill-zinc-400'
                                                }`}
                                            >
                                                {datum.label}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                            {!hasGroupedValues && (
                                <p className="text-center text-xs text-zinc-400 mt-1">
                                    {emptyText}
                                </p>
                            )}
                        </div>
                    )
                ) : horizontalData.length === 0 ? (
                    <div className="flex-1 min-h-[200px] flex items-center justify-center text-sm text-zinc-400">
                        {emptyText}
                    </div>
                ) : (
                    <ul className="space-y-3.5 flex-1 justify-center flex flex-col">
                        {horizontalData.map((row, idx) => {
                            const pct =
                                maxHorizontalVal > 0
                                    ? Math.max(4, Math.round((row.value / maxHorizontalVal) * 100))
                                    : 0;
                            const barColor = row.color || '#2563eb';
                            return (
                                <li key={row.id} className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 shrink-0">
                                                {idx + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate block">
                                                    {row.label}
                                                </span>
                                                {row.subLabel && (
                                                    <span className="text-[11px] font-mono text-zinc-400 block truncate">
                                                        {row.subLabel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 shrink-0 tabular-nums">
                                            {row.formattedValue}
                                        </span>
                                    </div>
                                    <div
                                        className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden"
                                        aria-hidden="true"
                                    >
                                        <div
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{
                                                width: `${pct}%`,
                                                backgroundColor: barColor,
                                            }}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
