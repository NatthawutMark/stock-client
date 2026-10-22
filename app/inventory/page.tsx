'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { inventoryService, type InventoryListParams } from '@/app/_services/inventory';
import { masterService } from '@/app/_services/master';
import {
    inventories as mockInventories,
    items as mockItems,
    warehouses as mockWarehouses,
    locations as mockLocations,
    uoms as mockUoms,
} from '@/lib/mock/data';
import type {
    InventoryView,
    MastWarehouse,
    MastLocation,
    MastItem,
    MastUom,
} from '@/lib/types';
import {
    Button,
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Card,
    CardContent,
    Label,
    TablePagination,
    SearchableSelect,
    type SearchableSelectOption,
} from '@/components/ui';
import {
    Search,
    RotateCcw,
    Package,
    Warehouse as WarehouseIcon,
    MapPin,
    Boxes,
    Coins,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Layers,
    Tag,
    X,
    Barcode,
    Sparkles,
    RefreshCw,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────
export type StockStatus = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'HAS_LOT' | 'HAS_SERIAL';

export interface ExtendedInventoryItem extends InventoryView {
    minAlert?: number;
    maxAlert?: number;
    buyPrice?: number;
    sellPrice?: number;
    brandName?: string;
}

interface InventoryFilters {
    warehouseId: string;
    locationId: string;
    itemId: string;
    keyword: string;
    lotNo: string;
    serialNo: string;
    stockStatus: StockStatus;
}

const initialFilters: InventoryFilters = {
    warehouseId: '',
    locationId: '',
    itemId: '',
    keyword: '',
    lotNo: '',
    serialNo: '',
    stockStatus: 'ALL',
};

const STOCK_STATUS_OPTIONS: SearchableSelectOption[] = [
    { value: 'ALL', label: 'ทั้งหมด (All Status)' },
    { value: 'IN_STOCK', label: 'มีสินค้าคงคลัง (In Stock > 0)' },
    { value: 'LOW_STOCK', label: 'สินค้าใกล้หมด (Low Stock)' },
    { value: 'OUT_OF_STOCK', label: 'สินค้าหมดสต็อก (Out of Stock = 0)' },
    { value: 'HAS_LOT', label: 'มีหมายเลขล็อต (Has Lot No.)' },
    { value: 'HAS_SERIAL', label: 'มีหมายเลขซีเรียล (Has Serial No.)' },
];

const QUICK_TABS: { key: StockStatus; label: string; icon: ReactNode }[] = [
    { key: 'ALL', label: 'ทั้งหมด', icon: <Boxes className="w-3.5 h-3.5" /> },
    { key: 'IN_STOCK', label: 'มีสินค้า (>0)', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> },
    { key: 'LOW_STOCK', label: 'สินค้าใกล้หมด', icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> },
    { key: 'OUT_OF_STOCK', label: 'สินค้าหมดสต็อก', icon: <XCircle className="w-3.5 h-3.5 text-rose-500" /> },
    { key: 'HAS_LOT', label: 'มี Lot No.', icon: <Layers className="w-3.5 h-3.5 text-blue-500" /> },
    { key: 'HAS_SERIAL', label: 'มี Serial No.', icon: <Barcode className="w-3.5 h-3.5 text-purple-500" /> },
];

const COLUMNS = [
    { colName: 'รหัสสินค้า', key: 'itemCode', width: 130 },
    { colName: 'ชื่อสินค้า', key: 'itemName', width: 220 },
    { colName: 'คลังสินค้า', key: 'warehouse', width: 140 },
    { colName: 'ตำแหน่งจัดเก็บ', key: 'location', width: 140 },
    { colName: 'Lot No.', key: 'lotNo', width: 120 },
    { colName: 'Serial No.', key: 'serialNo', width: 140 },
    { colName: 'วันที่ผลิต / หมดอายุ', key: 'dates', width: 150 },
    { colName: 'คงเหลือ', key: 'qty', width: 120, align: 'text-right' },
    { colName: 'หน่วยนับ', key: 'uom', width: 90 },
    { colName: 'ราคา/หน่วย', key: 'price', width: 110, align: 'text-right' },
    { colName: 'มูลค่ารวม', key: 'totalValue', width: 120, align: 'text-right' },
    { colName: 'จัดการ', key: 'action', width: 140, align: 'text-center' },
];

const TOTAL_KEYS = ['total', 'totalCount', 'totalRecords', 'total_count', 'total_records', 'count', 'recordsTotal'];

const INPUT_CLASS =
    'w-full h-10 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 shadow-sm';

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────
function getField<T = unknown>(item: Record<string, unknown> | undefined, ...keys: string[]): T | undefined {
    if (!item) return undefined;
    for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null) return item[key] as T;
    }
    const itemKeys = Object.keys(item);
    for (const key of keys) {
        const foundKey = itemKeys.find((k) => k.toLowerCase() === key.toLowerCase());
        if (foundKey && item[foundKey] !== undefined && item[foundKey] !== null) {
            return item[foundKey] as T;
        }
    }
    return undefined;
}

interface ListResponse {
    success?: boolean;
    results?: unknown;
    data?: unknown;
}

function extractList<T>(res: ListResponse | null | undefined): T[] {
    if (!res?.success) return [];
    if (Array.isArray(res.results)) return res.results as T[];
    if (Array.isArray(res.data)) return res.data as T[];
    if (res.results && typeof res.results === 'object') {
        const nested = res.results as Record<string, unknown>;
        for (const key of ['items', 'data', 'list']) {
            if (Array.isArray(nested[key])) return nested[key] as T[];
        }
    }
    return [];
}

function extractTotal(res: ListResponse): number | undefined {
    const nested =
        res.results && typeof res.results === 'object' && !Array.isArray(res.results)
            ? (res.results as Record<string, unknown>)
            : undefined;
    const value =
        getField(res as Record<string, unknown>, ...TOTAL_KEYS) ??
        getField(nested, ...TOTAL_KEYS);
    const num = Number(value);
    return value !== undefined && !Number.isNaN(num) ? num : undefined;
}

function FilterField({
    id,
    label,
    subLabel,
    children,
}: {
    id: string;
    label: string;
    subLabel: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between">
                <Label htmlFor={id} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {label}
                </Label>
                <span className="text-xs text-zinc-400">{subLabel}</span>
            </div>
            {children}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main Component: InventoryPage
// ─────────────────────────────────────────────────────────────
export default function InventoryPage() {
    const router = useRouter();
    const { pageTitle } = useLayout();

    // ─────────────────────────────────────────────────────────────
    // 1. Filter States (Dynamic)
    // ─────────────────────────────────────────────────────────────
    const [warehouseIdInput, setWarehouseIdInput] = useState<string>('');
    const [locationIdInput, setLocationIdInput] = useState<string>('');
    const [itemIdInput, setItemIdInput] = useState<string>('');
    const [keywordInput, setKeywordInput] = useState<string>('');
    const [lotNoInput, setLotNoInput] = useState<string>('');
    const [serialNoInput, setSerialNoInput] = useState<string>('');
    const [stockStatusInput, setStockStatusInput] = useState<StockStatus>('ALL');

    const [appliedFilters, setAppliedFilters] = useState<InventoryFilters>(initialFilters);

    // Master Dropdown Data
    const [warehouseList, setWarehouseList] = useState<MastWarehouse[]>([]);
    const [locationList, setLocationList] = useState<MastLocation[]>([]);
    const [itemList, setItemList] = useState<MastItem[]>([]);
    const [uomList, setUomList] = useState<MastUom[]>([]);

    // Document / Inventory Data (Raw from API or Mock)
    const [inventoryList, setInventoryList] = useState<InventoryView[]>([]);
    const [allInventoryList, setAllInventoryList] = useState<InventoryView[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingStats, setLoadingStats] = useState<boolean>(true);

    // Pagination States
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [totalRecords, setTotalRecords] = useState<number>(0);

    // In-flight guards ป้องกัน request ซ้ำซ้อนขณะกำลังดึงข้อมูล
    const isFetchingRef = useRef<boolean>(false);
    const isFetchingAllRef = useRef<boolean>(false);

    // ─────────────────────────────────────────────────────────────
    // 2. โหลด Master Data สำหรับ Dynamic Dropdowns
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadMasters = async () => {
            try {
                const [whRes, locRes, itemRes, uomRes] = await Promise.all([
                    masterService.warehouses.list(),
                    masterService.locations.list(),
                    masterService.items.list(),
                    masterService.uoms.list(),
                ]);

                const whs = extractList<MastWarehouse>(whRes);
                setWarehouseList(whs.length > 0 ? whs : mockWarehouses);

                const locs = extractList<MastLocation>(locRes);
                setLocationList(locs.length > 0 ? locs : mockLocations);

                const itms = extractList<MastItem>(itemRes);
                setItemList(itms.length > 0 ? itms : mockItems);

                const uomsData = extractList<MastUom>(uomRes);
                setUomList(uomsData.length > 0 ? uomsData : mockUoms);
            } catch (err) {
                console.warn('Failed to load masters, using mock data:', err);
                setWarehouseList(mockWarehouses);
                setLocationList(mockLocations);
                setItemList(mockItems);
                setUomList(mockUoms);
            }
        };

        loadMasters();
    }, []);

    // ─────────────────────────────────────────────────────────────
    // 3. Dynamic Dropdown Options
    // ─────────────────────────────────────────────────────────────
    const warehouseOptions = useMemo<SearchableSelectOption[]>(() => {
        return warehouseList.map((wh) => ({
            value: String(wh.id),
            label: `${wh.code ? `[${wh.code}] ` : ''}${wh.warehouseName || wh.description || `คลัง #${wh.id}`}`,
            subLabel: wh.description && wh.description !== wh.warehouseName ? wh.description : undefined,
        }));
    }, [warehouseList]);

    // DYNAMIC FILTER: ตำแหน่งจัดเก็บจะถูกกรองตามคลังสินค้าที่เลือก
    const locationOptions = useMemo<SearchableSelectOption[]>(() => {
        const filteredLocations = warehouseIdInput
            ? locationList.filter(
                (loc) =>
                    String(loc.warehouseId || '') === String(warehouseIdInput) ||
                    String((loc as Record<string, unknown>).WarehouseId || '') === String(warehouseIdInput)
            )
            : locationList;

        return filteredLocations.map((loc) => ({
            value: String(loc.id),
            label: `${loc.code ? `[${loc.code}] ` : ''}${loc.name || `ตำแหน่ง #${loc.id}`}`,
            subLabel: loc.warehouseId
                ? `คลัง: ${warehouseList.find((w) => String(w.id) === String(loc.warehouseId))?.warehouseName || loc.warehouseId}`
                : undefined,
        }));
    }, [locationList, warehouseIdInput, warehouseList]);

    // เมื่อเปลี่ยนคลังสินค้า และตำแหน่งจัดเก็บเดิมไม่อยู่ในคลังใหม่ ให้รีเซ็ตตำแหน่งจัดเก็บ
    const handleWarehouseChange = (whId: string) => {
        setWarehouseIdInput(whId);
        if (whId) {
            const isValidLocation = locationList.some(
                (loc) =>
                    String(loc.id) === String(locationIdInput) &&
                    (String(loc.warehouseId || '') === String(whId) ||
                        String((loc as Record<string, unknown>).WarehouseId || '') === String(whId))
            );
            if (!isValidLocation) {
                setLocationIdInput('');
            }
        }
    };

    const itemOptions = useMemo<SearchableSelectOption[]>(() => {
        return itemList.map((item) => ({
            value: String(item.id),
            label: `${item.itemCode ? `[${item.itemCode}] ` : ''}${item.itemName || `สินค้า #${item.id}`}`,
            subLabel: item.buyPrice ? `ราคาต้นทุน: ฿${item.buyPrice.toLocaleString()}` : undefined,
        }));
    }, [itemList]);

    // ─────────────────────────────────────────────────────────────
    // 4. Mock Fallback (เมื่อ Backend ยังไม่พร้อม)
    // ─────────────────────────────────────────────────────────────
    const applyMockFallback = useCallback((filters: InventoryFilters, page: number, size: number) => {
        const filtered = mockInventories.filter((inv) => {
            if (filters.warehouseId && String(inv.warehouseId) !== String(filters.warehouseId)) {
                return false;
            }
            if (filters.locationId && String(inv.locationId) !== String(filters.locationId)) {
                return false;
            }
            if (filters.itemId && String(inv.itemId) !== String(filters.itemId)) {
                return false;
            }
            if (filters.keyword.trim()) {
                const q = filters.keyword.trim().toLowerCase();
                const m = mockItems.find((it) => it.id === inv.itemId);
                const match =
                    m?.itemCode?.toLowerCase().includes(q) ||
                    m?.itemName?.toLowerCase().includes(q) ||
                    inv.lotNo?.toLowerCase().includes(q) ||
                    inv.serialNo?.toLowerCase().includes(q);
                if (!match) return false;
            }
            if (filters.lotNo.trim() && !inv.lotNo?.toLowerCase().includes(filters.lotNo.trim().toLowerCase())) {
                return false;
            }
            if (filters.serialNo.trim() && !inv.serialNo?.toLowerCase().includes(filters.serialNo.trim().toLowerCase())) {
                return false;
            }
            if (filters.stockStatus === 'IN_STOCK' && (inv.itemQty ?? 0) <= 0) {
                return false;
            }
            if (filters.stockStatus === 'LOW_STOCK') {
                const min = 5;
                if ((inv.itemQty ?? 0) <= 0 || (inv.itemQty ?? 0) > min) return false;
            }
            if (filters.stockStatus === 'OUT_OF_STOCK' && (inv.itemQty ?? 0) > 0) {
                return false;
            }
            if (filters.stockStatus === 'HAS_LOT' && !inv.lotNo) {
                return false;
            }
            if (filters.stockStatus === 'HAS_SERIAL' && !inv.serialNo) {
                return false;
            }
            return true;
        });

        setTotalRecords(filtered.length);
        const start = (page - 1) * size;
        setInventoryList(filtered.slice(start, start + size));
    }, []);

    // ─────────────────────────────────────────────────────────────
    // 5. โหลดข้อมูลสินค้าคงคลัง (Fetch Inventory Data)
    //    Dependencies มีเพียง [currentPage, pageSize, appliedFilters, applyMockFallback]
    //    ทำให้ไม่ถูก trigger ซ้ำตอน Master Lists โหลดเสร็จ
    // ─────────────────────────────────────────────────────────────
    const fetchInventory = useCallback(async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        setLoading(true);
        try {
            const payload: InventoryListParams & { pageSize?: number; pageNumber?: number } = {
                warehouseId: appliedFilters.warehouseId || undefined,
                locationId: appliedFilters.locationId || undefined,
                itemId: appliedFilters.itemId || undefined,
                search: appliedFilters.keyword.trim() || undefined,
                lotNo: appliedFilters.lotNo.trim() || undefined,
                serialNo: appliedFilters.serialNo.trim() || undefined,
                status: appliedFilters.stockStatus !== 'ALL' ? appliedFilters.stockStatus : undefined,
                page: currentPage,
                pageNumber: currentPage,
                size: pageSize,
                pageSize,
                limit: pageSize,
            };

            const res = await inventoryService.list(payload);

            if (!res?.success) {
                applyMockFallback(appliedFilters, currentPage, pageSize);
                return;
            }

            const data = extractList<InventoryView>(res);

            // กรณี Backend ส่งมาทั้งหมดรอบเดียว (Client Pagination)
            if (data.length > pageSize) {
                const start = (currentPage - 1) * pageSize;
                setTotalRecords(data.length);
                setInventoryList(data.slice(start, start + pageSize));
                return;
            }

            // กรณี Backend แบ่งหน้ามาให้ (Server Pagination)
            setInventoryList(data);
            const total = extractTotal(res);
            if (total !== undefined) {
                setTotalRecords(total);
            } else {
                setTotalRecords(
                    data.length === pageSize
                        ? currentPage * pageSize + 1
                        : (currentPage - 1) * pageSize + data.length
                );
            }
        } catch (error) {
            console.warn('Fetch inventory list failed, using mock data:', error);
            applyMockFallback(appliedFilters, currentPage, pageSize);
        } finally {
            isFetchingRef.current = false;
            setLoading(false);
        }
    }, [currentPage, pageSize, appliedFilters, applyMockFallback]);

    // ─────────────────────────────────────────────────────────────
    // 5.2 โหลดข้อมูลสินค้าคงคลังทั้งหมด (Fetch All Inventory for Stats)
    //     ยิง API เส้น ListAll สำหรับดึงข้อมูลทั้งหมดมาใช้คำนวณ KPI Dashboard
    // ─────────────────────────────────────────────────────────────
    const fetchInventoryAll = useCallback(async () => {
        if (isFetchingAllRef.current) return;
        isFetchingAllRef.current = true;
        setLoadingStats(true);
        try {
            const res = await inventoryService.listAll({});

            if (res?.success) {
                const data = extractList<InventoryView>(res);
                setAllInventoryList(data);
            } else {
                // Fallback กรณี backend ยังไม่พร้อม หรือกรณี mock
                const filteredMock = mockInventories.filter((inv) => {
                    if (appliedFilters.warehouseId && String(inv.warehouseId) !== String(appliedFilters.warehouseId)) return false;
                    if (appliedFilters.locationId && String(inv.locationId) !== String(appliedFilters.locationId)) return false;
                    if (appliedFilters.itemId && String(inv.itemId) !== String(appliedFilters.itemId)) return false;
                    if (appliedFilters.keyword.trim()) {
                        const q = appliedFilters.keyword.trim().toLowerCase();
                        const m = mockItems.find((it) => it.id === inv.itemId);
                        const match =
                            m?.itemCode?.toLowerCase().includes(q) ||
                            m?.itemName?.toLowerCase().includes(q) ||
                            inv.lotNo?.toLowerCase().includes(q) ||
                            inv.serialNo?.toLowerCase().includes(q);
                        if (!match) return false;
                    }
                    if (appliedFilters.lotNo.trim() && !inv.lotNo?.toLowerCase().includes(appliedFilters.lotNo.trim().toLowerCase())) return false;
                    if (appliedFilters.serialNo.trim() && !inv.serialNo?.toLowerCase().includes(appliedFilters.serialNo.trim().toLowerCase())) return false;
                    if (appliedFilters.stockStatus === 'IN_STOCK' && (inv.itemQty ?? 0) <= 0) return false;
                    if (appliedFilters.stockStatus === 'LOW_STOCK') {
                        const min = 5;
                        if ((inv.itemQty ?? 0) <= 0 || (inv.itemQty ?? 0) > min) return false;
                    }
                    if (appliedFilters.stockStatus === 'OUT_OF_STOCK' && (inv.itemQty ?? 0) > 0) return false;
                    if (appliedFilters.stockStatus === 'HAS_LOT' && !inv.lotNo) return false;
                    if (appliedFilters.stockStatus === 'HAS_SERIAL' && !inv.serialNo) return false;
                    return true;
                });
                setAllInventoryList(filteredMock);
            }
        } catch (error) {
            console.warn('Fetch all inventory for stats failed, using fallback:', error);
            setAllInventoryList(mockInventories);
        } finally {
            isFetchingAllRef.current = false;
            setLoadingStats(false);
        }
    }, [appliedFilters]);

    // ─────────────────────────────────────────────────────────────
    // UseEffect 1: สำหรับดึงข้อมูลแสดงผลในตาราง (Table Pagination & Filtering)
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchInventory();
    }, [fetchInventory]);

    // ─────────────────────────────────────────────────────────────
    // UseEffect 2: สำหรับดึงข้อมูลทั้งหมด (ListAll) เพื่อคำนวณ Stats / KPI Dashboard
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchInventoryAll();
    }, [fetchInventoryAll]);

    // ─────────────────────────────────────────────────────────────
    // 6. Enrich Inventory List for Display (In-Memory Memoization)
    //    ซิงค์ชื่อ Master Data ในหน่วยความจำโดยไม่ต้องยิง API ซ้ำ
    // ─────────────────────────────────────────────────────────────
    const displayInventoryList = useMemo<ExtendedInventoryItem[]>(() => {
        return inventoryList.map((inv) => {
            const raw = inv as unknown as Record<string, unknown>;
            const itemId = getField<number | string>(raw, 'itemId', 'item_id', 'itemCode');
            const matchedItem = itemList.find(
                (it) => String(it.id) === String(itemId) || String(it.itemCode) === String(itemId)
            ) || mockItems.find((it) => String(it.id) === String(itemId));

            const whId = getField<number | string>(raw, 'warehouseId', 'warehouse_id');
            const matchedWh = warehouseList.find((w) => String(w.id) === String(whId)) ||
                mockWarehouses.find((w) => String(w.id) === String(whId));

            const locId = getField<number | string>(raw, 'locationId', 'location_id');
            const matchedLoc = locationList.find((l) => String(l.id) === String(locId)) ||
                mockLocations.find((l) => String(l.id) === String(locId));

            const uomId = matchedItem?.uomId || getField<number | string>(raw, 'uomId', 'uom_id');
            const matchedUom = uomList.find((u) => String(u.id) === String(uomId)) ||
                mockUoms.find((u) => String(u.id) === String(uomId));

            const itemQty = Number(getField<number>(raw, 'itemQty', 'item_qty', 'qty', 'quantity') ?? 0);
            const itemPrice = Number(getField<number>(raw, 'itemPrice', 'item_price', 'price', 'buyPrice') ?? matchedItem?.buyPrice ?? 0);

            return {
                ...inv,
                id: getField<number | string>(raw, 'id') ?? 0,
                itemId: Number(itemId) || 0,
                itemCode: String(getField<string>(raw, 'itemCode', 'item_code') || matchedItem?.itemCode || `ITM-${itemId || '-'}`),
                itemName: String(getField<string>(raw, 'itemName', 'item_name') || matchedItem?.itemName || `สินค้า #${itemId || '-'}`),
                warehouseId: Number(whId) || 0,
                warehouseName: String(getField<string>(raw, 'warehouseName', 'warehouse_name') || matchedWh?.warehouseName || `คลัง #${whId || '-'}`),
                locationId: Number(locId) || 0,
                locationName: String(getField<string>(raw, 'locationName', 'location_name') || matchedLoc?.name || matchedLoc?.code || `ตำแหน่ง #${locId || '-'}`),
                uomName: String(getField<string>(raw, 'uomName', 'uom_name') || matchedUom?.name || 'ชิ้น'),
                lotNo: String(getField<string>(raw, 'lotNo', 'lot_no', 'lot') || ''),
                serialNo: String(getField<string>(raw, 'serialNo', 'serial_no', 'serial') || ''),
                itemQty,
                itemPrice,
                mfgDate: String(getField<string>(raw, 'mfgDate', 'mfg_date') || ''),
                expireDate: String(getField<string>(raw, 'expireDate', 'expire_date', 'expDate') || ''),
                minAlert: matchedItem?.minAlter ?? matchedItem?.minAlert ?? 5,
                maxAlert: matchedItem?.maxAlter ?? matchedItem?.maxAlert ?? 50,
                buyPrice: matchedItem?.buyPrice ?? itemPrice,
                sellPrice: matchedItem?.sellPrice ?? 0,
                brandName: (matchedItem as Record<string, unknown>)?.brandName as string | undefined,
            };
        });
    }, [inventoryList, itemList, warehouseList, locationList, uomList]);

    // ─────────────────────────────────────────────────────────────
    // 7. Actions & Handlers
    // ─────────────────────────────────────────────────────────────
    const handleSearch = () => {
        setAppliedFilters({
            warehouseId: warehouseIdInput,
            locationId: locationIdInput,
            itemId: itemIdInput,
            keyword: keywordInput,
            lotNo: lotNoInput,
            serialNo: serialNoInput,
            stockStatus: stockStatusInput,
        });
        setCurrentPage(1);
    };

    const handleResetFilter = () => {
        setWarehouseIdInput('');
        setLocationIdInput('');
        setItemIdInput('');
        setKeywordInput('');
        setLotNoInput('');
        setSerialNoInput('');
        setStockStatusInput('ALL');
        setAppliedFilters({ ...initialFilters });
        setCurrentPage(1);
    };

    const handleQuickTabSelect = (status: StockStatus) => {
        setStockStatusInput(status);
        setAppliedFilters((prev) => ({
            ...prev,
            stockStatus: status,
        }));
        setCurrentPage(1);
    };

    const handleRemoveSingleFilter = (key: keyof InventoryFilters) => {
        const resetVal = key === 'stockStatus' ? 'ALL' : '';
        if (key === 'warehouseId') setWarehouseIdInput('');
        if (key === 'locationId') setLocationIdInput('');
        if (key === 'itemId') setItemIdInput('');
        if (key === 'keyword') setKeywordInput('');
        if (key === 'lotNo') setLotNoInput('');
        if (key === 'serialNo') setSerialNoInput('');
        if (key === 'stockStatus') setStockStatusInput('ALL');

        setAppliedFilters((prev) => ({
            ...prev,
            [key]: resetVal,
        }));
        setCurrentPage(1);
    };

    // คำนวณสรุปข้อมูล KPI Dashboard จากข้อมูลทั้งหมด (allInventoryList)
    const stats = useMemo(() => {
        const sourceList = allInventoryList;
        const totalItemsCount = sourceList.length;
        let totalStockQty = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let totalStockValue = 0;

        for (const inv of sourceList) {
            const raw = inv as unknown as Record<string, unknown>;
            const itemId = getField<number | string>(raw, 'itemId', 'item_id', 'itemCode');
            const matchedItem = itemList.find(
                (it) => String(it.id) === String(itemId) || String(it.itemCode) === String(itemId)
            ) || mockItems.find((it) => String(it.id) === String(itemId));

            const itemQty = Number(getField<number>(raw, 'itemQty', 'item_qty', 'qty', 'quantity') ?? 0);
            const itemPrice = Number(getField<number>(raw, 'itemPrice', 'item_price', 'price', 'buyPrice') ?? matchedItem?.buyPrice ?? 0);
            const minAlert = matchedItem?.minAlter ?? matchedItem?.minAlert ?? 5;

            totalStockQty += itemQty;
            if (itemQty <= 0) {
                outOfStockCount++;
            } else if (itemQty <= minAlert) {
                lowStockCount++;
            }
            totalStockValue += itemQty * itemPrice;
        }

        return {
            totalItemsCount,
            totalStockQty,
            lowStockCount,
            outOfStockCount,
            totalStockValue,
        };
    }, [allInventoryList, inventoryList, itemList]);

    const hasActiveFilters = Boolean(
        appliedFilters.warehouseId ||
        appliedFilters.locationId ||
        appliedFilters.itemId ||
        appliedFilters.keyword ||
        appliedFilters.lotNo ||
        appliedFilters.serialNo ||
        appliedFilters.stockStatus !== 'ALL'
    );

    // Helper แสดงป้ายสถานะจำนวนสต็อก
    const renderStockBadge = (qty: number, minAlert = 5) => {
        if (qty <= 0) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900">
                    <XCircle className="w-3 h-3" />
                    สินค้าหมด (0)
                </span>
            );
        }
        if (qty <= minAlert) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900">
                    <AlertTriangle className="w-3 h-3" />
                    ใกล้หมด ({qty.toLocaleString()})
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">
                <CheckCircle2 className="w-3 h-3" />
                มีสินค้า ({qty.toLocaleString()})
            </span>
        );
    };

    return (
        <AppLayout>
            {/* ─────────────────────────────────────────────────────────────
                Page Header & Action Buttons
               ───────────────────────────────────────────────────────────── */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'สินค้าคงคลัง (Inventory Stock)'}
                    </h1>
                    <p className="text-sm mt-1 text-zinc-500 dark:text-zinc-400">
                        ตรวจสอบยอดคงเหลือ ตำแหน่งจัดเก็บ Lot/Serial และสถานะสินค้าในคลัง (Inventory Management)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            fetchInventory();
                            fetchInventoryAll();
                        }}
                        disabled={loading || loadingStats}
                        className="h-9 px-3 text-xs rounded-xl border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading || loadingStats ? 'animate-spin' : ''}`} />
                        รีเฟรชข้อมูล
                    </Button>
                    <Button
                        onClick={() => router.push('/transaction/receive/form')}
                        className="px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
                    >
                        <Package className="w-4 h-4" />
                        รับสินค้าเข้าสต็อก
                    </Button>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                KPI Summary Stats Cards
               ───────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* 1. รายการสินค้าทั้งหมด */}
                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                รายการในสต็อก (SKUs)
                            </span>
                            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                                {stats.totalItemsCount.toLocaleString()}
                                <span className="text-xs font-normal text-zinc-400 ml-1.5">รายการ</span>
                            </div>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Package className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. จำนวนคงเหลือรวม */}
                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                ยอดคงเหลือรวม (Total Qty)
                            </span>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                {stats.totalStockQty.toLocaleString()}
                                <span className="text-xs font-normal text-zinc-400 ml-1.5">ชิ้น</span>
                            </div>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Boxes className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* 3. สินค้าใกล้หมด / หมดสต็อก */}
                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                แจ้งเตือนสต็อก (Alerts)
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {stats.lowStockCount}
                                </span>
                                <span className="text-xs text-zinc-400">ใกล้หมด /</span>
                                <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                                    {stats.outOfStockCount}
                                </span>
                                <span className="text-xs text-zinc-400">หมดสต็อก</span>
                            </div>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* 4. มูลค่ารวมสต็อกสินค้า */}
                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                มูลค่าสินค้าคงคลัง (Total Value)
                            </span>
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                                ฿{stats.totalStockValue.toLocaleString()}
                            </div>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <Coins className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                1. Filter / Search Section (Dynamic Filters)
               ───────────────────────────────────────────────────────────── */}
            <Card className="mb-6 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                            เงื่อนไขการค้นหาสินค้าคงคลัง (Dynamic Search & Filter)
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetFilter}
                            className="h-8 px-3 text-xs rounded-lg border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            ล้างค่า (Reset)
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSearch}
                            className="h-8 px-4 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        >
                            <Search className="w-3.5 h-3.5 mr-1" />
                            ค้นหา
                        </Button>
                    </div>
                </div>

                <CardContent className="p-6 space-y-5">
                    {/* Quick Filter Status Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <span className="text-xs font-semibold text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
                            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                            สถานะ:
                        </span>
                        {QUICK_TABS.map((tab) => {
                            const isActive = appliedFilters.stockStatus === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => handleQuickTabSelect(tab.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${isActive
                                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                        }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Filter Inputs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {/* 1. คลังสินค้า (Warehouse) */}
                        <FilterField id="filter-warehouse" label="คลังสินค้า" subLabel="Warehouse">
                            <SearchableSelect
                                id="filter-warehouse"
                                value={warehouseIdInput}
                                onChange={handleWarehouseChange}
                                options={warehouseOptions}
                                placeholder="-- ทั้งหมด (All Warehouses) --"
                                searchPlaceholder="ค้นหารหัส หรือชื่อคลัง..."
                                clearable
                            />
                        </FilterField>

                        {/* 2. ตำแหน่งจัดเก็บ (Location) - DYNAMIC DEPENDENT */}
                        <FilterField
                            id="filter-location"
                            label="ตำแหน่งจัดเก็บ"
                            subLabel={warehouseIdInput ? 'กรองตามคลังสินค้าแล้ว' : 'Location'}
                        >
                            <SearchableSelect
                                id="filter-location"
                                value={locationIdInput}
                                onChange={setLocationIdInput}
                                options={locationOptions}
                                placeholder={
                                    warehouseIdInput
                                        ? '-- ตำแหน่งในคลังที่เลือก --'
                                        : '-- ทั้งหมด (All Locations) --'
                                }
                                searchPlaceholder="ค้นหาตำแหน่ง..."
                                clearable
                            />
                        </FilterField>

                        {/* 3. รายการสินค้า (Item / SKU) */}
                        <FilterField id="filter-item" label="รายการสินค้า" subLabel="Item / SKU">
                            <SearchableSelect
                                id="filter-item"
                                value={itemIdInput}
                                onChange={setItemIdInput}
                                options={itemOptions}
                                placeholder="-- สินค้าทั้งหมด (All Items) --"
                                searchPlaceholder="ค้นหารหัส หรือชื่อสินค้า..."
                                clearable
                            />
                        </FilterField>

                        {/* 4. คำค้นหาอิสระ (Keyword Search) */}
                        <FilterField id="filter-keyword" label="ค้นหาทั่วไป" subLabel="Search Keyword">
                            <div className="relative">
                                <input
                                    id="filter-keyword"
                                    type="text"
                                    value={keywordInput}
                                    onChange={(e) => setKeywordInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSearch();
                                    }}
                                    placeholder="รหัส, ชื่อสินค้า, หรือตำแหน่ง..."
                                    className={`${INPUT_CLASS} placeholder:text-zinc-400 focus:outline-none transition-all`}
                                />
                                {keywordInput && (
                                    <button
                                        type="button"
                                        onClick={() => setKeywordInput('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </FilterField>

                        {/* 5. หมายเลขล็อต (Lot No.) */}
                        <FilterField id="filter-lotno" label="หมายเลขล็อต" subLabel="Lot Number">
                            <div className="relative">
                                <input
                                    id="filter-lotno"
                                    type="text"
                                    value={lotNoInput}
                                    onChange={(e) => setLotNoInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSearch();
                                    }}
                                    placeholder="เช่น LOT2024001..."
                                    className={`${INPUT_CLASS} placeholder:text-zinc-400 focus:outline-none transition-all`}
                                />
                                {lotNoInput && (
                                    <button
                                        type="button"
                                        onClick={() => setLotNoInput('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </FilterField>

                        {/* 6. หมายเลขซีเรียล (Serial No.) */}
                        <FilterField id="filter-serial" label="หมายเลขซีเรียล" subLabel="Serial Number">
                            <div className="relative">
                                <input
                                    id="filter-serial"
                                    type="text"
                                    value={serialNoInput}
                                    onChange={(e) => setSerialNoInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSearch();
                                    }}
                                    placeholder="เช่น SN-DELL-001..."
                                    className={`${INPUT_CLASS} placeholder:text-zinc-400 focus:outline-none transition-all`}
                                />
                                {serialNoInput && (
                                    <button
                                        type="button"
                                        onClick={() => setSerialNoInput('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </FilterField>
                    </div>

                    {/* Active Filter Chips / Badges */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <span className="text-xs font-medium text-zinc-400">ตัวกรองที่ใช้งานอยู่:</span>

                            {appliedFilters.warehouseId && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900">
                                    <WarehouseIcon className="w-3 h-3" />
                                    คลัง:{' '}
                                    {warehouseList.find((w) => String(w.id) === String(appliedFilters.warehouseId))
                                        ?.warehouseName || appliedFilters.warehouseId}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSingleFilter('warehouseId')}
                                        className="ml-1 hover:text-blue-900"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}

                            {appliedFilters.locationId && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900">
                                    <MapPin className="w-3 h-3" />
                                    ตำแหน่ง:{' '}
                                    {locationList.find((l) => String(l.id) === String(appliedFilters.locationId))?.name ||
                                        appliedFilters.locationId}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSingleFilter('locationId')}
                                        className="ml-1 hover:text-purple-900"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}

                            {appliedFilters.itemId && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
                                    <Package className="w-3 h-3" />
                                    สินค้า:{' '}
                                    {itemList.find((i) => String(i.id) === String(appliedFilters.itemId))?.itemName ||
                                        appliedFilters.itemId}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSingleFilter('itemId')}
                                        className="ml-1 hover:text-amber-900"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}

                            {appliedFilters.keyword && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                    ค้นหา: &quot;{appliedFilters.keyword}&quot;
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSingleFilter('keyword')}
                                        className="ml-1 hover:text-zinc-900"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}

                            {appliedFilters.lotNo && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900">
                                    Lot: {appliedFilters.lotNo}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSingleFilter('lotNo')}
                                        className="ml-1 hover:text-cyan-900"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}

                            {appliedFilters.serialNo && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900">
                                    SN: {appliedFilters.serialNo}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSingleFilter('serialNo')}
                                        className="ml-1 hover:text-indigo-900"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}

                            {appliedFilters.stockStatus !== 'ALL' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                                    สถานะ:{' '}
                                    {STOCK_STATUS_OPTIONS.find((s) => s.value === appliedFilters.stockStatus)?.label ||
                                        appliedFilters.stockStatus}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSingleFilter('stockStatus')}
                                        className="ml-1 hover:text-emerald-900"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}

                            <button
                                type="button"
                                onClick={handleResetFilter}
                                className="text-xs text-rose-600 hover:text-rose-700 font-medium ml-1"
                            >
                                ล้างทั้งหมด
                            </button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ─────────────────────────────────────────────────────────────
                2. Table Section (Table-Inventory)
               ───────────────────────────────────────────────────────────── */}
            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/40">
                    <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                            Table-Inventory (รายการสต็อกสินค้าคงคลัง)
                        </h2>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        พบทั้งหมด {totalRecords} รายการ
                    </span>
                </div>

                <CardContent className="p-0 w-full overflow-x-auto">
                    <Table className="w-full">
                        <TableHeader className="bg-zinc-100/80 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                            <TableRow>
                                {COLUMNS.map((col) => (
                                    <TableHead
                                        key={col.key}
                                        style={{ width: `${col.width}px` }}
                                        className={`font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 py-3.5 px-4 ${col.align || 'text-left'
                                            }`}
                                    >
                                        {col.colName}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>

                        <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {loading ? (
                                <TableRow key="loading-row">
                                    <TableCell colSpan={COLUMNS.length} className="h-48 text-center text-zinc-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-sm">กำลังโหลดข้อมูลสินค้าคงคลัง...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : displayInventoryList.length === 0 ? (
                                <TableRow key="empty-row">
                                    <TableCell colSpan={COLUMNS.length} className="h-48 text-center text-zinc-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Package className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                                ไม่พบข้อมูลสินค้าคงคลังที่ตรงกับเงื่อนไข
                                            </p>
                                            <p className="text-xs text-zinc-400">
                                                ลองปรับเปลี่ยนเงื่อนไขการค้นหาเพื่อค้นหาใหม่อีกครั้ง
                                            </p>
                                            {hasActiveFilters && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleResetFilter}
                                                    className="mt-2 text-xs"
                                                >
                                                    ล้างเงื่อนไขการค้นหา
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                displayInventoryList.map((item, index) => {
                                    const qty = item.itemQty ?? 0;
                                    const price = item.itemPrice ?? 0;
                                    const totalVal = qty * price;
                                    const minAlert = item.minAlert ?? 5;

                                    return (
                                        <TableRow
                                            key={item.id ?? `inv-${index}`}
                                            className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group"
                                        >
                                            {/* รหัสสินค้า */}
                                            <TableCell className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                                                <span className="text-blue-600 dark:text-blue-400 group-hover:underline">
                                                    {item.itemCode || '-'}
                                                </span>
                                            </TableCell>

                                            {/* ชื่อสินค้า */}
                                            <TableCell className="py-3 px-4 text-sm font-medium text-zinc-800 dark:text-zinc-200 max-w-[240px] truncate" title={item.itemName}>
                                                {item.itemName || '-'}
                                            </TableCell>

                                            {/* คลังสินค้า */}
                                            <TableCell className="py-3 px-4 text-xs text-zinc-700 dark:text-zinc-300">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                    <WarehouseIcon className="w-3 h-3 text-blue-500" />
                                                    {item.warehouseName || '-'}
                                                </span>
                                            </TableCell>

                                            {/* ตำแหน่งจัดเก็บ */}
                                            <TableCell className="py-3 px-4 text-xs text-zinc-700 dark:text-zinc-300">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                                                    <MapPin className="w-3 h-3 text-purple-500" />
                                                    {item.locationName || '-'}
                                                </span>
                                            </TableCell>

                                            {/* Lot No. */}
                                            <TableCell className="py-3 px-4 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                                                {item.lotNo ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                                        <Tag className="w-3 h-3 text-zinc-400" />
                                                        {item.lotNo}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400">-</span>
                                                )}
                                            </TableCell>

                                            {/* Serial No. */}
                                            <TableCell className="py-3 px-4 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                                                {item.serialNo ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                                                        <Barcode className="w-3 h-3 text-indigo-400" />
                                                        {item.serialNo}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400">-</span>
                                                )}
                                            </TableCell>

                                            {/* วันที่ผลิต / วันที่หมดอายุ */}
                                            <TableCell className="py-3 px-4 text-xs text-zinc-500 dark:text-zinc-400">
                                                {item.expireDate ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-zinc-700 dark:text-zinc-300">
                                                            EXP: {item.expireDate.slice(0, 10)}
                                                        </span>
                                                        {item.mfgDate && (
                                                            <span className="text-zinc-400 text-[11px]">
                                                                MFG: {item.mfgDate.slice(0, 10)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : item.mfgDate ? (
                                                    <span>MFG: {item.mfgDate.slice(0, 10)}</span>
                                                ) : (
                                                    <span>-</span>
                                                )}
                                            </TableCell>

                                            {/* จำนวนคงเหลือ พร้อม Badge */}
                                            <TableCell className="py-3 px-4 text-right">
                                                {renderStockBadge(qty, minAlert)}
                                            </TableCell>

                                            {/* หน่วยนับ */}
                                            <TableCell className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-400">
                                                {item.uomName || 'ชิ้น'}
                                            </TableCell>

                                            {/* ราคาต่อหน่วย */}
                                            <TableCell className="py-3 px-4 text-right text-xs font-mono text-zinc-700 dark:text-zinc-300">
                                                ฿{price.toLocaleString()}
                                            </TableCell>

                                            {/* มูลค่ารวม */}
                                            <TableCell className="py-3 px-4 text-right text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                                                ฿{totalVal.toLocaleString()}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => router.push(`/transaction/receive/form?itemId=${item.itemId}`)}
                                                    className="h-8 px-2.5 rounded-lg border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                                    title="ย้ายสถานที่จัดเก็บ"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                                                    ย้ายสถานที่จัดเก็บ
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

                {/* ─────────────────────────────────────────────────────────────
                    3. Bottom Pagination Bar (เหมือนกับ receive/page.tsx)
                   ───────────────────────────────────────────────────────────── */}
                <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/60">
                    <TablePagination
                        currentPage={currentPage}
                        pageSize={pageSize}
                        totalItems={totalRecords}
                        filteredCount={totalRecords}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setCurrentPage(1);
                        }}
                        loading={loading}
                    />
                </div>
            </Card>
        </AppLayout>
    );
}
