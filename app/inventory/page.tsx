'use client';

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { inventoryService, type InventoryListParams } from '@/app/_services/inventory';
import { masterService } from '@/app/_services/master';
import { getField, extractList, extractTotal } from '@/lib/utils';
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
import Swal from 'sweetalert2';

// ─────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────
export type StockStatus = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'HAS_LOT' | 'HAS_SERIAL';

export interface ExtendedInventoryItem extends InventoryView {
    minAlert?: number;
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

const INPUT_CLASS =
    'w-full h-10 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 shadow-sm';

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
        <div className="flex flex-col space-y-1.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
                <Label htmlFor={id} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
                    {label}
                </Label>
                <span className="text-xs text-zinc-400 truncate">{subLabel}</span>
            </div>
            {children}
        </div>
    );
}

export default function InventoryPage() {
    const router = useRouter();
    const { pageTitle } = useLayout();

    // 1. Filter States
    const [warehouseIdInput, setWarehouseIdInput] = useState<string>('');
    const [locationIdInput, setLocationIdInput] = useState<string>('');
    const [itemIdInput, setItemIdInput] = useState<string>('');
    const [keywordInput, setKeywordInput] = useState<string>('');
    const [lotNoInput, setLotNoInput] = useState<string>('');
    const [serialNoInput, setSerialNoInput] = useState<string>('');

    const [appliedFilters, setAppliedFilters] = useState<InventoryFilters>(initialFilters);

    // Master Dropdown Data
    const [warehouseList, setWarehouseList] = useState<MastWarehouse[]>([]);
    const [locationList, setLocationList] = useState<MastLocation[]>([]);
    const [itemList, setItemList] = useState<MastItem[]>([]);
    const [uomList, setUomList] = useState<MastUom[]>([]);

    // Inventory Data
    const [inventoryList, setInventoryList] = useState<InventoryView[]>([]);
    const [allInventoryList, setAllInventoryList] = useState<InventoryView[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingStats, setLoadingStats] = useState<boolean>(true);

    // Pagination States
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [totalRecords, setTotalRecords] = useState<number>(0);

    // 2. โหลด Master Data สำหรับ Dropdowns
    useEffect(() => {
        const loadMasters = async () => {
            try {
                const [whRes, locRes, itemRes, uomRes] = await Promise.all([
                    masterService.warehouses.list(),
                    masterService.locations.list(),
                    masterService.items.list(),
                    masterService.uoms.list(),
                ]);

                setWarehouseList(extractList<MastWarehouse>(whRes));
                setLocationList(extractList<MastLocation>(locRes));
                setItemList(extractList<MastItem>(itemRes));
                setUomList(extractList<MastUom>(uomRes));
            } catch (err) {
                console.error('Failed to load masters:', err);
            }
        };

        loadMasters();
    }, []);

    // 3. Dynamic Dropdown Options
    const warehouseOptions = useMemo<SearchableSelectOption[]>(
        () =>
            warehouseList.map((wh) => ({
                value: String(wh.id),
                label: `${wh.code ? `[${wh.code}] ` : ''}${wh.warehouseName || wh.description || `คลัง #${wh.id}`}`,
                subLabel: wh.description && wh.description !== wh.warehouseName ? wh.description : undefined,
            })),
        [warehouseList]
    );

    const locationOptions = useMemo<SearchableSelectOption[]>(() => {
        const filteredLocations = warehouseIdInput
            ? locationList.filter((loc) => String(loc.warehouseId || '') === String(warehouseIdInput))
            : locationList;

        return filteredLocations.map((loc) => ({
            value: String(loc.id),
            label: `${loc.code ? `[${loc.code}] ` : ''}${loc.name || `ตำแหน่ง #${loc.id}`}`,
            subLabel: loc.warehouseId
                ? `คลัง: ${
                      warehouseList.find((w) => String(w.id) === String(loc.warehouseId))?.warehouseName ||
                      loc.warehouseId
                  }`
                : undefined,
        }));
    }, [locationList, warehouseIdInput, warehouseList]);

    const handleWarehouseChange = (whId: string) => {
        setWarehouseIdInput(whId);
        if (whId) {
            const isValidLocation = locationList.some(
                (loc) =>
                    String(loc.id) === String(locationIdInput) &&
                    String(loc.warehouseId || '') === String(whId)
            );
            if (!isValidLocation) {
                setLocationIdInput('');
            }
        }
    };

    const itemOptions = useMemo<SearchableSelectOption[]>(
        () =>
            itemList.map((item) => ({
                value: String(item.id),
                label: `${item.itemCode ? `[${item.itemCode}] ` : ''}${item.itemName || `สินค้า #${item.id}`}`,
                subLabel: item.buyPrice ? `ราคาต้นทุน: ฿${item.buyPrice.toLocaleString()}` : undefined,
            })),
        [itemList]
    );

    // 4. โหลดข้อมูลสินค้าคงคลังสำหรับตาราง
    const fetchInventory = useCallback(async () => {
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
                setInventoryList([]);
                setTotalRecords(0);
                return;
            }

            const data = extractList<InventoryView>(res);

            if (data.length > pageSize) {
                const start = (currentPage - 1) * pageSize;
                setTotalRecords(data.length);
                setInventoryList(data.slice(start, start + pageSize));
                return;
            }

            setInventoryList(data);
            const total = extractTotal(res);
            setTotalRecords(
                total !== undefined
                    ? total
                    : data.length === pageSize
                        ? currentPage * pageSize + 1
                        : (currentPage - 1) * pageSize + data.length
            );
        } catch (error) {
            console.error('Fetch inventory list failed:', error);
            setInventoryList([]);
            setTotalRecords(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, appliedFilters]);

    // 5. โหลดข้อมูลสินค้าคงคลังทั้งหมดสำหรับคำนวณ KPI Stats
    const fetchInventoryAll = useCallback(async () => {
        setLoadingStats(true);
        try {
            const res = await inventoryService.listAll({});
            setAllInventoryList(res?.success ? extractList<InventoryView>(res) : []);
        } catch (error) {
            console.error('Fetch all inventory for stats failed:', error);
            setAllInventoryList([]);
        } finally {
            setLoadingStats(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchInventory();
    }, [fetchInventory]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchInventoryAll();
    }, [fetchInventoryAll]);

    // 6. ซิงค์ชื่อ Master Data กับรายการสินค้าในตาราง
    const displayInventoryList = useMemo<ExtendedInventoryItem[]>(() => {
        return inventoryList.map((inv) => {
            const raw = inv as unknown as Record<string, unknown>;
            const itemId = getField<number | string>(raw, 'itemId', 'item_id', 'itemCode');
            const matchedItem = itemList.find(
                (it) => String(it.id) === String(itemId) || String(it.itemCode) === String(itemId)
            );

            const whId = getField<number | string>(raw, 'warehouseId', 'warehouse_id');
            const matchedWh = warehouseList.find((w) => String(w.id) === String(whId));

            const locId = getField<number | string>(raw, 'locationId', 'location_id');
            const matchedLoc = locationList.find((l) => String(l.id) === String(locId));

            const uomId = matchedItem?.uomId || getField<number | string>(raw, 'uomId', 'uom_id');
            const matchedUom = uomList.find((u) => String(u.id) === String(uomId));

            const itemQty = Number(getField<number>(raw, 'itemQty', 'item_qty', 'qty', 'quantity') ?? 0);
            const itemPrice = Number(
                getField<number>(raw, 'itemPrice', 'item_price', 'price', 'buyPrice') ??
                    matchedItem?.buyPrice ??
                    0
            );

            return {
                ...inv,
                id: String(getField<string>(raw, 'id') ?? ''),
                itemId: String(itemId || ''),
                itemCode: String(
                    getField<string>(raw, 'itemCode', 'item_code') ||
                        matchedItem?.itemCode ||
                        `ITM-${itemId || '-'}`
                ),
                itemName: String(
                    getField<string>(raw, 'itemName', 'item_name') ||
                        matchedItem?.itemName ||
                        `สินค้า #${itemId || '-'}`
                ),
                warehouseId: String(whId || ''),
                warehouseName: String(
                    getField<string>(raw, 'warehouseName', 'warehouse_name') ||
                        matchedWh?.warehouseName ||
                        `คลัง #${whId || '-'}`
                ),
                locationId: String(locId || ''),
                locationName: String(
                    getField<string>(raw, 'locationName', 'location_name') ||
                        matchedLoc?.name ||
                        matchedLoc?.code ||
                        `ตำแหน่ง #${locId || '-'}`
                ),
                uomName: String(
                    getField<string>(raw, 'uomName', 'uom_name') || matchedUom?.name || 'ชิ้น'
                ),
                lotNo: String(getField<string>(raw, 'lotNo', 'lot_no', 'lot') || ''),
                serialNo: String(getField<string>(raw, 'serialNo', 'serial_no', 'serial') || ''),
                itemQty,
                itemPrice,
                mfgDate: String(getField<string>(raw, 'mfgDate', 'mfg_date') || ''),
                expireDate: String(getField<string>(raw, 'expireDate', 'expire_date', 'expDate') || ''),
                minAlert: matchedItem?.minAlert ?? 5,
            };
        });
    }, [inventoryList, itemList, warehouseList, locationList, uomList]);

    // 7. Actions & Handlers
    const handleSearch = () => {
        setAppliedFilters((prev) => ({
            ...prev,
            warehouseId: warehouseIdInput,
            locationId: locationIdInput,
            itemId: itemIdInput,
            keyword: keywordInput,
            lotNo: lotNoInput,
            serialNo: serialNoInput,
        }));
        setCurrentPage(1);
    };

    const handleResetFilter = () => {
        setWarehouseIdInput('');
        setLocationIdInput('');
        setItemIdInput('');
        setKeywordInput('');
        setLotNoInput('');
        setSerialNoInput('');
        setAppliedFilters({ ...initialFilters });
        setCurrentPage(1);
    };

    const handleQuickTabSelect = (status: StockStatus) => {
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

        setAppliedFilters((prev) => ({
            ...prev,
            [key]: resetVal,
        }));
        setCurrentPage(1);
    };

    // คำนวณสรุปข้อมูล KPI Dashboard จาก allInventoryList
    const stats = useMemo(() => {
        const totalItemsCount = allInventoryList.length;
        let totalStockQty = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let totalStockValue = 0;

        for (const inv of allInventoryList) {
            const raw = inv as unknown as Record<string, unknown>;
            const itemId = getField<number | string>(raw, 'itemId', 'item_id', 'itemCode');
            const matchedItem = itemList.find(
                (it) => String(it.id) === String(itemId) || String(it.itemCode) === String(itemId)
            );

            const itemQty = Number(getField<number>(raw, 'itemQty', 'item_qty', 'qty', 'quantity') ?? 0);
            const itemPrice = Number(
                getField<number>(raw, 'itemPrice', 'item_price', 'price', 'buyPrice') ??
                    matchedItem?.buyPrice ??
                    0
            );
            const minAlert = matchedItem?.minAlert ?? 5;

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
    }, [allInventoryList, itemList]);

    const hasActiveFilters = Boolean(
        appliedFilters.warehouseId ||
            appliedFilters.locationId ||
            appliedFilters.itemId ||
            appliedFilters.keyword ||
            appliedFilters.lotNo ||
            appliedFilters.serialNo ||
            appliedFilters.stockStatus !== 'ALL'
    );

    const handleAlert = () => {
        Swal.fire({
            icon: 'info',
            title: 'แจ้งเตือน',
            html: 'ระบบนี้ยังไม่พร้อมใช้งาน',
        });
    };

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
            {/* Page Header & Action Buttons */}
            <div className="mb-4 sm:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'สินค้าคงคลัง (Inventory Stock)'}
                    </h1>
                    <p className="text-xs sm:text-sm mt-1 text-zinc-500 dark:text-zinc-400">
                        ตรวจสอบยอดคงเหลือ ตำแหน่งจัดเก็บ Lot/Serial และสถานะสินค้าในคลัง (Inventory Management)
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => {
                            fetchInventory();
                            fetchInventoryAll();
                        }}
                        disabled={loading || loadingStats}
                        className="flex-1 sm:flex-none justify-center h-9 px-3 text-xs rounded-xl border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading || loadingStats ? 'animate-spin' : ''}`} />
                        รีเฟรชข้อมูล
                    </Button>
                    <Button
                        onClick={() => router.push('/transaction/receive/form')}
                        className="flex-1 sm:flex-none justify-center px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
                    >
                        <Package className="w-4 h-4" />
                        รับสินค้าเข้าสต็อก
                    </Button>
                </div>
            </div>

            {/* KPI Summary Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900">
                    <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                                รายการในสต็อก (SKUs)
                            </span>
                            <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                                {stats.totalItemsCount.toLocaleString()}
                                <span className="text-xs font-normal text-zinc-400 ml-1.5">รายการ</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Package className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900">
                    <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                                ยอดคงเหลือรวม (Total Qty)
                            </span>
                            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                {stats.totalStockQty.toLocaleString()}
                                <span className="text-xs font-normal text-zinc-400 ml-1.5">ชิ้น</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Boxes className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900">
                    <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                                แจ้งเตือนสต็อก (Alerts)
                            </span>
                            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mt-1">
                                <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {stats.lowStockCount}
                                </span>
                                <span className="text-xs text-zinc-400">ใกล้หมด /</span>
                                <span className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
                                    {stats.outOfStockCount}
                                </span>
                                <span className="text-xs text-zinc-400">หมดสต็อก</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900">
                    <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                                มูลค่าสินค้าคงคลัง (Total Value)
                            </span>
                            <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1 truncate">
                                ฿{stats.totalStockValue.toLocaleString()}
                            </div>
                        </div>
                        <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <Coins className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 1. Filter / Search Section */}
            <Card className="mb-6 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                            เงื่อนไขการค้นหาสินค้าคงคลัง (Dynamic Search & Filter)
                        </span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetFilter}
                            className="flex-1 sm:flex-none h-8 px-3 text-xs rounded-lg border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            ล้างค่า (Reset)
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSearch}
                            className="flex-1 sm:flex-none h-8 px-4 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        >
                            <Search className="w-3.5 h-3.5 mr-1" />
                            ค้นหา
                        </Button>
                    </div>
                </div>

                <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                    {/* Quick Filter Status Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-none">
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
                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                                        isActive
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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

                    {/* Active Filter Chips */}
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
                                    {locationList.find((l) => String(l.id) === String(appliedFilters.locationId))
                                        ?.name || appliedFilters.locationId}
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

            {/* 2. Table Section */}
            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-50/50 dark:bg-zinc-800/40">
                    <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <h2 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                            รายการสต็อกสินค้าคงคลัง (Inventory Stock List)
                        </h2>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        พบทั้งหมด {totalRecords} รายการ
                    </span>
                </div>

                <CardContent className="p-0 w-full">
                    {/* Mobile Card View */}
                    <div className="md:hidden">
                        {loading ? (
                            <div className="h-48 flex flex-col items-center justify-center gap-2 text-zinc-500 p-4">
                                <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm">กำลังโหลดข้อมูลสินค้าคงคลัง...</span>
                            </div>
                        ) : displayInventoryList.length === 0 ? (
                            <div className="h-48 flex flex-col items-center justify-center gap-2 text-zinc-500 p-6 text-center">
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
                        ) : (
                            <div className="p-3 space-y-3 bg-zinc-50/40 dark:bg-zinc-950/20">
                                {displayInventoryList.map((item, index) => {
                                    const qty = item.itemQty ?? 0;
                                    const price = item.itemPrice ?? 0;
                                    const totalVal = qty * price;
                                    const minAlert = item.minAlert ?? 5;

                                    return (
                                        <div
                                            key={item.id ?? `inv-card-${index}`}
                                            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-3 shadow-xs"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                                                        {item.itemCode || '-'}
                                                    </div>
                                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 break-words">
                                                        {item.itemName || '-'}
                                                    </h3>
                                                </div>
                                                <div className="shrink-0">
                                                    {renderStockBadge(qty, minAlert)}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs">
                                                <div>
                                                    <span className="block text-[11px] text-zinc-400">คงเหลือ</span>
                                                    <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
                                                        {qty.toLocaleString()}{' '}
                                                        <span className="font-sans font-normal text-zinc-500">
                                                            {item.uomName || 'ชิ้น'}
                                                        </span>
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-[11px] text-zinc-400">ราคา/หน่วย</span>
                                                    <span className="font-mono text-zinc-700 dark:text-zinc-300">
                                                        ฿{price.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-[11px] text-zinc-400">มูลค่ารวม</span>
                                                    <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
                                                        ฿{totalVal.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                    <WarehouseIcon className="w-3 h-3 text-blue-500 shrink-0" />
                                                    {item.warehouseName || '-'}
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                                                    <MapPin className="w-3 h-3 text-purple-500 shrink-0" />
                                                    {item.locationName || '-'}
                                                </span>
                                            </div>

                                            {(item.lotNo || item.serialNo || item.expireDate || item.mfgDate) && (
                                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                                                    {item.lotNo && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                                            <Tag className="w-3 h-3 text-zinc-400" />
                                                            Lot: {item.lotNo}
                                                        </span>
                                                    )}
                                                    {item.serialNo && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                                                            <Barcode className="w-3 h-3 text-indigo-400" />
                                                            SN: {item.serialNo}
                                                        </span>
                                                    )}
                                                    {item.expireDate && (
                                                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                                                            EXP: {item.expireDate.slice(0, 10)}
                                                        </span>
                                                    )}
                                                    {item.mfgDate && (
                                                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                                            MFG: {item.mfgDate.slice(0, 10)}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleAlert}
                                                    className="w-full h-9 px-3 text-xs rounded-lg border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                                                    ย้ายสถานที่จัดเก็บ
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table className="w-full">
                            <TableHeader className="bg-zinc-100/80 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                                <TableRow>
                                    {COLUMNS.map((col) => (
                                        <TableHead
                                            key={col.key}
                                            style={{ width: `${col.width}px` }}
                                            className={`font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 py-3.5 px-4 ${
                                                col.align || 'text-left'
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
                                                <TableCell className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                                                    <span className="text-blue-600 dark:text-blue-400 group-hover:underline">
                                                        {item.itemCode || '-'}
                                                    </span>
                                                </TableCell>

                                                <TableCell
                                                    className="py-3 px-4 text-sm font-medium text-zinc-800 dark:text-zinc-200 max-w-[240px] truncate"
                                                    title={item.itemName}
                                                >
                                                    {item.itemName || '-'}
                                                </TableCell>

                                                <TableCell className="py-3 px-4 text-xs text-zinc-700 dark:text-zinc-300">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                        <WarehouseIcon className="w-3 h-3 text-blue-500" />
                                                        {item.warehouseName || '-'}
                                                    </span>
                                                </TableCell>

                                                <TableCell className="py-3 px-4 text-xs text-zinc-700 dark:text-zinc-300">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                                                        <MapPin className="w-3 h-3 text-purple-500" />
                                                        {item.locationName || '-'}
                                                    </span>
                                                </TableCell>

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

                                                <TableCell className="py-3 px-4 text-right">
                                                    {renderStockBadge(qty, minAlert)}
                                                </TableCell>

                                                <TableCell className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-400">
                                                    {item.uomName || 'ชิ้น'}
                                                </TableCell>

                                                <TableCell className="py-3 px-4 text-right text-xs font-mono text-zinc-700 dark:text-zinc-300">
                                                    ฿{price.toLocaleString()}
                                                </TableCell>

                                                <TableCell className="py-3 px-4 text-right text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                                                    ฿{totalVal.toLocaleString()}
                                                </TableCell>

                                                <TableCell className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={handleAlert}
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
                    </div>
                </CardContent>

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
