'use client';

/**
 * ============================================================================
 * [TEMPLATE] InventoryItemTable: คอมโพเนนต์ตารางสินค้าสำหรับเอกสารประเภทตัด/โอนย้ายสต็อก (Outward / Movement)
 * ============================================================================
 * เหมาะสำหรับหน้า:
 * - เบิกจ่ายสินค้า (Goods Issue)
 * - โอนย้ายสินค้าระหว่างคลัง (Goods Transfer In / Out)
 * - ตัดจำหน่ายสินค้าชำรุด (Goods Disposal / Write-off)
 * - ปรับปรุงยอดสินค้าคงคลัง (Stock Adjustment)
 *
 * คุณลักษณะ:
 * - ดึงสินค้าจาก Current Inventory Stock (inventoryService.list({ warehouseId }))
 * - กรองสินค้าตามคลังสินค้า (warehouseId) อัตโนมัติ
 * - แสดง Lot No., Serial No., ตำแหน่งจัดเก็บ (Location) และยอดคงเหลือจริง (Available Qty)
 * - มีระบบแจ้งเตือนสีแดงทันทีเมื่อระบุจำนวนเกินสต็อกคงเหลือ (itemQty > availableQty)
 * - สามารถ Copy คอมโพเนนต์นี้ไปประยุกต์เป็นเอกสารหน้าอื่นๆ ได้ง่าย
 * ============================================================================
 */

import React, { useState, useMemo, useCallback } from 'react';
import { inventoryService } from '@/app/_services/inventory';
import { items as mockItems, inventories as mockInventories, locations as mockLocations, uoms as mockUoms } from '@/lib/mock/data';
import type { InventoryView } from '@/lib/types';
import type { TransactionItem, InventoryItemTableProps } from './types';
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
import {
    Plus,
    Trash2,
    Search,
    Warehouse,
    AlertTriangle,
} from 'lucide-react';

// ตัวสร้าง Unique Key ประจำแถวแบบปลอดภัย
let rowCounter = 0;
function generateRowId(invId: string | number) {
    rowCounter += 1;
    return `inv-row-${invId}-${rowCounter}`;
}

export function InventoryItemTable({
    items,
    onChange,
    warehouseId,
    readOnly = false,
    showPrice = true,
    showLotSerial = true,
    showLocation = true,
    title = 'รายการสินค้าจากคงคลัง (Inventory Stock)',
    subtitle = 'เลือกสินค้าและ Lot/Serial จากสินค้าคงคลังปัจจุบันเพื่อทำรายการ',
}: InventoryItemTableProps) {
    // ─────────────────────────────────────────────────────────────
    // 1. STATE MANAGEMENT
    // ─────────────────────────────────────────────────────────────
    // State สำหรับ Modal เลือกสินค้าในสต็อก
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalSearch, setModalSearch] = useState('');
    const [selectedInvIds, setSelectedInvIds] = useState<(string | number)[]>([]);

    // รายการสินค้าในสต็อกคงคลัง (Inventory)
    const [inventoryList, setInventoryList] = useState<InventoryView[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);

    // ─────────────────────────────────────────────────────────────
    // 2. โหลดรายการสินค้าจากคงคลัง (Inventory Stock)
    // ─────────────────────────────────────────────────────────────
    const fetchInventoryItems = useCallback(async () => {
        setLoadingInventory(true);
        try {
            const res = await inventoryService.list({
                warehouseId: warehouseId ? Number(warehouseId) : undefined,
            });

            if (res?.success && Array.isArray(res.results) && res.results.length > 0) {
                setInventoryList(res.results);
            } else {
                // Fallback Mock: กรองตามคลังสินค้าและประกอบชื่อสินค้า, UOM, Location
                const invs = warehouseId
                    ? mockInventories.filter((i) => String(i.warehouseId) === String(warehouseId))
                    : mockInventories;

                const enriched: InventoryView[] = invs.map((inv) => {
                    const m = mockItems.find((it) => it.id === inv.itemId);
                    const loc = mockLocations.find((l) => l.id === inv.locationId);
                    const u = mockUoms.find((uom) => uom.id === m?.uomId);
                    return {
                        ...inv,
                        itemCode: m?.itemCode || `ITM${inv.itemId}`,
                        itemName: m?.itemName || `สินค้า #${inv.itemId}`,
                        locationName: loc?.name || `Location ${inv.locationId}`,
                        uomName: u?.name || 'ชิ้น',
                    };
                });
                setInventoryList(enriched);
            }
        } catch {
            setInventoryList(mockInventories as unknown as InventoryView[]);
        } finally {
            setLoadingInventory(false);
        }
    }, [warehouseId]);

    // เมื่อกดปุ่ม "เพิ่มรายการสินค้า" -> เคลียร์ค่าค้นหา และดึงสต็อกล่าสุด
    const handleOpenAddModal = () => {
        setModalSearch('');
        setSelectedInvIds([]);
        fetchInventoryItems();
        setIsAddModalOpen(true);
    };

    // กรองสินค้าคงคลังใน Modal ตามคำค้นหา
    const filteredInventoryItems = useMemo(() => {
        const q = modalSearch.trim().toLowerCase();
        if (!q) return inventoryList;
        return inventoryList.filter(
            (inv) =>
                inv.itemCode?.toLowerCase().includes(q) ||
                inv.itemName?.toLowerCase().includes(q) ||
                inv.lotNo?.toLowerCase().includes(q) ||
                inv.serialNo?.toLowerCase().includes(q) ||
                inv.locationName?.toLowerCase().includes(q)
        );
    }, [inventoryList, modalSearch]);

    // ─────────────────────────────────────────────────────────────
    // 3. ฟังก์ชันเพิ่มสินค้าจากคงคลังเข้าตาราง (Add Items)
    // ─────────────────────────────────────────────────────────────
    // 3.1 เพิ่มหลายรายการพร้อมกันจาก Checkbox
    const handleAddSelectedItems = () => {
        const toAdd = inventoryList.filter((inv) => selectedInvIds.includes(inv.id));
        const newItems: TransactionItem[] = [...items];

        toAdd.forEach((inv) => {
            const price = Number(inv.itemPrice || 0);

            newItems.push({
                id: generateRowId(inv.id),
                itemId: inv.itemId,
                invId: inv.id,
                itemCode: inv.itemCode || `ITM${inv.itemId}`,
                itemName: inv.itemName || 'สินค้าในคลัง',
                uomName: inv.uomName || 'ชิ้น',
                itemQty: 1,
                availableQty: inv.itemQty,
                unitPrice: price,
                totalPrice: price * 1,
                lotNo: inv.lotNo || '',
                serialNo: inv.serialNo || '',
                locationId: inv.locationId,
                locationName: inv.locationName || '',
                remark: '',
            });
        });

        onChange(newItems);
        setIsAddModalOpen(false);
    };

    // 3.2 เพิ่มทันที 1 รายการจากการกดปุ่ม (+) ใน Modal
    const handleAddSingleItem = (inv: InventoryView) => {
        const price = Number(inv.itemPrice || 0);

        const newRow: TransactionItem = {
            id: generateRowId(inv.id),
            itemId: inv.itemId,
            invId: inv.id,
            itemCode: inv.itemCode || `ITM${inv.itemId}`,
            itemName: inv.itemName || 'สินค้าในคลัง',
            uomName: inv.uomName || 'ชิ้น',
            itemQty: 1,
            availableQty: inv.itemQty,
            unitPrice: price,
            totalPrice: price * 1,
            lotNo: inv.lotNo || '',
            serialNo: inv.serialNo || '',
            locationId: inv.locationId,
            locationName: inv.locationName || '',
            remark: '',
        };

        onChange([...items, newRow]);
    };

    // ─────────────────────────────────────────────────────────────
    // 4. ฟังก์ชันแก้ไขและลบแถวในตาราง
    // ─────────────────────────────────────────────────────────────
    const handleUpdateRow = (id: string | number, field: keyof TransactionItem, value: unknown) => {
        const updated = items.map((item) => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };

                // คำนวณราคารวมอัตโนมัติเมื่อจำนวนหรือราคาต่อหน่วยเปลี่ยน
                if (field === 'itemQty' || field === 'unitPrice') {
                    const q = field === 'itemQty' ? Number(value) : item.itemQty;
                    const p = field === 'unitPrice' ? Number(value) : (item.unitPrice || 0);
                    updatedItem.totalPrice = (Number.isNaN(q) ? 0 : q) * (Number.isNaN(p) ? 0 : p);
                }

                return updatedItem;
            }
            return item;
        });
        onChange(updated);
    };

    const handleDeleteRow = (id: string | number) => {
        onChange(items.filter((item) => item.id !== id));
    };

    // ─────────────────────────────────────────────────────────────
    // 5. สรุปยอดรวมท้ายตาราง
    // ─────────────────────────────────────────────────────────────
    const totalQty = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.itemQty) || 0), 0);
    }, [items]);

    const grandTotal = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    }, [items]);

    // ตรวจสอบว่ามีรายการใดระบุจำนวนเกินสต็อกหรือไม่
    const hasAnyQtyExceeded = useMemo(() => {
        return items.some(
            (it) => it.availableQty !== undefined && it.itemQty > it.availableQty
        );
    }, [items]);

    return (
        <Card className="w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
            {/* ── ส่วนหัวการ์ดตาราง ── */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-800/40">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Warehouse className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            {title}
                            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                แหล่งข้อมูล: สต็อกคงคลัง (Current Stock)
                            </span>
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
                    </div>
                </div>

                {!readOnly && (
                    <div className="flex items-center gap-2">
                        {items.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onChange([])}
                                className="h-8 px-3 text-xs text-rose-600 hover:text-rose-700 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                ลบทั้งหมด
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={handleOpenAddModal}
                            className="h-8 px-3.5 text-xs font-medium text-white rounded-lg shadow-sm bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" />
                            เลือกสินค้าจากสต็อก (Pick Stock)
                        </Button>
                    </div>
                )}
            </div>

            {/* แถบแจ้งเตือนหากมีจำนวนเกินสต็อก */}
            {hasAnyQtyExceeded && (
                <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800/60 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>มีบางรายการระบุจำนวนเกินกว่าสต็อกคงเหลือในคลัง กรุณาตรวจสอบก่อนบันทึกเอกสาร</span>
                </div>
            )}

            {/* ── ส่วนแสดงตาราง ── */}
            <CardContent className="p-0 overflow-x-auto">
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
                                    <TableHead className="w-[130px] text-left font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                        Lot No.
                                    </TableHead>
                                    <TableHead className="w-[130px] text-left font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                        Serial No.
                                    </TableHead>
                                </>
                            )}
                            <TableHead className="w-[100px] text-right font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                คงเหลือ
                            </TableHead>
                            <TableHead className="w-[110px] text-right font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                จำนวนทำรายการ
                            </TableHead>
                            <TableHead className="w-[90px] text-center font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                หน่วยนับ
                            </TableHead>
                            {showLocation && (
                                <TableHead className="w-[150px] text-left font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                    ตำแหน่งเก็บ
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
                            <TableHead className="min-w-[140px] text-left font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                หมายเหตุ
                            </TableHead>
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
                                        6 +
                                        (showLotSerial ? 2 : 0) +
                                        (showLocation ? 1 : 0) +
                                        (showPrice ? 2 : 0) +
                                        (!readOnly ? 1 : 0)
                                    }
                                    className="h-44 text-center text-zinc-400 py-8"
                                >
                                    <div className="flex flex-col items-center justify-center gap-2.5">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                            <Warehouse className="w-6 h-6" />
                                        </div>
                                        <p className="font-medium text-sm text-zinc-600 dark:text-zinc-300">
                                            ยังไม่มีรายการสินค้าในตาราง
                                        </p>
                                        <p className="text-xs text-zinc-400 max-w-sm">
                                            กดปุ่ม &quot;เลือกสินค้าจากสต็อก (Pick Stock)&quot; ด้านบนเพื่อค้นหาสินค้าและ Lot/Serial ที่มีอยู่ในคลัง
                                        </p>
                                        {!readOnly && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleOpenAddModal}
                                                className="mt-1 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                เลือกรายการสินค้า
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((row, idx) => {
                                const isQtyExceeded =
                                    row.availableQty !== undefined &&
                                    row.itemQty > row.availableQty;

                                return (
                                    <TableRow
                                        key={row.id}
                                        className={`hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors ${
                                            isQtyExceeded ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                                        }`}
                                    >
                                        {/* ลำดับ */}
                                        <TableCell className="text-center font-mono text-xs text-zinc-400 py-2.5">
                                            {idx + 1}
                                        </TableCell>

                                        {/* รหัสสินค้า */}
                                        <TableCell className="font-mono font-medium text-xs text-emerald-700 dark:text-emerald-400 py-2.5">
                                            {row.itemCode}
                                        </TableCell>

                                        {/* ชื่อสินค้า */}
                                        <TableCell className="font-medium text-zinc-800 dark:text-zinc-200 py-2.5">
                                            {row.itemName}
                                        </TableCell>

                                        {/* Lot / Serial (แสดงจากสต็อกจริง) */}
                                        {showLotSerial && (
                                            <>
                                                <TableCell className="py-2.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                                    {readOnly ? (
                                                        row.lotNo || '-'
                                                    ) : (
                                                        <span className="inline-block px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                                            {row.lotNo || '-'}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                                    {readOnly ? (
                                                        row.serialNo || '-'
                                                    ) : (
                                                        <span className="inline-block px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                                            {row.serialNo || '-'}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </>
                                        )}

                                        {/* คงเหลือ (Available Qty) */}
                                        <TableCell className="text-right py-2.5 font-mono text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                            {row.availableQty?.toLocaleString() ?? '-'}
                                        </TableCell>

                                        {/* จำนวนที่ทำรายการ */}
                                        <TableCell className="text-right py-2.5">
                                            {readOnly ? (
                                                <span className="font-bold font-mono text-xs text-zinc-900 dark:text-zinc-100">
                                                    {row.itemQty.toLocaleString()}
                                                </span>
                                            ) : (
                                                <div className="flex flex-col items-end">
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
                                                        className={`w-20 h-8 px-2 text-right text-xs font-bold font-mono rounded-md border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 ${
                                                            isQtyExceeded
                                                                ? 'border-red-500 focus:ring-red-500 text-red-600'
                                                                : 'border-zinc-200 dark:border-zinc-700 focus:ring-emerald-500'
                                                        }`}
                                                    />
                                                    {isQtyExceeded && (
                                                        <span className="text-[10px] text-red-500 mt-0.5 whitespace-nowrap">
                                                            เกินสต็อก ({row.availableQty})
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>

                                        {/* หน่วยนับ */}
                                        <TableCell className="text-center py-2.5">
                                            <span className="inline-block px-2 py-0.5 rounded text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                                {row.uomName || 'ชิ้น'}
                                            </span>
                                        </TableCell>

                                        {/* ตำแหน่งจัดเก็บ */}
                                        {showLocation && (
                                            <TableCell className="py-2.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                                {row.locationName || '-'}
                                            </TableCell>
                                        )}

                                        {/* ราคาต่อหน่วย */}
                                        {showPrice && (
                                            <TableCell className="text-right py-2.5">
                                                {readOnly ? (
                                                    <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                                                        {(row.unitPrice || 0).toLocaleString(undefined, {
                                                            minimumFractionDigits: 2,
                                                        })}
                                                    </span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        value={row.unitPrice ?? 0}
                                                        onChange={(e) =>
                                                            handleUpdateRow(
                                                                row.id,
                                                                'unitPrice',
                                                                Math.max(0, Number(e.target.value) || 0)
                                                            )
                                                        }
                                                        className="w-24 h-8 px-2 text-right text-xs font-mono rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                    />
                                                )}
                                            </TableCell>
                                        )}

                                        {/* รวมเงิน */}
                                        {showPrice && (
                                            <TableCell className="text-right py-2.5 font-bold font-mono text-xs text-zinc-900 dark:text-zinc-100">
                                                {(row.totalPrice || (row.itemQty * (row.unitPrice || 0))).toLocaleString(
                                                    undefined,
                                                    { minimumFractionDigits: 2 }
                                                )}
                                            </TableCell>
                                        )}

                                        {/* หมายเหตุ */}
                                        <TableCell className="py-2.5">
                                            {readOnly ? (
                                                <span className="text-xs text-zinc-500">{row.remark || '-'}</span>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={row.remark || ''}
                                                    onChange={(e) => handleUpdateRow(row.id, 'remark', e.target.value)}
                                                    placeholder="หมายเหตุรายการ..."
                                                    className="w-full h-8 px-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                />
                                            )}
                                        </TableCell>

                                        {/* จัดการ (ลบแถว) */}
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
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            {/* ── ส่วนท้ายสรุปยอดรวม (Summary Footer) ── */}
            {items.length > 0 && (
                <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-4">
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
                    </div>

                    {showPrice && (
                        <div className="flex items-center gap-2">
                            <span>ยอดรวมทั้งหมด:</span>
                            <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* ── MODAL: หน้าต่างเลือกสินค้าจากสต็อกคงคลัง (Inventory Stock) ── */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-5xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            <Warehouse className="w-5 h-5 text-emerald-600" />
                            เลือกสินค้าจาก คงคลัง (Inventory Stock)
                        </DialogTitle>
                    </DialogHeader>

                    {/* ช่องค้นหาสินค้า */}
                    <div className="py-2 space-y-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                value={modalSearch}
                                onChange={(e) => setModalSearch(e.target.value)}
                                placeholder="ค้นหารหัสสินค้า, ชื่อสินค้า, Lot No., Serial No., ตำแหน่งจัดเก็บ..."
                                className="w-full h-10 pl-9 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {/* ตารางแสดงสินค้าคงคลัง */}
                        <div className="max-h-80 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <Table>
                                <TableHeader className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                                    <TableRow>
                                        <TableHead className="w-10 text-center py-2.5">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    filteredInventoryItems.length > 0 &&
                                                    selectedInvIds.length === filteredInventoryItems.length
                                                }
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedInvIds(filteredInventoryItems.map((i) => i.id));
                                                    } else {
                                                        setSelectedInvIds([]);
                                                    }
                                                }}
                                                className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                            />
                                        </TableHead>
                                        <TableHead className="w-32 py-2.5 text-xs font-semibold">รหัสสินค้า</TableHead>
                                        <TableHead className="py-2.5 text-xs font-semibold">ชื่อสินค้า</TableHead>
                                        <TableHead className="w-28 py-2.5 text-xs font-semibold">Lot No.</TableHead>
                                        <TableHead className="w-28 py-2.5 text-xs font-semibold">Serial No.</TableHead>
                                        <TableHead className="w-32 py-2.5 text-xs font-semibold">ตำแหน่งเก็บ</TableHead>
                                        <TableHead className="w-24 text-right py-2.5 text-xs font-semibold">คงเหลือ</TableHead>
                                        <TableHead className="w-20 text-center py-2.5 text-xs font-semibold">เพิ่ม</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {loadingInventory ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center text-zinc-500">
                                                กำลังโหลดข้อมูลสต็อกคงคลัง...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredInventoryItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center text-zinc-400 text-xs">
                                                ไม่พบข้อมูลสินค้าคงคลังที่ค้นหา
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredInventoryItems.map((inv) => {
                                            const isSelected = selectedInvIds.includes(inv.id);
                                            const isAlreadyAdded = items.some((it) => it.invId === inv.id);

                                            return (
                                                <TableRow
                                                    key={inv.id}
                                                    className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors ${
                                                        isSelected ? 'bg-emerald-50/60 dark:bg-emerald-950/30' : ''
                                                    }`}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedInvIds((prev) =>
                                                                prev.filter((id) => id !== inv.id)
                                                            );
                                                        } else {
                                                            setSelectedInvIds((prev) => [...prev, inv.id]);
                                                        }
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
                                                                if (e.target.checked) {
                                                                    setSelectedInvIds((prev) => [...prev, inv.id]);
                                                                } else {
                                                                    setSelectedInvIds((prev) =>
                                                                        prev.filter((id) => id !== inv.id)
                                                                    );
                                                                }
                                                            }}
                                                            className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                        />
                                                    </TableCell>

                                                    <TableCell className="font-mono text-xs font-semibold text-emerald-600 py-2">
                                                        {inv.itemCode}
                                                    </TableCell>

                                                    <TableCell className="text-xs font-medium text-zinc-800 dark:text-zinc-200 py-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <span>{inv.itemName}</span>
                                                            {isAlreadyAdded && (
                                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                                                    เพิ่มแล้ว
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-xs font-mono text-zinc-500 py-2">
                                                        {inv.lotNo || '-'}
                                                    </TableCell>

                                                    <TableCell className="text-xs font-mono text-zinc-500 py-2">
                                                        {inv.serialNo || '-'}
                                                    </TableCell>

                                                    <TableCell className="text-xs text-zinc-600 dark:text-zinc-400 py-2">
                                                        {inv.locationName || '-'}
                                                    </TableCell>

                                                    <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 py-2">
                                                        {(inv.itemQty || 0).toLocaleString()}
                                                    </TableCell>

                                                    <TableCell
                                                        className="text-center py-2"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleAddSingleItem(inv)}
                                                            className="h-7 px-2 text-xs text-emerald-600 hover:bg-emerald-50 border-emerald-200"
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

                    <DialogFooter className="flex items-center justify-between sm:justify-between">
                        <span className="text-xs text-zinc-500">
                            เลือกอยู่ {selectedInvIds.length} รายการ
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-3 py-1.5 text-xs"
                            >
                                ปิด
                            </Button>
                            <Button
                                onClick={handleAddSelectedItems}
                                disabled={selectedInvIds.length === 0}
                                className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                เพิ่มรายการที่เลือก ({selectedInvIds.length})
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

export default InventoryItemTable;
