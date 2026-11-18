import { getStatusCategory, type StatusCategory } from '@/components/transaction/DocStatusBadge';
import { getField } from '@/lib/utils';
import type { Lang } from '@/lib/i18n/translations';
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

export const RECEIVE_MENU_ID = '00E03A994280450ABF7E2EE62A7AD4D6';
export const ISSUE_MENU_ID = '85D356B7877647C49B61B71FB047E0B6';

export const CHART_PALETTE = [
    '#2563eb', // blue-600
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#f43f5e', // rose-500
    '#64748b', // slate-500
] as const;

export interface GroupedBarDatum {
    key: string;
    label: string;
    values: Record<string, number>;
}

export interface HorizontalBarDatum {
    id: string;
    label: string;
    subLabel?: string;
    value: number;
    formattedValue: string;
    color?: string;
}

export interface PieSliceDatum {
    id: string;
    label: string;
    value: number;
    color: string;
    subLabel?: string;
}

export interface NormalizedInventoryItem {
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    warehouseId: string;
    warehouseName: string;
    qty: number;
    price: number;
    value: number;
    minAlert: number;
    lotNo: string;
    expireDate: string;
    daysToExpire: number | null;
}

export interface NormalizedDashboardDoc {
    id: string;
    flow: 'receive' | 'issue';
    docNo: string;
    docDateRaw: string;
    docDateSort: number;
    statusCode: string;
    statusCategory: StatusCategory;
    warehouseName: string;
    partnerName: string;
    href: string | null;
}

export interface CompanyKpiSummary {
    totalStockQty: number;
    totalStockValue: number;
    totalStockRecords: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringSoonCount: number;
    receiveTotal: number;
    receiveCompleted: number;
    receivePending: number;
    issueTotal: number;
    issueCompleted: number;
    issuePending: number;
    totalPendingDocs: number;
    masterCounts: {
        items: number;
        warehouses: number;
        locations: number;
        vendors: number;
        customers: number;
        employees: number;
    };
}

export interface FutureSlotConfig {
    id: string;
    titleTh: string;
    titleEn: string;
    descriptionTh: string;
    descriptionEn: string;
    category: 'inventory' | 'transaction' | 'analytics' | 'custom';
    status: 'planned' | 'connected';
    href?: string;
    metricLabelTh?: string;
    metricLabelEn?: string;
    value?: string | number;
    plannedEndpoint?: string;
}

/**
 * ช่องข้อมูลสำหรับโมดูลและตัวชี้วัดธุรกิจในอนาคต (Future Dashboard Extension Slots)
 * - หากพัฒนาหน้าหรือ API ใหม่เสร็จแล้ว สามารถเปลี่ยน status เป็น 'connected' และส่ง value มาแสดงผลได้ทันที
 */
export const FUTURE_DASHBOARD_SLOTS: FutureSlotConfig[] = [
    {
        id: 'damaged-inventory',
        titleTh: 'คลังสินค้าชำรุด / เสียหาย',
        titleEn: 'Damaged Inventory',
        descriptionTh: 'สรุปยอดและมูลค่าสินค้าชำรุด รอซ่อม หรือรอคัดแยกออกจากคลังหลัก',
        descriptionEn: 'Track damaged items awaiting repair, quarantine, or write-off.',
        category: 'inventory',
        status: 'planned',
        href: '/inventorydmg',
        plannedEndpoint: '/api/inventorydmg/summary',
    },
    {
        id: 'warehouse-transfers',
        titleTh: 'โอนย้ายสินค้าระหว่างคลัง',
        titleEn: 'Warehouse Transfers',
        descriptionTh: 'ติดตามเอกสารโอนเข้า-โอนออกระหว่างสาขาและคลังสินค้าทั้งหมด',
        descriptionEn: 'Monitor inter-warehouse transfer in/out documents in real time.',
        category: 'transaction',
        status: 'planned',
        href: '/transaction/transferin',
        plannedEndpoint: '/api/transactions/transfer',
    },
    {
        id: 'returns-disposals',
        titleTh: 'รับคืนสินค้า & ตัดจำหน่าย',
        titleEn: 'Returns & Disposals',
        descriptionTh: 'สรุปปริมาณรับคืนจากลูกค้า/พนักงาน และการตัดจำหน่ายสินค้าหมดอายุ',
        descriptionEn: 'Track customer/staff returns and approved stock disposals.',
        category: 'transaction',
        status: 'planned',
        href: '/transaction/return',
        plannedEndpoint: '/api/transactions/disposal',
    },
    {
        id: 'business-analytics',
        titleTh: 'ตัวชี้วัดธุรกิจ / ยอดขาย / PO ค้างรับ',
        titleEn: 'Sales, Open PO & Financial KPIs',
        descriptionTh: 'พื้นที่สำรองสำหรับเชื่อมข้อมูลยอดขาย ใบสั่งซื้อค้างรับ และอัตราหมุนเวียนสต็อก',
        descriptionEn: 'Reserved slot for company revenue, open POs, and stock turnover metrics.',
        category: 'analytics',
        status: 'planned',
        plannedEndpoint: '/api/analytics/company-summary',
    },
];

/**
 * แปลงสตริงวันที่ (เช่น YYYY-MM-DD หรือ ISO) เป็นจำนวนวันที่ต่างจากวันนี้แบบปลอดภัยต่อ Timezone
 */
function getDaysUntilDate(rawDate?: string): number | null {
    if (!rawDate) return null;
    const match = String(rawDate).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    let targetDate: Date;

    if (match) {
        targetDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    } else {
        targetDate = new Date(rawDate);
    }

    if (Number.isNaN(targetDate.getTime())) return null;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    return Math.round((targetStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * ดึง key รูปแบบ 'YYYY-MM' จากวันที่เอกสาร
 */
function extractYearMonthKey(rawDate?: string): string | null {
    if (!rawDate) return null;
    const trimmed = String(rawDate).trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}`;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function getDateSortTimestamp(rawDate?: string): number {
    if (!rawDate) return 0;
    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

export function normalizeInventoryItems(
    inventoryList: InventoryView[],
    itemList: MastItem[],
    warehouseList: MastWarehouse[],
    lang: Lang
): NormalizedInventoryItem[] {
    const itemById = new Map<string, MastItem>();
    const itemByCode = new Map<string, MastItem>();
    for (const item of itemList) {
        if (item.id) itemById.set(String(item.id), item);
        if (item.itemCode) itemByCode.set(String(item.itemCode), item);
    }

    const warehouseById = new Map<string, MastWarehouse>();
    for (const wh of warehouseList) {
        if (wh.id) warehouseById.set(String(wh.id), wh);
    }

    return inventoryList.map((inv, idx) => {
        const raw = inv as unknown as Record<string, unknown>;
        const rawItemId = getField<string | number>(raw, 'itemId', 'item_id', 'itemCode');
        const matchedItem =
            (rawItemId !== undefined ? itemById.get(String(rawItemId)) : undefined) ??
            (rawItemId !== undefined ? itemByCode.get(String(rawItemId)) : undefined);

        const whId = String(getField<string | number>(raw, 'warehouseId', 'warehouse_id') ?? '');
        const matchedWh = whId ? warehouseById.get(whId) : undefined;

        const qty = Number(getField<number>(raw, 'itemQty', 'item_qty', 'qty', 'quantity') ?? 0);
        const price = Number(
            getField<number>(raw, 'itemPrice', 'item_price', 'price', 'buyPrice') ??
                matchedItem?.buyPrice ??
                0
        );
        const expireDate = String(
            getField<string>(raw, 'expireDate', 'expire_date', 'expDate') ?? ''
        );

        const fallbackWhLabel = lang === 'th' ? 'ไม่ระบุคลัง' : 'Unassigned';

        return {
            id: String(getField<string>(raw, 'id') ?? `inv-${idx}`),
            itemId: String(rawItemId ?? ''),
            itemCode: String(
                getField<string>(raw, 'itemCode', 'item_code') || matchedItem?.itemCode || '-'
            ),
            itemName: String(
                getField<string>(raw, 'itemName', 'item_name') ||
                    matchedItem?.itemName ||
                    (lang === 'th' ? `สินค้า #${rawItemId || idx + 1}` : `Item #${rawItemId || idx + 1}`)
            ),
            warehouseId: whId || 'unassigned',
            warehouseName: String(
                getField<string>(raw, 'warehouseName', 'warehouse_name') ||
                    matchedWh?.warehouseName ||
                    (whId ? `${lang === 'th' ? 'คลัง' : 'WH'} #${whId}` : fallbackWhLabel)
            ),
            qty,
            price,
            value: qty * price,
            minAlert: Number(matchedItem?.minAlert ?? 5),
            lotNo: String(getField<string>(raw, 'lotNo', 'lot_no', 'lot') ?? ''),
            expireDate,
            daysToExpire: getDaysUntilDate(expireDate),
        };
    });
}

export function normalizeTransactionDocs(
    receiveDocs: DocReceive[],
    issueDocs: DocIssue[],
    warehouseList: MastWarehouse[]
): NormalizedDashboardDoc[] {
    const warehouseById = new Map<string, MastWarehouse>();
    for (const wh of warehouseList) {
        if (wh.id) warehouseById.set(String(wh.id), wh);
    }

    const mapDoc = (
        doc: DocReceive | DocIssue,
        flow: 'receive' | 'issue'
    ): NormalizedDashboardDoc => {
        const rec = doc as unknown as Record<string, unknown>;
        const id = String(getField(rec, 'id') ?? '');
        const whId = String(getField(rec, 'warehouseId', 'warehouse_id') ?? '');
        const matchedWh = whId ? warehouseById.get(whId) : undefined;
        const warehouseName = String(
            getField(rec, 'warehouseName', 'warehouse_name', 'warehouse') ||
                matchedWh?.warehouseName ||
                '-'
        );
        const partnerName =
            flow === 'receive'
                ? String(getField(rec, 'vendName', 'vendorName', 'vend_name') || '-')
                : String(getField(rec, 'custName', 'customerName', 'cust_name') || '-');
        const docDateRaw = String(getField(rec, 'docDate', 'doc_date', 'createDate') || '');
        const statusCode = String(
            getField(rec, 'statusCode', 'status_code', 'statusName', 'statusId') || 'Draft'
        );

        return {
            id,
            flow,
            docNo: String(getField(rec, 'docNo', 'doc_no') || '-'),
            docDateRaw,
            docDateSort: getDateSortTimestamp(docDateRaw || String(getField(rec, 'createDate') || '')),
            statusCode,
            statusCategory: getStatusCategory(statusCode),
            warehouseName,
            partnerName,
            href: id ? `/transaction/${flow}/${id}` : null,
        };
    };

    return [
        ...receiveDocs.map((d) => mapDoc(d, 'receive')),
        ...issueDocs.map((d) => mapDoc(d, 'issue')),
    ];
}

export function buildMonthlyReceiveIssueSeries(
    docs: NormalizedDashboardDoc[],
    monthsCount: number,
    lang: Lang
): GroupedBarDatum[] {
    const now = new Date();
    const buckets: GroupedBarDatum[] = [];
    const bucketByKey = new Map<string, GroupedBarDatum>();
    const monthFormatter = new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-US', {
        month: 'short',
        year: '2-digit',
    });

    for (let offset = monthsCount - 1; offset >= 0; offset--) {
        const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const entry: GroupedBarDatum = {
            key,
            label: monthFormatter.format(d),
            values: { receive: 0, issue: 0 },
        };
        buckets.push(entry);
        bucketByKey.set(key, entry);
    }

    for (const doc of docs) {
        const key = extractYearMonthKey(doc.docDateRaw);
        if (!key) continue;
        const target = bucketByKey.get(key);
        if (!target) continue;
        target.values[doc.flow] = (target.values[doc.flow] || 0) + 1;
    }

    return buckets;
}

export function buildWarehouseStockBreakdown(
    items: NormalizedInventoryItem[],
    metric: 'qty' | 'value'
): PieSliceDatum[] {
    const grouped = new Map<string, { label: string; qty: number; value: number }>();

    for (const item of items) {
        const key = item.warehouseId || item.warehouseName;
        const existing = grouped.get(key) ?? {
            label: item.warehouseName,
            qty: 0,
            value: 0,
        };
        existing.qty += item.qty;
        existing.value += item.value;
        grouped.set(key, existing);
    }

    const sorted = Array.from(grouped.entries())
        .map(([id, data]) => ({
            id,
            label: data.label,
            value: metric === 'value' ? data.value : data.qty,
            subLabel:
                metric === 'value'
                    ? `${data.qty.toLocaleString('th-TH')} ชิ้น`
                    : `฿${data.value.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`,
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);

    // รวมคลังอันดับ 6 เป็น "อื่นๆ" เพื่อให้ Pie Chart อ่านง่ายไม่รก
    const topSlices = sorted.slice(0, 5);
    const others = sorted.slice(5);
    const result: PieSliceDatum[] = topSlices.map((s, idx) => ({
        ...s,
        color: CHART_PALETTE[idx % CHART_PALETTE.length],
    }));

    if (others.length > 0) {
        const otherSum = others.reduce((acc, s) => acc + s.value, 0);
        result.push({
            id: 'other-warehouses',
            label: `อื่นๆ (${others.length})`,
            value: otherSum,
            color: CHART_PALETTE[6],
        });
    }

    return result;
}

export function buildDocStatusBreakdown(
    docs: NormalizedDashboardDoc[],
    lang: Lang
): PieSliceDatum[] {
    const counts: Record<StatusCategory, number> = {
        completed: 0,
        saved: 0,
        pending: 0,
        draft: 0,
        cancelled: 0,
    };

    for (const doc of docs) {
        counts[doc.statusCategory] = (counts[doc.statusCategory] || 0) + 1;
    }

    const definitions: { key: StatusCategory; labelTh: string; labelEn: string; color: string }[] = [
        { key: 'completed', labelTh: 'เสร็จสิ้น', labelEn: 'Completed', color: '#10b981' },
        { key: 'saved', labelTh: 'บันทึกเอกสาร', labelEn: 'Saved', color: '#2563eb' },
        { key: 'pending', labelTh: 'กำลังดำเนินการ', labelEn: 'In Progress', color: '#8b5cf6' },
        { key: 'draft', labelTh: 'ฉบับร่าง', labelEn: 'Draft', color: '#f59e0b' },
        { key: 'cancelled', labelTh: 'ยกเลิก', labelEn: 'Cancelled', color: '#f43f5e' },
    ];

    return definitions
        .filter((def) => counts[def.key] > 0)
        .map((def) => ({
            id: def.key,
            label: lang === 'th' ? def.labelTh : def.labelEn,
            value: counts[def.key],
            color: def.color,
        }));
}

export function buildTopStockItems(
    items: NormalizedInventoryItem[],
    metric: 'qty' | 'value',
    limit = 5
): HorizontalBarDatum[] {
    const byItem = new Map<string, { code: string; name: string; qty: number; value: number }>();

    for (const item of items) {
        const key = item.itemId || item.itemCode || item.itemName;
        const existing = byItem.get(key) ?? {
            code: item.itemCode,
            name: item.itemName,
            qty: 0,
            value: 0,
        };
        existing.qty += item.qty;
        existing.value += item.value;
        byItem.set(key, existing);
    }

    return Array.from(byItem.entries())
        .map(([id, data]) => {
            const rawVal = metric === 'value' ? data.value : data.qty;
            return {
                id,
                label: data.name,
                subLabel: data.code !== '-' ? data.code : undefined,
                value: rawVal,
                formattedValue:
                    metric === 'value'
                        ? `฿${rawVal.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`
                        : rawVal.toLocaleString('th-TH'),
            };
        })
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
}

export interface WatchlistAlertItem {
    id: string;
    itemCode: string;
    itemName: string;
    warehouseName: string;
    qty: number;
    minAlert: number;
    daysToExpire: number | null;
    reason: 'out' | 'low' | 'expiring';
}

export function buildStockAlertWatchlist(
    items: NormalizedInventoryItem[],
    limit = 6
): WatchlistAlertItem[] {
    const alerts: WatchlistAlertItem[] = [];

    for (const item of items) {
        if (item.qty <= 0) {
            alerts.push({
                id: item.id,
                itemCode: item.itemCode,
                itemName: item.itemName,
                warehouseName: item.warehouseName,
                qty: item.qty,
                minAlert: item.minAlert,
                daysToExpire: item.daysToExpire,
                reason: 'out',
            });
        } else if (item.qty <= item.minAlert) {
            alerts.push({
                id: item.id,
                itemCode: item.itemCode,
                itemName: item.itemName,
                warehouseName: item.warehouseName,
                qty: item.qty,
                minAlert: item.minAlert,
                daysToExpire: item.daysToExpire,
                reason: 'low',
            });
        } else if (item.daysToExpire !== null && item.daysToExpire <= 30) {
            alerts.push({
                id: item.id,
                itemCode: item.itemCode,
                itemName: item.itemName,
                warehouseName: item.warehouseName,
                qty: item.qty,
                minAlert: item.minAlert,
                daysToExpire: item.daysToExpire,
                reason: 'expiring',
            });
        }
    }

    const priority: Record<WatchlistAlertItem['reason'], number> = {
        out: 0,
        low: 1,
        expiring: 2,
    };

    return alerts
        .sort((a, b) => priority[a.reason] - priority[b.reason] || a.qty - b.qty)
        .slice(0, limit);
}

export function summarizeCompanyKpis(params: {
    inventory: NormalizedInventoryItem[];
    receiveDocs: NormalizedDashboardDoc[];
    issueDocs: NormalizedDashboardDoc[];
    receiveTotalCount?: number;
    issueTotalCount?: number;
    items: MastItem[];
    warehouses: MastWarehouse[];
    locations: MastLocation[];
    vendors: MastVendor[];
    customers: MastCustomer[];
    employees: MastEmployee[];
}): CompanyKpiSummary {
    let totalStockQty = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let expiringSoonCount = 0;

    for (const inv of params.inventory) {
        totalStockQty += inv.qty;
        totalStockValue += inv.value;
        if (inv.qty <= 0) {
            outOfStockCount++;
        } else if (inv.qty <= inv.minAlert) {
            lowStockCount++;
        }
        if (inv.daysToExpire !== null && inv.daysToExpire <= 30) {
            expiringSoonCount++;
        }
    }

    const countPending = (docs: NormalizedDashboardDoc[]) =>
        docs.filter((d) => ['draft', 'saved', 'pending'].includes(d.statusCategory)).length;
    const countCompleted = (docs: NormalizedDashboardDoc[]) =>
        docs.filter((d) => d.statusCategory === 'completed').length;

    const receivePending = countPending(params.receiveDocs);
    const receiveCompleted = countCompleted(params.receiveDocs);
    const issuePending = countPending(params.issueDocs);
    const issueCompleted = countCompleted(params.issueDocs);

    return {
        totalStockQty,
        totalStockValue,
        totalStockRecords: params.inventory.length,
        lowStockCount,
        outOfStockCount,
        expiringSoonCount,
        receiveTotal: params.receiveTotalCount ?? params.receiveDocs.length,
        receiveCompleted,
        receivePending,
        issueTotal: params.issueTotalCount ?? params.issueDocs.length,
        issueCompleted,
        issuePending,
        totalPendingDocs: receivePending + issuePending,
        masterCounts: {
            items: params.items.length,
            warehouses: params.warehouses.length,
            locations: params.locations.length,
            vendors: params.vendors.length,
            customers: params.customers.length,
            employees: params.employees.length,
        },
    };
}
