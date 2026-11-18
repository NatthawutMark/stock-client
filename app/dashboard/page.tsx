'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { BarChartCard, FutureSlotCard, PieChartCard } from '@/components/dashboard';
import { Button, Card, CardContent, DocStatusBadge } from '@/components/ui';
import { useI18n, useLayout } from '../providers';
import { inventoryService } from '@/app/_services/inventory';
import { transactionService } from '@/app/_services/transaction';
import { masterService } from '@/app/_services/master';
import { ServiceSystem } from '@/app/_services/ServiceSystem';
import { extractList, extractTotal } from '@/lib/utils';
import {
    FUTURE_DASHBOARD_SLOTS,
    ISSUE_MENU_ID,
    RECEIVE_MENU_ID,
    buildDocStatusBreakdown,
    buildMonthlyReceiveIssueSeries,
    buildStockAlertWatchlist,
    buildTopStockItems,
    buildWarehouseStockBreakdown,
    normalizeInventoryItems,
    normalizeTransactionDocs,
    summarizeCompanyKpis,
} from '@/lib/dashboard';
import type {
    DocIssue,
    DocReceive,
    InventoryView,
    MastCustomer,
    MastEmployee,
    MastItem,
    MastLocation,
    MastVendor,
    MastWarehouse,
} from '@/lib/types';
import {
    AlertTriangle,
    ArrowDownToLine,
    ArrowRight,
    ArrowUpFromLine,
    Building2,
    Clock,
    Eye,
    EyeOff,
    FileText,
    Package,
    RefreshCw,
    Users,
    Wallet,
    Warehouse,
} from 'lucide-react';

interface RawDashboardPayload {
    inventoryList: InventoryView[];
    receiveDocs: DocReceive[];
    issueDocs: DocIssue[];
    receiveTotalCount?: number;
    issueTotalCount?: number;
    items: MastItem[];
    warehouses: MastWarehouse[];
    locations: MastLocation[];
    vendors: MastVendor[];
    customers: MastCustomer[];
    employees: MastEmployee[];
}

const EMPTY_PAYLOAD: RawDashboardPayload = {
    inventoryList: [],
    receiveDocs: [],
    issueDocs: [],
    items: [],
    warehouses: [],
    locations: [],
    vendors: [],
    customers: [],
    employees: [],
};

function MetricModeToggle({
    value,
    onChange,
    qtyLabel,
    valueLabel,
}: {
    value: 'qty' | 'value';
    onChange: (next: 'qty' | 'value') => void;
    qtyLabel: string;
    valueLabel: string;
}) {
    return (
        <div className="inline-flex rounded-xl border border-zinc-200 dark:border-zinc-700 p-0.5 bg-zinc-50 dark:bg-zinc-800/60 text-xs">
            {(
                [
                    { id: 'qty', label: qtyLabel },
                    { id: 'value', label: valueLabel },
                ] as const
            ).map((opt) => (
                <button
                    key={opt.id}
                    type="button"
                    data-compact="true"
                    onClick={() => onChange(opt.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        value === opt.id
                            ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

async function fetchCompanyDashboardPayload(): Promise<RawDashboardPayload> {
    const [invRes, recRes, issRes, itemRes, whRes, locRes, vendRes, custRes, empRes] =
        await Promise.allSettled([
            inventoryService.listAll({}),
            transactionService.docTrans.list({
                menuId: RECEIVE_MENU_ID,
                page: 1,
                size: 500,
                limit: 500,
            }),
            transactionService.docTrans.list({
                menuId: ISSUE_MENU_ID,
                page: 1,
                size: 500,
                limit: 500,
            }),
            masterService.items.list(),
            masterService.warehouses.list(),
            masterService.locations.list(),
            masterService.vendors.list(),
            masterService.customers.list(),
            masterService.employees.list(),
        ]);

    const getFulfilled = <T,>(result: PromiseSettledResult<T>): T | null =>
        result.status === 'fulfilled' ? result.value : null;

    const recVal = getFulfilled(recRes);
    const issVal = getFulfilled(issRes);

    return {
        inventoryList: extractList<InventoryView>(getFulfilled(invRes)),
        receiveDocs: extractList<DocReceive>(recVal),
        issueDocs: extractList<DocIssue>(issVal),
        receiveTotalCount: extractTotal(recVal),
        issueTotalCount: extractTotal(issVal),
        items: extractList<MastItem>(getFulfilled(itemRes)),
        warehouses: extractList<MastWarehouse>(getFulfilled(whRes)),
        locations: extractList<MastLocation>(getFulfilled(locRes)),
        vendors: extractList<MastVendor>(getFulfilled(vendRes)),
        customers: extractList<MastCustomer>(getFulfilled(custRes)),
        employees: extractList<MastEmployee>(getFulfilled(empRes)),
    };
}

export default function DashboardPage() {
    const { t, lang } = useI18n();
    const { setPageTitle } = useLayout();

    const [rawPayload, setRawPayload] = useState<RawDashboardPayload>(EMPTY_PAYLOAD);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // ตัวควบคุมมุมมองกราฟและพื้นที่อนาคต
    const [monthsRange, setMonthsRange] = useState<3 | 6 | 12>(6);
    const [warehouseMetric, setWarehouseMetric] = useState<'value' | 'qty'>('qty');
    const [topItemsMetric, setTopItemsMetric] = useState<'qty' | 'value'>('qty');
    const [showFutureSlots, setShowFutureSlots] = useState(true);

    useEffect(() => {
        setPageTitle(t.dashboard.title);
    }, [setPageTitle, t.dashboard.title]);

    useEffect(() => {
        let cancelled = false;

        fetchCompanyDashboardPayload()
            .then((payload) => {
                if (!cancelled) {
                    setRawPayload(payload);
                    setLastUpdated(new Date());
                }
            })
            .catch((error) => {
                console.error('Failed to load company dashboard:', error);
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const handleRefresh = useCallback(async () => {
        setLoading(true);
        try {
            const payload = await fetchCompanyDashboardPayload();
            setRawPayload(payload);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to refresh company dashboard:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const normalizedInventory = useMemo(
        () =>
            normalizeInventoryItems(
                rawPayload.inventoryList,
                rawPayload.items,
                rawPayload.warehouses,
                lang
            ),
        [rawPayload.inventoryList, rawPayload.items, rawPayload.warehouses, lang]
    );

    const normalizedDocs = useMemo(
        () =>
            normalizeTransactionDocs(
                rawPayload.receiveDocs,
                rawPayload.issueDocs,
                rawPayload.warehouses
            ),
        [rawPayload.receiveDocs, rawPayload.issueDocs, rawPayload.warehouses]
    );

    const receiveDocsOnly = useMemo(
        () => normalizedDocs.filter((d) => d.flow === 'receive'),
        [normalizedDocs]
    );
    const issueDocsOnly = useMemo(
        () => normalizedDocs.filter((d) => d.flow === 'issue'),
        [normalizedDocs]
    );

    const kpis = useMemo(
        () =>
            summarizeCompanyKpis({
                inventory: normalizedInventory,
                receiveDocs: receiveDocsOnly,
                issueDocs: issueDocsOnly,
                receiveTotalCount: rawPayload.receiveTotalCount,
                issueTotalCount: rawPayload.issueTotalCount,
                items: rawPayload.items,
                warehouses: rawPayload.warehouses,
                locations: rawPayload.locations,
                vendors: rawPayload.vendors,
                customers: rawPayload.customers,
                employees: rawPayload.employees,
            }),
        [
            normalizedInventory,
            receiveDocsOnly,
            issueDocsOnly,
            rawPayload.receiveTotalCount,
            rawPayload.issueTotalCount,
            rawPayload.items,
            rawPayload.warehouses,
            rawPayload.locations,
            rawPayload.vendors,
            rawPayload.customers,
            rawPayload.employees,
        ]
    );

    const monthlyFlowData = useMemo(
        () => buildMonthlyReceiveIssueSeries(normalizedDocs, monthsRange, lang),
        [normalizedDocs, monthsRange, lang]
    );

    const warehousePieData = useMemo(
        () => buildWarehouseStockBreakdown(normalizedInventory, warehouseMetric),
        [normalizedInventory, warehouseMetric]
    );

    const docStatusPieData = useMemo(
        () => buildDocStatusBreakdown(normalizedDocs, lang),
        [normalizedDocs, lang]
    );

    const topItemsData = useMemo(
        () => buildTopStockItems(normalizedInventory, topItemsMetric, 5),
        [normalizedInventory, topItemsMetric]
    );

    const recentDocs = useMemo(
        () => [...normalizedDocs].sort((a, b) => b.docDateSort - a.docDateSort).slice(0, 6),
        [normalizedDocs]
    );

    const watchlistItems = useMemo(
        () => buildStockAlertWatchlist(normalizedInventory, 6),
        [normalizedInventory]
    );

    const formatCurrency = (val: number) =>
        `${val.toLocaleString('th-TH', { maximumFractionDigits: 0 })} ${lang === 'th' ? 'ชิ้น' : 'pcs'}`;
    const formatQty = (val: number) =>
        `${val.toLocaleString('th-TH')} ฿`;

    const lastUpdatedText = lastUpdated
        ? lastUpdated.toLocaleTimeString(lang === 'th' ? 'th-TH' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
          })
        : '-';

    return (
        <AppLayout>
            {/* Header & Quick Controls */}
            <div className="mb-5 sm:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {t.dashboard.title}
                    </h1>
                    <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {t.dashboard.companySubtitle}
                        {lastUpdated && (
                            <span className="ml-2 text-xs text-zinc-400">
                                • {lang === 'th' ? 'อัปเดตล่าสุด' : 'Updated'} {lastUpdatedText}
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
                    {/* ตัวเลือกช่วงเวลากราฟ */}
                    <div className="inline-flex rounded-xl border border-zinc-200 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-900">
                        {([3, 6, 12] as const).map((m) => (
                            <button
                                key={m}
                                type="button"
                                data-compact="true"
                                onClick={() => setMonthsRange(m)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                    monthsRange === m
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                            >
                                {m} {lang === 'th' ? 'เดือน' : 'M'}
                            </button>
                        ))}
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex-1 sm:flex-none justify-center rounded-xl px-4 py-2 text-xs sm:text-sm gap-2 border-zinc-200 dark:border-zinc-700 cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t.dashboard.refresh}
                    </Button>
                </div>
            </div>

            {/* Row 1: Core Company KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4 sm:mb-6">
                {/* 1. คงเหลือรวม */}
                <Link href="/inventory" className="group block">
                    <Card className="h-full border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                        <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                <Package className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                                    {t.dashboard.totalStock}
                                </p>
                                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 tabular-nums">
                                    {loading ? '...' : kpis.totalStockQty.toLocaleString('th-TH')}
                                    <span className="text-xs font-normal text-zinc-500 ml-1">
                                        {lang === 'th' ? 'ชิ้น' : 'pcs'}
                                    </span>
                                </p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                                    {kpis.totalStockRecords.toLocaleString('th-TH')}{' '}
                                    {lang === 'th' ? 'รายการสต็อกในคลัง' : 'stock lots'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* 2. มูลค่าคงคลังรวม */}
                <Link href="/inventory" className="group block">
                    <Card className="h-full border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors">
                        <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                                    {t.dashboard.totalValue}
                                </p>
                                <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums truncate">
                                    {loading ? '...' : formatCurrency(kpis.totalStockValue)}
                                </p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                                    {lang === 'th'
                                        ? `กระจายใน ${kpis.masterCounts.warehouses} คลังสินค้า`
                                        : `Across ${kpis.masterCounts.warehouses} warehouses`}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* 3. เอกสารรับสินค้าเข้า (GR) */}
                <Link href="/transaction/receive" className="group block">
                    <Card className="h-full border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
                        <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                <ArrowDownToLine className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                                    {t.dashboard.receiveDocs}
                                </p>
                                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 tabular-nums">
                                    {loading ? '...' : kpis.receiveTotal.toLocaleString('th-TH')}
                                    <span className="text-xs font-normal text-zinc-500 ml-1">
                                        {lang === 'th' ? 'เอกสาร' : 'docs'}
                                    </span>
                                </p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                                    {lang === 'th'
                                        ? `เสร็จ ${kpis.receiveCompleted} • รอทำ ${kpis.receivePending}`
                                        : `Done ${kpis.receiveCompleted} • Pending ${kpis.receivePending}`}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* 4. เอกสารจ่ายสินค้าออก (GI) */}
                <Link href="/transaction/issue" className="group block">
                    <Card className="h-full border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm hover:border-orange-400 dark:hover:border-orange-600 transition-colors">
                        <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                                <ArrowUpFromLine className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                                    {t.dashboard.issueDocs}
                                </p>
                                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 tabular-nums">
                                    {loading ? '...' : kpis.issueTotal.toLocaleString('th-TH')}
                                    <span className="text-xs font-normal text-zinc-500 ml-1">
                                        {lang === 'th' ? 'เอกสาร' : 'docs'}
                                    </span>
                                </p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                                    {lang === 'th'
                                        ? `เสร็จ ${kpis.issueCompleted} • รอทำ ${kpis.issuePending}`
                                        : `Done ${kpis.issueCompleted} • Pending ${kpis.issuePending}`}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Row 2: Secondary Alerts & Company Structure Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <Card className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {lang === 'th' ? 'แจ้งเตือนสต็อก' : 'Stock Alerts'}
                            </p>
                            <p className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">
                                {loading
                                    ? '...'
                                    : `${kpis.lowStockCount + kpis.outOfStockCount} ${lang === 'th' ? 'รายการ' : 'alerts'}`}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                {lang === 'th'
                                    ? `หมด ${kpis.outOfStockCount} • ใกล้หมด ${kpis.lowStockCount} • ใกล้หมดอายุ ${kpis.expiringSoonCount}`
                                    : `Out ${kpis.outOfStockCount} • Low ${kpis.lowStockCount} • Exp ${kpis.expiringSoonCount}`}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Link href="/transaction" className="block">
                    <Card className="h-full border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-xs hover:border-purple-400 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {t.dashboard.pendingDocs}
                                </p>
                                <p className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5 tabular-nums">
                                    {loading
                                        ? '...'
                                        : `${kpis.totalPendingDocs} ${lang === 'th' ? 'ฉบับ' : 'docs'}`}
                                </p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {lang === 'th'
                                        ? 'ฉบับร่าง / บันทึกแล้ว / รอดำเนินการ'
                                        : 'Draft / Saved / In Progress'}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <Clock className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/master/warehouses" className="block">
                    <Card className="h-full border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-xs hover:border-teal-400 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {lang === 'th' ? 'คลังสินค้า & ตำแหน่งจัดเก็บ' : 'Warehouses & Locations'}
                                </p>
                                <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 tabular-nums">
                                    {loading
                                        ? '...'
                                        : `${kpis.masterCounts.warehouses} / ${kpis.masterCounts.locations}`}
                                </p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {lang === 'th' ? 'คลัง / จุดจัดเก็บทั้งหมด' : 'Warehouses / Storage Bins'}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                                <Warehouse className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/master" className="block">
                    <Card className="h-full border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-xs hover:border-cyan-400 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {lang === 'th' ? 'สินค้า • คู่ค้า • พนักงาน' : 'Catalog • Partners • Staff'}
                                </p>
                                <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 tabular-nums">
                                    {loading
                                        ? '...'
                                        : `${kpis.masterCounts.items} SKU`}
                                </p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                    {lang === 'th'
                                        ? `ผู้ขาย ${kpis.masterCounts.vendors} • ลูกค้า ${kpis.masterCounts.customers} • พนักงาน ${kpis.masterCounts.employees}`
                                        : `V ${kpis.masterCounts.vendors} • C ${kpis.masterCounts.customers} • Staff ${kpis.masterCounts.employees}`}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                                <Users className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Row 3: Main Bar Chart (GR vs GI) + Pie Chart (Warehouse Stock) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 mb-6">
                <div className="xl:col-span-7">
                    <BarChartCard
                        title={t.dashboard.monthlyFlowTitle}
                        subtitle={
                            lang === 'th'
                                ? `จำนวนเอกสารรับสินค้าเข้า (GR) เทียบกับจ่ายสินค้าออก (GI) ย้อนหลัง ${monthsRange} เดือน`
                                : `Monthly Goods Receipt (GR) vs Goods Issue (GI) over the past ${monthsRange} months`
                        }
                        mode="grouped"
                        series={[
                            {
                                key: 'receive',
                                label: lang === 'th' ? 'รับเข้า (GR)' : 'Receive (GR)',
                                color: '#2563eb',
                            },
                            {
                                key: 'issue',
                                label: lang === 'th' ? 'จ่ายออก (GI)' : 'Issue (GI)',
                                color: '#f97316',
                            },
                        ]}
                        groupedData={monthlyFlowData}
                        loading={loading}
                        unitLabel={lang === 'th' ? 'ใบ' : 'docs'}
                        emptyText={t.common.noData}
                    />
                </div>

                <div className="xl:col-span-5">
                    <PieChartCard
                        title={t.dashboard.stockByWarehouse}
                        subtitle={
                            warehouseMetric === 'value'
                                ? lang === 'th'
                                    ? 'สัดส่วนมูลค่าสินค้าคงคลังตามคลังสินค้า'
                                    : 'Inventory value share by warehouse'
                                : lang === 'th'
                                  ? 'สัดส่วนปริมาณคงเหลือตามคลังสินค้า'
                                  : 'Inventory quantity share by warehouse'
                        }
                        data={warehousePieData}
                        centerLabel={
                            warehouseMetric === 'value'
                                ? lang === 'th'
                                    ? 'มูลค่ารวม'
                                    : 'Total Value'
                                : lang === 'th'
                                  ? 'คงเหลือรวม'
                                  : 'Total Qty'
                        }
                        formatValue={warehouseMetric === 'value' ? formatQty :  formatCurrency}
                        loading={loading}
                        emptyText={t.common.noData}
                        headerAction={
                            <MetricModeToggle
                                value={warehouseMetric}
                                onChange={setWarehouseMetric}
                                qtyLabel={lang === 'th' ? 'จำนวน' : 'Qty'}
                                valueLabel={lang === 'th' ? 'มูลค่า (฿)' : 'Value'}
                            />
                        }
                    />
                </div>
            </div>

            {/* Row 4: Secondary Charts (Doc Status Pie + Top 5 Stock Horizontal Bar) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
                <PieChartCard
                    title={t.dashboard.docStatusTitle}
                    subtitle={
                        lang === 'th'
                            ? 'สัดส่วนสถานะเอกสารรับเข้าและจ่ายออกทั้งหมด'
                            : 'Status distribution across all GR & GI documents'
                    }
                    data={docStatusPieData}
                    centerLabel={lang === 'th' ? 'เอกสารรวม' : 'Total Docs'}
                    formatValue={(val) =>
                        `${val.toLocaleString('th-TH')} ${lang === 'th' ? 'ฉบับ' : 'docs'}`
                    }
                    loading={loading}
                    emptyText={t.common.noData}
                />

                <BarChartCard
                    title={t.dashboard.topStockTitle}
                    subtitle={
                        topItemsMetric === 'qty'
                            ? lang === 'th'
                                ? 'จัดอันดับสินค้าที่มีจำนวนคงเหลือสูงที่สุด'
                                : 'Highest inventory items by quantity'
                            : lang === 'th'
                              ? 'จัดอันดับสินค้าที่มีมูลค่าคงคลังสูงที่สุด'
                              : 'Highest inventory items by stock value'
                    }
                    mode="horizontal"
                    horizontalData={topItemsData}
                    loading={loading}
                    emptyText={t.common.noData}
                    headerAction={
                        <MetricModeToggle
                            value={topItemsMetric}
                            onChange={setTopItemsMetric}
                            qtyLabel={lang === 'th' ? 'จำนวน' : 'Qty'}
                            valueLabel={lang === 'th' ? 'มูลค่า (฿)' : 'Value'}
                        />
                    }
                />
            </div>

            {/* Row 5: Recent Activity & Stock Alert Watchlist */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
                {/* Recent Transactions */}
                <Card className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                {t.dashboard.recentActivity}
                            </h3>
                            <Link
                                href="/transaction"
                                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 shrink-0"
                            >
                                {lang === 'th' ? 'ดูทั้งหมด' : 'View all'}
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {loading ? (
                            <div className="py-12 flex justify-center">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : recentDocs.length === 0 ? (
                            <p className="text-sm text-zinc-400 py-8 text-center">{t.common.noData}</p>
                        ) : (
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {recentDocs.map((doc) => {
                                    const flowBadge =
                                        doc.flow === 'receive' ? (
                                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                                GR
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                                                GI
                                            </span>
                                        );

                                    const rowContent = (
                                        <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 -mx-2 px-2 rounded-xl transition-colors">
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {flowBadge}
                                                    <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                        {doc.docNo}
                                                    </span>
                                                    <span className="text-xs text-zinc-400">
                                                        {doc.docDateRaw
                                                            ? ServiceSystem.formatThaiDate(doc.docDateRaw)
                                                            : '-'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                                    <Building2 className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                                                    <span className="truncate">{doc.warehouseName}</span>
                                                    {doc.partnerName !== '-' && (
                                                        <span className="truncate">• {doc.partnerName}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                <DocStatusBadge status={doc.statusCode} />
                                            </div>
                                        </div>
                                    );

                                    return doc.href ? (
                                        <Link key={`${doc.flow}-${doc.id}`} href={doc.href} className="block">
                                            {rowContent}
                                        </Link>
                                    ) : (
                                        <div key={`${doc.flow}-${doc.docNo}`}>{rowContent}</div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Stock Alert Watchlist */}
                <Card className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                <span className="truncate">{t.dashboard.watchlistTitle}</span>
                            </h3>
                            <Link
                                href="/inventory"
                                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 shrink-0"
                            >
                                {lang === 'th' ? 'จัดการสต็อก' : 'Inventory'}
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {loading ? (
                            <div className="py-12 flex justify-center">
                                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : watchlistItems.length === 0 ? (
                            <p className="text-sm text-zinc-400 py-8 text-center">
                                {lang === 'th'
                                    ? 'ไม่มีสินค้าใกล้หมดหรือใกล้หมดอายุในขณะนี้'
                                    : 'All inventory levels look healthy'}
                            </p>
                        ) : (
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {watchlistItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400">
                                                    {item.itemCode}
                                                </span>
                                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                                    {item.itemName}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                                                {item.warehouseName} •{' '}
                                                {lang === 'th'
                                                    ? `ขั้นต่ำ ${item.minAlert.toLocaleString('th-TH')}`
                                                    : `Min ${item.minAlert.toLocaleString('th-TH')}`}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                                                {item.qty.toLocaleString('th-TH')}
                                            </span>
                                            {item.reason === 'out' && (
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                                                    {lang === 'th' ? 'หมดสต็อก' : 'Out of Stock'}
                                                </span>
                                            )}
                                            {item.reason === 'low' && (
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                                                    {lang === 'th' ? 'ใกล้หมด' : 'Low Stock'}
                                                </span>
                                            )}
                                            {item.reason === 'expiring' && (
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                                                    {item.daysToExpire !== null && item.daysToExpire <= 0
                                                        ? lang === 'th'
                                                            ? 'หมดอายุแล้ว'
                                                            : 'Expired'
                                                        : lang === 'th'
                                                          ? `หมดอายุใน ${item.daysToExpire} วัน`
                                                          : `Exp in ${item.daysToExpire}d`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Row 6: Future Business & Module Slots */}
            <section aria-label={t.dashboard.futureSlotsTitle} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {t.dashboard.futureSlotsTitle}
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {lang === 'th'
                                ? 'พื้นที่สำหรับเสียบข้อมูลหรือ API โมดูลใหม่ในอนาคต (แก้ไขได้ที่ lib/dashboard.ts -> FUTURE_DASHBOARD_SLOTS)'
                                : 'Extensible slots ready for upcoming modules (configured via lib/dashboard.ts -> FUTURE_DASHBOARD_SLOTS)'}
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-compact="true"
                        onClick={() => setShowFutureSlots((prev) => !prev)}
                        className="self-start sm:self-auto rounded-xl text-xs gap-1.5 cursor-pointer"
                    >
                        {showFutureSlots ? (
                            <>
                                <EyeOff className="w-3.5 h-3.5" />
                                {lang === 'th' ? 'ซ่อนช่องอนาคต' : 'Hide Future Slots'}
                            </>
                        ) : (
                            <>
                                <Eye className="w-3.5 h-3.5" />
                                {lang === 'th' ? 'แสดงช่องอนาคต' : 'Show Future Slots'}
                            </>
                        )}
                    </Button>
                </div>

                {showFutureSlots && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {FUTURE_DASHBOARD_SLOTS.map((slot) => (
                            <FutureSlotCard key={slot.id} slot={slot} lang={lang} />
                        ))}
                    </div>
                )}
            </section>
        </AppLayout>
    );
}
