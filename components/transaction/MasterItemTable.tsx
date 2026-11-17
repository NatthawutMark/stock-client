'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { masterService } from '@/app/_services/master';
import { extractList } from '@/lib/utils';
import type { MastItem, MastLocation, MastUom } from '@/lib/types';
import type { TransactionItem, MasterItemTableProps } from './types';
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui';
import { Plus, Trash2, Search, Package, X } from 'lucide-react';

let rowCounter = 0;
function generateRowId(itemId?: string | number) {
    rowCounter += 1;
    return `master-row-${itemId ?? 'item'}-${rowCounter}`;
}

const CONFIRMED_RECEIVE_STATUSES = [
    'confirm',
    'confirmed',
    'complete',
    'completed',
    'approve',
    'approved',
    'putaway',
    'receive',
    'received',
    'ยืนยัน',
    'ยืนยันเอกสาร',
    'รับแล้ว',
    'รับเข้าคลัง',
    'สำเร็จ',
    'เสร็จสิ้น',
    '4',
    '5',
];

export function MasterItemTable({
    items,
    onChange,
    warehouseId,
    readOnly = false,
    showPrice = true,
    showLotSerial = true,
    showLocation = true,
    showPutawayQty,
    statusCode,
    title = 'รายการสินค้า (Item List)',
    subtitle = 'เลือกสินค้าจากฐานข้อมูล Master เพื่อนำเข้าสู่ระบบ',
}: MasterItemTableProps) {
    const isShowPutawayQty = useMemo(() => {
        if (showPutawayQty !== undefined) return showPutawayQty;
        if (!statusCode) return false;
        return CONFIRMED_RECEIVE_STATUSES.includes(String(statusCode).trim().toLowerCase());
    }, [showPutawayQty, statusCode]);

    // ─────────────────────────────────────────────────────────────
    // 1. State ของหน้าจอและ Modal
    // ─────────────────────────────────────────────────────────────
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalSearch, setModalSearch] = useState('');
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

    const [masterItemList, setMasterItemList] = useState<MastItem[]>([]);
    const [loadingMaster, setLoadingMaster] = useState(false);

    const [locationList, setLocationList] = useState<MastLocation[]>([]);
    const [uomList, setUomList] = useState<MastUom[]>([]);

    // ─────────────────────────────────────────────────────────────
    // 2. โหลดข้อมูลตำแหน่งจัดเก็บ (Locations) และหน่วยนับ (UOMs)
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadHelperMasters = async () => {
            try {
                const [locRes, uomRes] = await Promise.all([
                    masterService.locations.list({
                        warehouseId: warehouseId ? String(warehouseId) : undefined,
                    }),
                    masterService.uoms.list(),
                ]);

                setLocationList(extractList<MastLocation>(locRes));
                setUomList(extractList<MastUom>(uomRes));
            } catch (err) {
                console.error('Failed to load locations or uoms from DB:', err);
                setLocationList([]);
                setUomList([]);
            }
        };

        loadHelperMasters();
    }, [warehouseId]);

    const filteredLocations = useMemo(() => {
        if (!warehouseId) return locationList;
        return locationList.filter((l) => String(l.warehouseId) === String(warehouseId));
    }, [locationList, warehouseId]);

    // ซิงค์ Location ของรายการในตารางเมื่อคลังเปลี่ยน ให้เป็น Location ของคลังใหม่
    useEffect(() => {
        if (filteredLocations.length === 0 || items.length === 0) return;

        const validLocIds = new Set(filteredLocations.map((l) => String(l.id)));
        let changed = false;

        const updated = items.map((item) => {
            if (!item.locationId || !validLocIds.has(String(item.locationId))) {
                changed = true;
                const defaultLoc = filteredLocations[0];
                return {
                    ...item,
                    locationId: defaultLoc?.id ?? '',
                    locationName: defaultLoc?.name || defaultLoc?.code || '',
                };
            }
            return item;
        });

        if (changed) {
            onChange(updated);
        }
    }, [filteredLocations]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─────────────────────────────────────────────────────────────
    // 3. โหลดรายการสินค้า Master จาก API เมื่อเปิด Modal
    // ─────────────────────────────────────────────────────────────
    const fetchMasterItems = useCallback(async () => {
        setLoadingMaster(true);
        try {
            const res = await masterService.items.list({ id: '', isActive: true });
            setMasterItemList(extractList<MastItem>(res));
        } catch (err) {
            console.error('Failed to load master items from DB:', err);
            setMasterItemList([]);
        } finally {
            setLoadingMaster(false);
        }
    }, []);

    const handleOpenAddModal = () => {
        setModalSearch('');
        setSelectedItemIds([]);
        fetchMasterItems();
        setIsAddModalOpen(true);
    };

    const filteredMasterItems = useMemo(() => {
        const q = modalSearch.trim().toLowerCase();
        if (!q) return masterItemList;
        return masterItemList.filter(
            (it) =>
                it.itemCode?.toLowerCase().includes(q) ||
                it.itemName?.toLowerCase().includes(q) ||
                it.brandName?.toLowerCase().includes(q)
        );
    }, [masterItemList, modalSearch]);

    const isAllFilteredSelected = useMemo(() => {
        if (filteredMasterItems.length === 0) return false;
        return filteredMasterItems.every(
            (item) => item.id !== undefined && selectedItemIds.includes(String(item.id))
        );
    }, [filteredMasterItems, selectedItemIds]);

    // ─────────────────────────────────────────────────────────────
    // 4. ฟังก์ชันจัดการตาราง (เพิ่ม / แก้ไข / ลบแถวสินค้า)
    // ─────────────────────────────────────────────────────────────
    const createTableRow = (masterItem: MastItem): TransactionItem => {
        const uom =
            uomList.find((u) => u.id === masterItem.uomId)?.name || masterItem.uomName || 'ชิ้น';
        const matchedLoc =
            filteredLocations.find((l) => String(l.id) === String(masterItem.locationId)) ||
            filteredLocations[0];
        const price = Number(masterItem.buyPrice || 0);

        return {
            id: generateRowId(masterItem.id),
            itemId: String(masterItem.id ?? ''),
            itemCode: masterItem.itemCode || '',
            itemName: masterItem.itemName || '',
            uomId: masterItem.uomId,
            uomName: uom,
            itemQty: 1,
            putawayQty: 0,
            itemPrice: price,
            totalPrice: price,
            lotNo: '',
            serialNo: '',
            isLotNo: Boolean(masterItem.isLotNo),
            isSerialNo: Boolean(masterItem.isSerialNo),
            locationId: matchedLoc?.id ?? '',
            locationName: matchedLoc?.name || matchedLoc?.code || '',
            remark: '',
        };
    };

    const addMasterItemsToTable = (masterItemsToAdd: MastItem[]) => {
        const nextItems = items.map((row) => ({ ...row }));

        for (const masterItem of masterItemsToAdd) {
            if (!masterItem.id) continue;
            const targetItemId = String(masterItem.id);
            const existingIndex = nextItems.findIndex(
                (row) => String(row.itemId) === targetItemId
            );

            if (existingIndex >= 0 && !masterItem.isLotNo && !masterItem.isSerialNo) {
                const existing = nextItems[existingIndex];
                const newQty = (Number(existing.itemQty) || 0) + 1;
                nextItems[existingIndex] = {
                    ...existing,
                    itemQty: newQty,
                    totalPrice: newQty * (Number(existing.itemPrice) || 0),
                };
            } else {
                nextItems.push(createTableRow(masterItem));
            }
        }

        onChange(nextItems);
    };

    const handleAddSelectedItems = () => {
        const toAdd = masterItemList.filter(
            (m) => m.id !== undefined && selectedItemIds.includes(String(m.id))
        );
        addMasterItemsToTable(toAdd);
        setIsAddModalOpen(false);
    };

    const handleAddSingleItem = (m: MastItem) => {
        addMasterItemsToTable([m]);
    };

    const handleUpdateRow = (
        id: string | number,
        fieldOrUpdates: keyof TransactionItem | Partial<TransactionItem>,
        value?: unknown
    ) => {
        const updated = items.map((item) => {
            if (item.id !== id) return item;

            const patch: Partial<TransactionItem> =
                typeof fieldOrUpdates === 'string'
                    ? { [fieldOrUpdates]: value }
                    : fieldOrUpdates;

            const updatedItem = { ...item, ...patch };

            if ('itemQty' in patch || 'itemPrice' in patch) {
                const q = Number(updatedItem.itemQty) || 0;
                const p = Number(updatedItem.itemPrice) || 0;
                updatedItem.totalPrice = q * p;
            }

            return updatedItem;
        });
        onChange(updated);
    };

    const handleDeleteRow = (id: string | number) => {
        onChange(items.filter((item) => item.id !== id));
    };

    // ─────────────────────────────────────────────────────────────
    // 5. สรุปยอดรวมท้ายตาราง
    // ─────────────────────────────────────────────────────────────
    const totalQty = useMemo(
        () => items.reduce((sum, item) => sum + (Number(item.itemQty) || 0), 0),
        [items]
    );

    const totalPutawayQty = useMemo(
        () => items.reduce((sum, item) => sum + (Number(item.putawayQty) || 0), 0),
        [items]
    );

    const grandTotal = useMemo(
        () => items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0),
        [items]
    );

    return (
        <Card className="w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
            {/* ส่วนหัวการ์ดตาราง */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-800/40">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                        <Package className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-2">
                            {title}
                            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                แหล่งข้อมูล: Master Catalog
                            </span>
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
                    </div>
                </div>

                {!readOnly && (
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {items.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onChange([])}
                                className="flex-1 sm:flex-none justify-center h-8 px-3 text-xs text-rose-600 hover:text-rose-700 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                ลบทั้งหมด
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={handleOpenAddModal}
                            className="flex-1 sm:flex-none justify-center h-8 px-3.5 text-xs font-medium text-white rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" />
                            เพิ่มรายการสินค้า (Add Item)
                        </Button>
                    </div>
                )}
            </div>

            {/* ส่วนแสดงตาราง */}
            <CardContent className="p-0">
                {/* Mobile Editable Item Cards */}
                <div className="md:hidden">
                    {items.length === 0 ? (
                        <div className="p-6 text-center text-zinc-400">
                            <div className="flex flex-col items-center justify-center gap-2.5">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                    <Package className="w-6 h-6" />
                                </div>
                                <p className="font-medium text-sm text-zinc-600 dark:text-zinc-300">
                                    ยังไม่มีรายการสินค้าในตาราง
                                </p>
                                <p className="text-xs text-zinc-400 max-w-sm">
                                    กดปุ่ม &quot;เพิ่มรายการสินค้า (Add Item)&quot; ด้านบนเพื่อค้นหาและเลือกสินค้าจาก Master Catalog
                                </p>
                                {!readOnly && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleOpenAddModal}
                                        className="mt-1 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1" />
                                        เพิ่มรายการแรก
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 space-y-3 bg-zinc-50/40 dark:bg-zinc-950/20">
                            {items.map((row, idx) => {
                                const rowTotal = row.totalPrice || row.itemQty * (row.itemPrice || 0);
                                return (
                                    <div
                                        key={`mobile-${row.id}`}
                                        className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-3 shadow-xs"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-mono text-zinc-500">
                                                        #{idx + 1}
                                                    </span>
                                                    <span className="font-mono font-semibold text-xs text-blue-600 dark:text-blue-400">
                                                        {row.itemCode}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1 break-words">
                                                    {row.itemName}
                                                </h4>
                                            </div>
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRow(row.id)}
                                                    className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                                                    title="ลบรายการนี้"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {showLotSerial &&
                                            (readOnly ||
                                                row.isLotNo ||
                                                Boolean(row.lotNo) ||
                                                row.isSerialNo ||
                                                Boolean(row.serialNo)) && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                    <div>
                                                        <span className="block text-[11px] font-semibold text-zinc-500 mb-1">
                                                            Lot No.
                                                        </span>
                                                        {readOnly ? (
                                                            <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                                                                {row.lotNo || '-'}
                                                            </span>
                                                        ) : row.isLotNo || Boolean(row.lotNo) ? (
                                                            <input
                                                                type="text"
                                                                value={row.lotNo || ''}
                                                                onChange={(e) =>
                                                                    handleUpdateRow(row.id, 'lotNo', e.target.value)
                                                                }
                                                                placeholder="Lot No..."
                                                                className="w-full h-9 px-2.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                                                            />
                                                        ) : (
                                                            <span className="text-xs text-zinc-400">-</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="block text-[11px] font-semibold text-zinc-500 mb-1">
                                                            Serial No.
                                                        </span>
                                                        {readOnly ? (
                                                            <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                                                                {row.serialNo || '-'}
                                                            </span>
                                                        ) : row.isSerialNo || Boolean(row.serialNo) ? (
                                                            <input
                                                                type="text"
                                                                value={row.serialNo || ''}
                                                                onChange={(e) =>
                                                                    handleUpdateRow(row.id, 'serialNo', e.target.value)
                                                                }
                                                                placeholder="Serial No..."
                                                                className="w-full h-9 px-2.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                                                            />
                                                        ) : (
                                                            <span className="text-xs text-zinc-400">-</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <span className="block text-[11px] font-semibold text-zinc-500 mb-1">
                                                    จำนวนรับ ({row.uomName || 'ชิ้น'})
                                                </span>
                                                {readOnly ? (
                                                    <span className="font-bold font-mono text-sm text-zinc-900 dark:text-zinc-100">
                                                        {row.itemQty.toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={row.itemQty}
                                                        onChange={(e) =>
                                                            handleUpdateRow(
                                                                row.id,
                                                                'itemQty',
                                                                Math.max(1, Number(e.target.value) || 0)
                                                            )
                                                        }
                                                        className="w-full h-9 px-2.5 text-right text-xs font-bold font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                )}
                                            </div>

                                            {showPrice && (
                                                <div>
                                                    <span className="block text-[11px] font-semibold text-zinc-500 mb-1">
                                                        ราคา/หน่วย
                                                    </span>
                                                    {readOnly ? (
                                                        <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                                                            {(row.itemPrice || 0).toLocaleString(undefined, {
                                                                minimumFractionDigits: 2,
                                                            })}
                                                        </span>
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step="0.01"
                                                            value={row.itemPrice ?? 0}
                                                            onChange={(e) =>
                                                                handleUpdateRow(
                                                                    row.id,
                                                                    'itemPrice',
                                                                    Math.max(0, Number(e.target.value) || 0)
                                                                )
                                                            }
                                                            className="w-full h-9 px-2.5 text-right text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {isShowPutawayQty && (
                                                <div className="col-span-2 flex items-center justify-between rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 px-2.5 py-1.5 text-xs">
                                                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                                        จำนวนที่รับเข้าคลังแล้ว
                                                    </span>
                                                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                                        {(row.putawayQty ?? 0).toLocaleString()} {row.uomName || 'ชิ้น'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {showLocation && (
                                            <div>
                                                <span className="block text-[11px] font-semibold text-zinc-500 mb-1">
                                                    จัดเก็บเข้าตำแหน่ง
                                                </span>
                                                {readOnly ? (
                                                    <span className="text-xs text-zinc-700 dark:text-zinc-300">
                                                        {row.locationName || '-'}
                                                    </span>
                                                ) : (
                                                    <select
                                                        value={row.locationId ? String(row.locationId) : ''}
                                                        onChange={(e) => {
                                                            const locId = e.target.value;
                                                            const loc =
                                                                filteredLocations.find(
                                                                    (l) => String(l.id) === locId
                                                                ) || locationList.find((l) => String(l.id) === locId);
                                                            handleUpdateRow(row.id, {
                                                                locationId: locId,
                                                                locationName: loc?.name || loc?.code || '',
                                                            });
                                                        }}
                                                        className="w-full h-9 px-2.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        <option value="">-- เลือกตำแหน่ง --</option>
                                                        {filteredLocations.map((loc) => (
                                                            <option key={loc.id} value={String(loc.id)}>
                                                                {loc.name || loc.code}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                                            <span className="inline-block px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                                หน่วย: {row.uomName || 'ชิ้น'}
                                            </span>
                                            {showPrice && (
                                                <span className="font-bold font-mono text-sm text-blue-600 dark:text-blue-400">
                                                    รวม{' '}
                                                    {rowTotal.toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                    })}{' '}
                                                    ฿
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <Table className="w-full text-sm">
                    <TableHeader className="bg-zinc-100/80 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                        <TableRow>
                            <TableHead className="w-[50px] text-center font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                #
                            </TableHead>
                            <TableHead className="w-[140px] text-left font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                รหัสสินค้า
                            </TableHead>
                            <TableHead className="min-w-[200px] text-left font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                ชื่อสินค้า
                            </TableHead>
                            {showLotSerial && (
                                <>
                                    <TableHead className="w-[140px] text-left font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                        Lot No.
                                    </TableHead>
                                    <TableHead className="w-[140px] text-left font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                        Serial No.
                                    </TableHead>
                                </>
                            )}
                            <TableHead className="w-[110px] text-right font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                จำนวนรับ
                            </TableHead>
                            {isShowPutawayQty && (
                                <TableHead className="w-[130px] text-right font-bold text-xs uppercase text-emerald-700 dark:text-emerald-400 py-3">
                                    จำนวนที่รับเข้า
                                </TableHead>
                            )}
                            <TableHead className="w-[90px] text-center font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                หน่วยนับ
                            </TableHead>
                            {showLocation && (
                                <TableHead className="w-[160px] text-left font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                    จัดเก็บเข้าตำแหน่ง
                                </TableHead>
                            )}
                            {showPrice && (
                                <>
                                    <TableHead className="w-[120px] text-right font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                        ราคา/หน่วย
                                    </TableHead>
                                    <TableHead className="w-[120px] text-right font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                        รวมเงิน
                                    </TableHead>
                                </>
                            )}
                            {!readOnly && (
                                <TableHead className="w-[70px] text-center font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                    จัดการ
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {items.length === 0 ? (
                            <TableRow key="empty">
                                <TableCell
                                    colSpan={
                                        5 +
                                        (showLotSerial ? 2 : 0) +
                                        (isShowPutawayQty ? 1 : 0) +
                                        (showLocation ? 1 : 0) +
                                        (showPrice ? 2 : 0) +
                                        (!readOnly ? 1 : 0)
                                    }
                                    className="h-44 text-center text-zinc-400 py-8"
                                >
                                    <div className="flex flex-col items-center justify-center gap-2.5">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                            <Package className="w-6 h-6" />
                                        </div>
                                        <p className="font-medium text-sm text-zinc-600 dark:text-zinc-300">
                                            ยังไม่มีรายการสินค้าในตาราง
                                        </p>
                                        <p className="text-xs text-zinc-400 max-w-sm">
                                            กดปุ่ม &quot;เพิ่มรายการสินค้า (Add Item)&quot; ด้านบนเพื่อค้นหาและเลือกสินค้าจาก Master Catalog
                                        </p>
                                        {!readOnly && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleOpenAddModal}
                                                className="mt-1 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                เพิ่มรายการแรก
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((row, idx) => (
                                <TableRow
                                    key={row.id}
                                    className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                                >
                                    <TableCell className="text-center font-mono text-xs text-zinc-400 py-2.5">
                                        {idx + 1}
                                    </TableCell>

                                    <TableCell className="font-mono font-medium text-xs text-blue-600 dark:text-blue-400 py-2.5">
                                        {row.itemCode}
                                    </TableCell>

                                    <TableCell className="font-medium text-zinc-800 dark:text-zinc-200 py-2.5">
                                        {row.itemName}
                                    </TableCell>

                                    {showLotSerial && (
                                        <>
                                            <TableCell className="py-2.5">
                                                {readOnly ? (
                                                    <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                                                        {row.lotNo || '-'}
                                                    </span>
                                                ) : row.isLotNo || Boolean(row.lotNo) ? (
                                                    <input
                                                        type="text"
                                                        value={row.lotNo || ''}
                                                        onChange={(e) =>
                                                            handleUpdateRow(row.id, 'lotNo', e.target.value)
                                                        }
                                                        placeholder="Lot No..."
                                                        className="w-full h-8 px-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                                                    />
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                {readOnly ? (
                                                    <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                                                        {row.serialNo || '-'}
                                                    </span>
                                                ) : row.isSerialNo || Boolean(row.serialNo) ? (
                                                    <input
                                                        type="text"
                                                        value={row.serialNo || ''}
                                                        onChange={(e) =>
                                                            handleUpdateRow(row.id, 'serialNo', e.target.value)
                                                        }
                                                        placeholder="Serial No..."
                                                        className="w-full h-8 px-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                                                    />
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                        </>
                                    )}

                                    <TableCell className="text-right py-2.5">
                                        {readOnly ? (
                                            <span className="font-bold font-mono text-xs text-zinc-900 dark:text-zinc-100">
                                                {row.itemQty.toLocaleString()}
                                            </span>
                                        ) : (
                                            <input
                                                type="number"
                                                min={1}
                                                value={row.itemQty}
                                                onChange={(e) =>
                                                    handleUpdateRow(
                                                        row.id,
                                                        'itemQty',
                                                        Math.max(1, Number(e.target.value) || 0)
                                                    )
                                                }
                                                className="w-20 h-8 px-2 text-right text-xs font-bold font-mono rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        )}
                                    </TableCell>

                                    {isShowPutawayQty && (
                                        <TableCell className="text-right py-2.5">
                                            <span className="font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400">
                                                {(row.putawayQty ?? 0).toLocaleString()}
                                            </span>
                                        </TableCell>
                                    )}

                                    <TableCell className="text-center py-2.5">
                                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                            {row.uomName || 'ชิ้น'}
                                        </span>
                                    </TableCell>

                                    {showLocation && (
                                        <TableCell className="py-2.5">
                                            {readOnly ? (
                                                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                                    {row.locationName || '-'}
                                                </span>
                                            ) : (
                                                <select
                                                    value={row.locationId ? String(row.locationId) : ''}
                                                    onChange={(e) => {
                                                        const locId = e.target.value;
                                                        const loc =
                                                            filteredLocations.find((l) => String(l.id) === locId) ||
                                                            locationList.find((l) => String(l.id) === locId);
                                                        handleUpdateRow(row.id, {
                                                            locationId: locId,
                                                            locationName: loc?.name || loc?.code || '',
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    <option value="">-- เลือกตำแหน่ง --</option>
                                                    {filteredLocations.map((loc) => (
                                                        <option key={loc.id} value={String(loc.id)}>
                                                            {loc.name || loc.code}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </TableCell>
                                    )}

                                    {showPrice && (
                                        <TableCell className="text-right py-2.5">
                                            {readOnly ? (
                                                <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                                                    {(row.itemPrice || 0).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                </span>
                                            ) : (
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={row.itemPrice ?? 0}
                                                    onChange={(e) =>
                                                        handleUpdateRow(
                                                            row.id,
                                                            'itemPrice',
                                                            Math.max(0, Number(e.target.value) || 0)
                                                        )
                                                    }
                                                    className="w-24 h-8 px-2 text-right text-xs font-mono rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            )}
                                        </TableCell>
                                    )}

                                    {showPrice && (
                                        <TableCell className="text-right py-2.5 font-bold font-mono text-xs text-zinc-900 dark:text-zinc-100">
                                            {(row.totalPrice || row.itemQty * (row.itemPrice || 0)).toLocaleString(
                                                undefined,
                                                { minimumFractionDigits: 2 }
                                            )}
                                        </TableCell>
                                    )}

                                    {!readOnly && (
                                        <TableCell className="text-center py-2.5">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteRow(row.id)}
                                                className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                                title="ลบรายการนี้"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                </div>
            </CardContent>

            {/* ส่วนท้ายสรุปยอดรวม (Summary Footer) */}
            {items.length > 0 && (
                <div className="px-4 sm:px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>
                            รวม <strong className="text-zinc-900 dark:text-zinc-100 font-mono text-sm">{items.length}</strong> รายการ
                        </span>
                        <span>
                            จำนวนรวม{' '}
                            <strong className="text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                                {totalQty.toLocaleString()}
                            </strong>{' '}
                            ชิ้น
                        </span>
                        {isShowPutawayQty && (
                            <span>
                                จำนวนที่รับเข้ารวม{' '}
                                <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                                    {totalPutawayQty.toLocaleString()}
                                </strong>{' '}
                                ชิ้น
                            </span>
                        )}
                    </div>

                    {showPrice && (
                        <div className="flex items-center gap-2">
                            <span>ยอดรวมทั้งหมด:</span>
                            <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                                {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: หน้าต่างเลือกสินค้าจาก Master Catalog */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-4xl p-4 sm:p-6 max-h-[90dvh] overflow-y-auto overscroll-contain bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <DialogHeader className="pr-8">
                        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            <Package className="w-5 h-5 text-blue-600 shrink-0" />
                            เลือกสินค้าจาก Master Catalog
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-2 space-y-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                value={modalSearch}
                                onChange={(e) => setModalSearch(e.target.value)}
                                placeholder="ค้นหารหัสสินค้า, ชื่อสินค้า, แบรนด์..."
                                className="w-full h-10 pl-9 pr-9 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {modalSearch && (
                                <button
                                    type="button"
                                    onClick={() => setModalSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="max-h-80 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                            {/* Mobile Item Selector Cards */}
                            <div className="md:hidden">
                                {loadingMaster ? (
                                    <div className="h-32 flex items-center justify-center text-zinc-500 text-xs">
                                        กำลังโหลดข้อมูล Master Items...
                                    </div>
                                ) : filteredMasterItems.length === 0 ? (
                                    <div className="h-32 flex items-center justify-center text-zinc-400 text-xs">
                                        ไม่พบข้อมูลสินค้าที่ค้นหา
                                    </div>
                                ) : (
                                    <>
                                        <div className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs">
                                            <label className="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isAllFilteredSelected}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            const ids = filteredMasterItems
                                                                .map((i) => (i.id !== undefined ? String(i.id) : null))
                                                                .filter((id): id is string => id !== null);
                                                            setSelectedItemIds((prev) => Array.from(new Set([...prev, ...ids])));
                                                        } else {
                                                            const filteredIds = new Set(
                                                                filteredMasterItems.map((i) => String(i.id))
                                                            );
                                                            setSelectedItemIds((prev) => prev.filter((id) => !filteredIds.has(id)));
                                                        }
                                                    }}
                                                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                                เลือกทั้งหมด ({filteredMasterItems.length})
                                            </label>
                                        </div>
                                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                            {filteredMasterItems.map((item) => {
                                                if (item.id === undefined) return null;
                                                const itemId = String(item.id);
                                                const isSelected = selectedItemIds.includes(itemId);
                                                const isAlreadyAdded = items.some((it) => String(it.itemId) === itemId);

                                                return (
                                                    <div
                                                        key={`modal-card-${itemId}`}
                                                        onClick={() => {
                                                            setSelectedItemIds((prev) =>
                                                                isSelected
                                                                    ? prev.filter((id) => id !== itemId)
                                                                    : [...prev, itemId]
                                                            );
                                                        }}
                                                        className={`p-3 flex items-start gap-2.5 cursor-pointer transition-colors ${
                                                            isSelected
                                                                ? 'bg-blue-50/60 dark:bg-blue-950/30'
                                                                : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => {
                                                                setSelectedItemIds((prev) =>
                                                                    e.target.checked
                                                                        ? [...prev, itemId]
                                                                        : prev.filter((id) => id !== itemId)
                                                                );
                                                            }}
                                                            className="mt-1 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                                        />
                                                        <div className="min-w-0 flex-1 space-y-1">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-mono text-xs font-semibold text-blue-600">
                                                                    {item.itemCode}
                                                                </span>
                                                                {isAlreadyAdded && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                                                        เพิ่มแล้ว
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 break-words">
                                                                {item.itemName}
                                                            </p>
                                                            <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                                                                <span className="truncate">{item.brandName || '-'}</span>
                                                                <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">
                                                                    {(item.buyPrice || 0).toLocaleString()} ฿
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAddSingleItem(item);
                                                            }}
                                                            className="h-8 px-2.5 text-xs text-blue-600 hover:bg-blue-50 border-blue-200 shrink-0"
                                                            title="เพิ่มรายการนี้ทันที"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden md:block">
                                <Table>
                                <TableHeader className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                                    <TableRow>
                                        <TableHead className="w-10 text-center py-2.5">
                                            <input
                                                type="checkbox"
                                                checked={isAllFilteredSelected}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        const ids = filteredMasterItems
                                                            .map((i) => (i.id !== undefined ? String(i.id) : null))
                                                            .filter((id): id is string => id !== null);
                                                        setSelectedItemIds((prev) => Array.from(new Set([...prev, ...ids])));
                                                    } else {
                                                        const filteredIds = new Set(
                                                            filteredMasterItems.map((i) => String(i.id))
                                                        );
                                                        setSelectedItemIds((prev) => prev.filter((id) => !filteredIds.has(id)));
                                                    }
                                                }}
                                                className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </TableHead>
                                        <TableHead className="w-32 py-2.5 text-xs font-semibold">รหัสสินค้า</TableHead>
                                        <TableHead className="py-2.5 text-xs font-semibold">ชื่อสินค้า</TableHead>
                                        <TableHead className="w-28 py-2.5 text-xs font-semibold">แบรนด์</TableHead>
                                        <TableHead className="w-24 text-right py-2.5 text-xs font-semibold">ราคาซื้อ</TableHead>
                                        <TableHead className="w-20 text-center py-2.5 text-xs font-semibold">เพิ่ม</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {loadingMaster ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                                                กำลังโหลดข้อมูล Master Items...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredMasterItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-zinc-400 text-xs">
                                                ไม่พบข้อมูลสินค้าที่ค้นหา
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredMasterItems.map((item) => {
                                            if (item.id === undefined) return null;
                                            const itemId = String(item.id);
                                            const isSelected = selectedItemIds.includes(itemId);
                                            const isAlreadyAdded = items.some((it) => String(it.itemId) === itemId);

                                            return (
                                                <TableRow
                                                    key={itemId}
                                                    className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors ${
                                                        isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                                                    }`}
                                                    onClick={() => {
                                                        setSelectedItemIds((prev) =>
                                                            isSelected
                                                                ? prev.filter((id) => id !== itemId)
                                                                : [...prev, itemId]
                                                        );
                                                    }}
                                                >
                                                    <TableCell
                                                        className="text-center py-2"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                setSelectedItemIds((prev) =>
                                                                    e.target.checked
                                                                        ? [...prev, itemId]
                                                                        : prev.filter((id) => id !== itemId)
                                                                );
                                                            }}
                                                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                    </TableCell>

                                                    <TableCell className="font-mono text-xs font-semibold text-blue-600 py-2">
                                                        {item.itemCode}
                                                    </TableCell>

                                                    <TableCell className="text-xs font-medium text-zinc-800 dark:text-zinc-200 py-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <span>{item.itemName}</span>
                                                            {isAlreadyAdded && (
                                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                                                    เพิ่มแล้ว
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-xs text-zinc-500 py-2">
                                                        {item.brandName || '-'}
                                                    </TableCell>

                                                    <TableCell className="text-right font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200 py-2">
                                                        {(item.buyPrice || 0).toLocaleString()} ฿
                                                    </TableCell>

                                                    <TableCell
                                                        className="text-center py-2"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleAddSingleItem(item)}
                                                            className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 border-blue-200"
                                                            title="เพิ่มรายการนี้ทันที"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:-mx-6 sm:-mb-6 sm:px-6">
                        <span className="text-xs text-zinc-500 text-center sm:text-left">
                            เลือกแล้ว <strong className="text-blue-600">{selectedItemIds.length}</strong> รายการ
                        </span>
                        <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
                            <Button
                                variant="outline"
                                onClick={() => setIsAddModalOpen(false)}
                                className="w-full sm:w-auto text-xs"
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                onClick={handleAddSelectedItems}
                                disabled={selectedItemIds.length === 0}
                                className="w-full sm:w-auto text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                เพิ่มรายการที่เลือก ({selectedItemIds.length})
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

export default MasterItemTable;
