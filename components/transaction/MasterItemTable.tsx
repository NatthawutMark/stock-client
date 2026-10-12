'use client';

/**
 * ============================================================================
 * [TEMPLATE] MasterItemTable: คอมโพเนนต์ตารางสินค้าสำหรับเอกสารประเภทรับเข้า (Inward)
 * ============================================================================
 * เหมาะสำหรับหน้า:
 * - รับสินค้าเข้าคลัง (Goods Receive)
 * - สั่งซื้อสินค้า (Purchase Order)
 * - รับคืนสินค้าจากลูกค้า (Sales Return)
 * - บันทึกยอดยกมาเริ่มต้น (Initial Stock)
 *
 * คุณลักษณะ:
 * - ดึงสินค้าจาก Master Item Catalog (masterService.items.list)
 * - ให้ผู้ใช้กำหนดจำนวนรับ, ราคาต่อหน่วย, กำหนด Lot No., Serial No. และเลือก Location ปลายทาง
 * - คำนวณราคารวมและยอดรวมอัตโนมัติ
 * - สามารถ Copy คอมโพเนนต์นี้ไปประยุกต์เป็นเอกสารหน้าอื่นๆ ได้ง่าย
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { masterService } from '@/app/_services/master';
import type { MastItem, MastLocation, MastUom } from '@/lib/types';
import type { TransactionItem, MasterItemTableProps } from './types';
import {
    Button, Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui';
import {
    Plus,
    Trash2,
    Search,
    Package,
} from 'lucide-react';

// ตัวสร้าง Unique Key ประจำแถวแบบปลอดภัย (หลีกเลี่ยง Hydration Mismatch)
let rowCounter = 0;
function generateRowId(itemId: string | number) {
    rowCounter += 1;
    return `master-row-${itemId}-${rowCounter}`;
}

export function MasterItemTable({
    items,
    onChange,
    warehouseId,
    readOnly = false,
    showPrice = true,
    showLotSerial = true,
    showLocation = true,
    title = 'รายการสินค้า (Item List)',
    subtitle = 'เลือกสินค้าจากฐานข้อมูล Master เพื่อนำเข้าสู่ระบบ',
}: MasterItemTableProps) {
    // ─────────────────────────────────────────────────────────────
    // 1. STATE MANAGEMENT
    // ─────────────────────────────────────────────────────────────
    // State สำหรับ Modal เลือกสินค้า
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalSearch, setModalSearch] = useState('');
    const [selectedItemIds, setSelectedItemIds] = useState<(string | number)[]>([]);

    // รายการสินค้าจาก Master DB
    const [masterItemList, setMasterItemList] = useState<MastItem[]>([]);
    const [loadingMaster, setLoadingMaster] = useState(false);

    // ข้อมูลเสริมสำหรับ Dropdowns (ตำแหน่งจัดเก็บ และ หน่วยนับ)
    const [locationList, setLocationList] = useState<MastLocation[]>([]);
    const [uomList, setUomList] = useState<MastUom[]>([]);

    // ─────────────────────────────────────────────────────────────
    // 2. โหลดข้อมูลตำแหน่งจัดเก็บ (Locations) และหน่วยนับ (UOMs)
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadHelperMasters = async () => {
            try {
                const [locRes, uomRes] = await Promise.all([
                    masterService.locations.list(),
                    masterService.uoms.list(),
                ]);

                const locData = locRes?.success
                    ? (Array.isArray(locRes.results) ? locRes.results : Array.isArray(locRes.data) ? locRes.data : [])
                    : [];
                setLocationList(locData);

                const uomData = uomRes?.success
                    ? (Array.isArray(uomRes.results) ? uomRes.results : Array.isArray(uomRes.data) ? uomRes.data : [])
                    : [];
                setUomList(uomData);
            } catch (err) {
                console.error('Failed to load locations or uoms from DB:', err);
                setLocationList([]);
                setUomList([]);
            }
        };

        loadHelperMasters();
    }, []);

    // ─────────────────────────────────────────────────────────────
    // 3. โหลดรายการสินค้า Master จาก API เมื่อเปิด Modal
    // ─────────────────────────────────────────────────────────────
    const fetchMasterItems = useCallback(async () => {
        setLoadingMaster(true);
        try {
            const res = await masterService.items.list({ id: '', isActive: true });
            const itemData = res?.success
                ? (Array.isArray(res.results) ? res.results : Array.isArray(res.data) ? res.data : [])
                : [];
            setMasterItemList(itemData);
        } catch (err) {
            console.error('Failed to load master items from DB:', err);
            setMasterItemList([]);
        } finally {
            setLoadingMaster(false);
        }
    }, []);

    // เมื่อกดปุ่ม "เพิ่มรายการสินค้า" -> เคลียร์ค่าค้นหา และดึงรายการล่าสุด
    const handleOpenAddModal = () => {
        setModalSearch('');
        setSelectedItemIds([]);
        fetchMasterItems();
        setIsAddModalOpen(true);
    };

    // กรองสินค้าใน Modal ตามคำค้นหา
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

    // ─────────────────────────────────────────────────────────────
    // 4. ฟังก์ชันเพิ่มสินค้าเข้าตาราง (Add Items)
    // ─────────────────────────────────────────────────────────────
    // 4.1 เพิ่มหลายรายการพร้อมกันจาก Checkbox
    const handleAddSelectedItems = () => {
        const toAdd = masterItemList.filter((m) => selectedItemIds.includes(m.id));
        const newItems: TransactionItem[] = [...items];

        toAdd.forEach((m) => {
            const uom = uomList.find((u) => u.id === m.uomId)?.name || m.uomName || 'ชิ้น';
            const loc = locationList.find((l) => l.id === m.locationId)?.name || m.locationName || '';
            const price = Number(m.buyPrice || 0);

            newItems.push({
                id: generateRowId(m.id),
                itemId: m.id,
                itemCode: m.itemCode || '',
                itemName: m.itemName || '',
                uomId: m.uomId,
                uomName: uom,
                itemQty: 1,
                unitPrice: price,
                totalPrice: price * 1,
                lotNo: '',
                serialNo: '',
                isLotNo: m.isLotno || false,
                isSerialNo: m.isSerialNo || false,
                locationId: m.locationId || (locationList[0]?.id ?? ''),
                locationName: loc || locationList[0]?.name || '',
                remark: '',
            });
        });

        console.log('see data :', newItems);

        onChange(newItems);
        setIsAddModalOpen(false);
    };

    // 4.2 เพิ่มทันที 1 รายการจากการกดปุ่ม (+) ใน Modal
    const handleAddSingleItem = (m: MastItem) => {
        const uom = uomList.find((u) => u.id === m.uomId)?.name || m.uomName || 'ชิ้น';
        const loc = locationList.find((l) => l.id === m.locationId)?.name || m.locationName || '';
        const price = Number(m.buyPrice || 0);

        const newRow: TransactionItem = {
            id: generateRowId(m.id),
            itemId: m.id,
            itemCode: m.itemCode || '',
            itemName: m.itemName || '',
            uomId: m.uomId,
            uomName: uom,
            itemQty: 1,
            unitPrice: price,
            totalPrice: price * 1,
            lotNo: '',
            serialNo: '',
            isLotNo: m.isLotno || false,
            isSerialNo: m.isSerialNo || false,
            locationId: m.locationId || (locationList[0]?.id ?? ''),
            locationName: loc || locationList[0]?.name || '',
            remark: '',
        };

        onChange([...items, newRow]);
    };

    // ─────────────────────────────────────────────────────────────
    // 5. ฟังก์ชันแก้ไขและลบแถวในตาราง
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
    // 6. สรุปยอดรวมท้ายตาราง
    // ─────────────────────────────────────────────────────────────
    const totalQty = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.itemQty) || 0), 0);
    }, [items]);

    const grandTotal = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    }, [items]);

    // ตัวเลือก Locations ที่กรองตามคลังถ้ามีการระบุ warehouseId
    const filteredLocations = useMemo(() => {
        if (!warehouseId) return locationList;
        return locationList.filter(
            (l) => !l.warehouseId || String(l.warehouseId) === String(warehouseId)
        );
    }, [locationList, warehouseId]);

    return (
        <Card className="w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
            {/* ── ส่วนหัวการ์ดตาราง ── */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-800/40">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Package className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            {title}
                            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                แหล่งข้อมูล: Master Catalog
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
                            className="h-8 px-3.5 text-xs font-medium text-white rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" />
                            เพิ่มรายการสินค้า (Add Item)
                        </Button>
                    </div>
                )}
            </div>

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
                                        5 +
                                        (showLotSerial ? 2 : 0) +
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
                                    {/* ลำดับ */}
                                    <TableCell className="text-center font-mono text-xs text-zinc-400 py-2.5">
                                        {idx + 1}
                                    </TableCell>

                                    {/* รหัสสินค้า */}
                                    <TableCell className="font-mono font-medium text-xs text-blue-600 dark:text-blue-400 py-2.5">
                                        {row.itemCode}
                                    </TableCell>

                                    {/* ชื่อสินค้า */}
                                    <TableCell className="font-medium text-zinc-800 dark:text-zinc-200 py-2.5">
                                        {row.itemName}
                                    </TableCell>

                                    {/* Lot / Serial */}
                                    {showLotSerial && (
                                        <>
                                            <TableCell className="py-2.5">
                                                {readOnly ? (
                                                    <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                                                        {row.lotNo || '-'}
                                                    </span>
                                                ) : (
                                                    (row.isLotNo && row.isLotNo == true ? (
                                                        <input
                                                            type="text"
                                                            value={row.lotNo || ''}
                                                            onChange={(e) =>
                                                                handleUpdateRow(row.id, 'lotNo', e.target.value)
                                                            }
                                                            placeholder="Lot No..."
                                                            className="w-full h-8 px-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                                                        />) : '-')

                                                )}
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                {readOnly ? (
                                                    <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                                                        {row.serialNo || '-'}
                                                    </span>
                                                ) : (

                                                    (row.isSerialNo && row.isSerialNo == true ? (
                                                        <input
                                                            type="text"
                                                            value={row.serialNo || ''}
                                                            onChange={(e) =>
                                                                handleUpdateRow(row.id, 'serialNo', e.target.value)
                                                            }
                                                            placeholder="Serial No..."
                                                            className="w-full h-8 px-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                                                        />) : '-')
                                                )}
                                            </TableCell>
                                        </>
                                    )}

                                    {/* จำนวนรับ */}
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

                                    {/* หน่วยนับ */}
                                    <TableCell className="text-center py-2.5">
                                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                            {row.uomName || 'ชิ้น'}
                                        </span>
                                    </TableCell>

                                    {/* ตำแหน่งจัดเก็บปลายทาง */}
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
                                                        const loc = locationList.find(
                                                            (l) => String(l.id) === locId
                                                        );
                                                        handleUpdateRow(row.id, 'locationId', locId);
                                                        handleUpdateRow(row.id, 'locationName', loc?.name || '');
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
                                                    className="w-24 h-8 px-2 text-right text-xs font-mono rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                                className="w-full h-8 px-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                            ))
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
                            <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                                {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* ── MODAL: หน้าต่างเลือกสินค้าจาก Master Catalog ── */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-4xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            <Package className="w-5 h-5 text-blue-600" />
                            เลือกสินค้าจาก Master Catalog
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
                                placeholder="ค้นหารหัสสินค้า, ชื่อสินค้า, แบรนด์..."
                                className="w-full h-10 pl-9 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* ตารางแสดงสินค้า Master */}
                        <div className="max-h-80 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <Table>
                                <TableHeader className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                                    <TableRow>
                                        <TableHead className="w-10 text-center py-2.5">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    filteredMasterItems.length > 0 &&
                                                    selectedItemIds.length === filteredMasterItems.length
                                                }
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedItemIds(filteredMasterItems.map((i) => i.id));
                                                    } else {
                                                        setSelectedItemIds([]);
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
                                            const isSelected = selectedItemIds.includes(item.id);
                                            const isAlreadyAdded = items.some((it) => it.itemId === item.id);

                                            return (
                                                <TableRow
                                                    key={item.id}
                                                    className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                                                        }`}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedItemIds((prev) =>
                                                                prev.filter((id) => id !== item.id)
                                                            );
                                                        } else {
                                                            setSelectedItemIds((prev) => [...prev, item.id]);
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
                                                                    setSelectedItemIds((prev) => [...prev, item.id]);
                                                                } else {
                                                                    setSelectedItemIds((prev) =>
                                                                        prev.filter((id) => id !== item.id)
                                                                    );
                                                                }
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

                    <DialogFooter className="flex items-center justify-between sm:justify-between">
                        <span className="text-xs text-zinc-500">
                            เลือกอยู่ {selectedItemIds.length} รายการ
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
                                disabled={selectedItemIds.length === 0}
                                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
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

