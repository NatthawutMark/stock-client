'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { TransactionItem, IssueItemTableProps } from './types';
import { inventoryService, type IssueInventoryList } from '@/app/_services/inventory';
import { extractList } from '@/lib/utils';
import Swal from 'sweetalert2';
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
import { Plus, Trash2, Search, Package, X, Camera } from 'lucide-react';
import { QrScannerModal } from '@/components/qrcode';
import { matchInventoryRowsByQr, normalizeTrackValue } from '@/lib/qrcode/codec';
import type { DecodedQrResult } from '@/lib/qrcode/types';
import type { InventoryView } from '@/lib/types';

const ISSUE_MENU_ID = '85D356B7877647C49B61B71FB047E0B6';

const CONFIRMED_STATUSES = [
    'confirm',
    'confirmed',
    'complete',
    'completed',
    'approve',
    'approved',
    'picking',
    'ยืนยัน',
    'ยืนยันเอกสาร',
    'สำเร็จ',
    'เสร็จสิ้น',
];

export function IssueItemTable({
    items,
    onChange,
    warehouseId,
    docId,
    readOnly = false,
    showPrice = true,
    showLotSerial = true,
    showLocation = true,
    showPickingQty,
    statusCode,
    title = 'รายการสินค้าเบิกจ่าย (Issue Item List)',
    subtitle = 'เลือกสินค้าที่มีอยู่ในสต็อกคงคลัง (Inventory) ตามคลังสินค้าที่เลือก',
}: IssueItemTableProps) {
    // ─────────────────────────────────────────────────────────────
    // 1. State ของหน้าจอและหน้าต่างเลือกสินค้า (Modal)
    // ─────────────────────────────────────────────────────────────
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isQrScanOpen, setIsQrScanOpen] = useState(false);
    const [modalSearch, setModalSearch] = useState('');
    const [selectedInvIds, setSelectedInvIds] = useState<string[]>([]);
    const [inventoryList, setInventoryList] = useState<IssueInventoryList[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);

    // แสดงคอลัมน์ "จำนวนที่เบิกแล้ว" เมื่อสถานะเอกสารได้รับการยืนยันแล้ว
    const isShowPickingQty = useMemo(() => {
        if (showPickingQty !== undefined) return showPickingQty;
        if (!statusCode) return false;
        return CONFIRMED_STATUSES.includes(String(statusCode).trim().toLowerCase());
    }, [showPickingQty, statusCode]);

    // ─────────────────────────────────────────────────────────────
    // 2. คำนวณยอดคงเหลือสุทธิ (ยอดในคลัง - ยอดที่เลือกใส่ตารางแล้ว)
    // ─────────────────────────────────────────────────────────────
    const usedQtyByInvId = useMemo(() => {
        const map = new Map<string, number>();
        for (const row of items) {
            const invId = row.invId || row.id;
            if (invId) {
                const key = String(invId);
                map.set(key, (map.get(key) || 0) + (Number(row.itemQty) || 0));
            }
        }
        return map;
    }, [items]);

    const getUsedQtyInTable = useCallback(
        (stockItem: IssueInventoryList): number => {
            if (!stockItem.id) return 0;
            return usedQtyByInvId.get(String(stockItem.id)) || 0;
        },
        [usedQtyByInvId]
    );

    const getRemainingStockQty = useCallback(
        (stockItem: IssueInventoryList): number => {
            const totalInStock = Number(stockItem.availableQty) || 0;
            const usedInTable = getUsedQtyInTable(stockItem);
            return Math.max(0, totalInStock - usedInTable);
        },
        [getUsedQtyInTable]
    );

    // ─────────────────────────────────────────────────────────────
    // 3. โหลดรายการสินค้าคงคลังตามคลังสินค้าที่เลือก (warehouseId)
    // ─────────────────────────────────────────────────────────────
    const fetchInventoryItems = useCallback(async () => {
        if (!warehouseId) {
            setInventoryList([]);
            return;
        }

        setLoadingInventory(true);
        try {
            const res = await inventoryService.issueInventoryList({
                menuId: ISSUE_MENU_ID,
                warehouseId: String(warehouseId),
                docId: docId ? String(docId) : undefined,
            });
            setInventoryList(extractList<IssueInventoryList>(res));
        } catch (error) {
            console.error('ไม่สามารถดึงข้อมูลสต็อกคงคลังได้:', error);
            setInventoryList([]);
        } finally {
            setLoadingInventory(false);
        }
    }, [warehouseId, docId]);

    const handleOpenAddModal = () => {
        if (!warehouseId) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาเลือกคลังสินค้าจ่ายออกก่อน',
                text: 'กรุณาเลือกคลังสินค้าที่ส่วนหัวเอกสาร เพื่อแสดงเฉพาะสินค้าที่มีในคลังนั้น',
                confirmButtonColor: '#2563eb',
            });
            return;
        }

        setModalSearch('');
        setSelectedInvIds([]);
        fetchInventoryItems();
        setIsAddModalOpen(true);
    };

    const handleOpenQrScan = () => {
        if (!warehouseId) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาเลือกคลังสินค้าจ่ายออกก่อน',
                text: 'กรุณาเลือกคลังสินค้าที่ส่วนหัวเอกสาร เพื่อสแกนเบิกเฉพาะสินค้าในคลังนั้น',
                confirmButtonColor: '#2563eb',
            });
            return;
        }
        if (inventoryList.length === 0) {
            fetchInventoryItems();
        }
        setIsQrScanOpen(true);
    };

    const handleIssueQrScanned = (decoded: DecodedQrResult) => {
        if (decoded.kind === 'LOC') {
            Swal.fire({
                icon: 'info',
                title: 'นี่คือ QRCode ป้ายชั้นวาง',
                text: `พิกัด ${decoded.payload.code} — กรุณาสแกน QRCode บนกล่องสินค้า`,
                timer: 1800,
                showConfirmButton: false,
            });
            return;
        }

        // แปลง IssueInventoryList ให้เข้ากับ InventoryView matcher
        const candidatesAsView: InventoryView[] = inventoryList.map((s) => ({
            id: s.id,
            itemId: s.itemId,
            itemCode: s.itemCode,
            itemName: s.itemName,
            lotNo: s.lotNo || '',
            serialNo: s.serialNo || '',
            itemQty: Number(s.availableQty) || 0,
            itemPrice: Number(s.itemPrice) || 0,
            locationId: s.locationId || '',
            locationName: s.locationName || '',
            mfgDate: s.mfgDate || '',
            expireDate: s.expireDate || '',
            warehouseId: s.warehouseId || warehouseId || '',
            uomName: s.uomName,
        }));

        let matchedStock: IssueInventoryList | undefined;

        if (decoded.kind === 'INV') {
            const matches = matchInventoryRowsByQr(decoded.payload, candidatesAsView);
            const firstValid = matches.find((m) => {
                const orig = inventoryList.find((s) => String(s.id) === String(m.id));
                return orig ? getRemainingStockQty(orig) > 0 : false;
            });
            if (firstValid) {
                matchedStock = inventoryList.find((s) => String(s.id) === String(firstValid.id));
            } else if (matches.length > 0) {
                matchedStock = inventoryList.find((s) => String(s.id) === String(matches[0].id));
            }
        } else {
            const kw = normalizeTrackValue(decoded.text).toLowerCase();
            matchedStock = inventoryList.find(
                (s) =>
                    (normalizeTrackValue(s.itemCode).toLowerCase() === kw ||
                        normalizeTrackValue(s.serialNo).toLowerCase() === kw) &&
                    getRemainingStockQty(s) > 0
            );
        }

        if (!matchedStock) {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่พบสินค้านี้ในคลังจ่ายออก',
                text:
                    decoded.kind === 'INV'
                        ? `ไม่พบสต็อกพร้อมจ่ายสำหรับรหัส ${decoded.payload.c}`
                        : `ไม่พบสต็อกพร้อมจ่ายสำหรับ "${decoded.text}"`,
                timer: 2200,
                showConfirmButton: false,
            });
            return;
        }

        if (getRemainingStockQty(matchedStock) <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'ยอดคงเหลือไม่พอ',
                text: `${matchedStock.itemCode || matchedStock.itemName} ถูกเลือกจนครบจำนวนคงเหลือแล้ว`,
                timer: 2000,
                showConfirmButton: false,
            });
            return;
        }

        addStockItemsToTable([matchedStock]);
    };

    // กรองรายการสินค้าใน Modal ตามคำค้นหา
    const filteredInventoryList = useMemo(() => {
        const keyword = modalSearch.trim().toLowerCase();
        if (!keyword) return inventoryList;

        return inventoryList.filter(
            (item) =>
                item.itemCode?.toLowerCase().includes(keyword) ||
                item.itemName?.toLowerCase().includes(keyword) ||
                item.locationName?.toLowerCase().includes(keyword) ||
                item.uomName?.toLowerCase().includes(keyword) ||
                item.lotNo?.toLowerCase().includes(keyword) ||
                item.serialNo?.toLowerCase().includes(keyword)
        );
    }, [inventoryList, modalSearch]);

    const isAllFilteredSelected = useMemo(() => {
        if (filteredInventoryList.length === 0) return false;
        return filteredInventoryList.every((item) => selectedInvIds.includes(String(item.id)));
    }, [filteredInventoryList, selectedInvIds]);

    // ─────────────────────────────────────────────────────────────
    // 4. ฟังก์ชันจัดการตาราง (เพิ่ม / แก้ไข / ลบแถวสินค้า)
    // ─────────────────────────────────────────────────────────────
    const createTableRow = (stockItem: IssueInventoryList, initQty: number): TransactionItem => {
        const price = Number(stockItem.itemPrice) || 0;
        const totalAvail = Number(stockItem.availableQty) || 0;

        return {
            id: String(stockItem.id),
            invId: String(stockItem.id),
            itemId: String(stockItem.itemId ?? ''),
            itemCode: stockItem.itemCode || String(stockItem.itemId ?? ''),
            itemName: stockItem.itemName || '',
            uomId: stockItem.uomId ? String(stockItem.uomId) : undefined,
            uomName: stockItem.uomName || 'ชิ้น',
            locationId: stockItem.locationId ? String(stockItem.locationId) : undefined,
            locationName: stockItem.locationName || '-',
            itemQty: initQty,
            availableQty: totalAvail,
            itemPrice: price,
            totalPrice: price * initQty,
            lotNo: stockItem.lotNo || '',
            serialNo: stockItem.serialNo || '',
            remark: '',
        };
    };

    // ฟังก์ชันกลางสำหรับเพิ่มสินค้าเข้าตาราง (ใช้ร่วมกันทั้งปุ่มเลือกหลายรายการ และปุ่ม + รายการเดียว)
    const addStockItemsToTable = (stockItemsToAdd: IssueInventoryList[]) => {
        const nextItems = items.map((row) => ({ ...row }));

        for (const stockItem of stockItemsToAdd) {
            const invId = String(stockItem.id);
            const totalAvail = Number(stockItem.availableQty) || 0;
            const existingIndex = nextItems.findIndex(
                (row) => String(row.invId ?? row.id) === invId
            );

            if (existingIndex >= 0) {
                const existing = nextItems[existingIndex];
                const currentQty = Number(existing.itemQty) || 0;
                const maxQty = existing.availableQty || totalAvail;
                if (currentQty < maxQty) {
                    const newQty = currentQty + 1;
                    nextItems[existingIndex] = {
                        ...existing,
                        itemQty: newQty,
                        totalPrice: newQty * (Number(existing.itemPrice) || 0),
                    };
                }
            } else {
                const remaining = getRemainingStockQty(stockItem);
                const initQty = remaining > 0 ? 1 : 0;
                nextItems.push(createTableRow(stockItem, initQty));
            }
        }

        onChange(nextItems);
    };

    const handleAddSelectedItems = () => {
        const selectedStockItems = inventoryList.filter((item) =>
            selectedInvIds.includes(String(item.id))
        );
        addStockItemsToTable(selectedStockItems);
        setIsAddModalOpen(false);
    };

    const handleAddSingleItem = (stockItem: IssueInventoryList) => {
        addStockItemsToTable([stockItem]);
    };

    const handleUpdateRow = (rowId: string, field: keyof TransactionItem, value: unknown) => {
        const updatedItems = items.map((row) => {
            if (row.id !== rowId) return row;

            const updatedRow: TransactionItem = {
                ...row,
                [field]: value,
            };

            if (field === 'itemQty') {
                let qty = Number(updatedRow.itemQty);
                if (Number.isNaN(qty) || qty < 0) qty = 0;

                if (updatedRow.availableQty && updatedRow.availableQty > 0 && qty > updatedRow.availableQty) {
                    qty = updatedRow.availableQty;
                }
                updatedRow.itemQty = qty;
            }

            const qty = Number(updatedRow.itemQty) || 0;
            const price = Number(updatedRow.itemPrice) || 0;
            updatedRow.totalPrice = qty * price;

            return updatedRow;
        });

        onChange(updatedItems);
    };

    const handleDeleteRow = (rowId: string) => {
        onChange(items.filter((row) => row.id !== rowId));
    };

    // ─────────────────────────────────────────────────────────────
    // 5. คำนวณยอดรวมท้ายตาราง (Summary Footer)
    // ─────────────────────────────────────────────────────────────
    const totalQty = useMemo(
        () => items.reduce((sum, item) => sum + (Number(item.itemQty) || 0), 0),
        [items]
    );

    const totalPickingQty = useMemo(
        () => items.reduce((sum, item) => sum + (Number(item.pickingQty) || 0), 0),
        [items]
    );

    const grandTotalPrice = useMemo(
        () => items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0),
        [items]
    );

    // ─────────────────────────────────────────────────────────────
    // 6. ส่วนแสดงผลหน้าจอ (UI)
    // ─────────────────────────────────────────────────────────────
    return (
        <Card className="w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
            {/* หัวตารางหลัก */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-800/40">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                        <Package className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-2">
                            {title}
                            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                แหล่งข้อมูล: สต็อกคงคลัง (Inventory)
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
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleOpenQrScan}
                            className="flex-1 sm:flex-none justify-center h-8 px-3 text-xs font-medium rounded-lg border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1.5"
                        >
                            <Camera className="w-3.5 h-3.5" />
                            สแกน QR เบิกสินค้า
                        </Button>
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

            {/* ตารางแสดงรายการสินค้าที่เลือกเบิก */}
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
                                    กดปุ่ม &quot;เพิ่มรายการสินค้า (Add Item)&quot; ด้านบนเพื่อเลือกสินค้าจากสต็อกคงคลังตามคลังที่เลือก
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
                                        key={row.id ? `mobile-row-${row.id}-${idx}` : `mobile-row-${idx}`}
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

                                        {(showLocation || (showLotSerial && (row.lotNo || row.serialNo))) && (
                                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                                {showLocation && (
                                                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 font-mono">
                                                        ตำแหน่ง: {row.locationName || '-'}
                                                    </span>
                                                )}
                                                {showLotSerial && row.lotNo && (
                                                    <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono">
                                                        Lot: {row.lotNo}
                                                    </span>
                                                )}
                                                {showLotSerial && row.serialNo && (
                                                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                                                        S/N: {row.serialNo}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <span className="block text-[11px] font-semibold text-zinc-500 mb-1">
                                                    จำนวนเบิก ({row.uomName || 'ชิ้น'})
                                                </span>
                                                {readOnly ? (
                                                    <span className="font-bold font-mono text-sm text-zinc-900 dark:text-zinc-100">
                                                        {row.itemQty.toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={
                                                                row.availableQty && row.availableQty > 0
                                                                    ? row.availableQty
                                                                    : undefined
                                                            }
                                                            value={row.itemQty === 0 ? '' : row.itemQty}
                                                            onChange={(e) => {
                                                                const raw = e.target.value;
                                                                handleUpdateRow(
                                                                    row.id,
                                                                    'itemQty',
                                                                    raw === '' ? 0 : Number(raw)
                                                                );
                                                            }}
                                                            onBlur={() => {
                                                                const currentVal = Number(row.itemQty) || 1;
                                                                handleUpdateRow(
                                                                    row.id,
                                                                    'itemQty',
                                                                    Math.max(1, currentVal)
                                                                );
                                                            }}
                                                            className="w-full h-9 px-2.5 text-right text-xs font-bold font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                        {row.availableQty !== undefined && (
                                                            <span
                                                                className={`text-[10px] font-mono leading-none ${
                                                                    row.availableQty - (Number(row.itemQty) || 0) <= 0
                                                                        ? 'text-rose-500 font-semibold'
                                                                        : 'text-zinc-400'
                                                                }`}
                                                            >
                                                                คงเหลือ:{' '}
                                                                {Math.max(
                                                                    0,
                                                                    row.availableQty - (Number(row.itemQty) || 0)
                                                                ).toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
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

                                            {isShowPickingQty && (
                                                <div className="col-span-2 flex items-center justify-between rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 px-2.5 py-1.5 text-xs">
                                                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                                        จำนวนที่เบิกแล้ว
                                                    </span>
                                                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                                        {(row.pickingQty ?? 0).toLocaleString()} {row.uomName || 'ชิ้น'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

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
                            <TableHead className="w-[125px] text-right font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                จำนวนเบิก
                            </TableHead>
                            {isShowPickingQty && (
                                <TableHead className="w-[130px] text-right font-bold text-xs uppercase text-emerald-700 dark:text-emerald-400 py-3">
                                    จำนวนที่เบิกแล้ว
                                </TableHead>
                            )}
                            <TableHead className="w-[90px] text-center font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                หน่วยนับ
                            </TableHead>
                            {showLocation && (
                                <TableHead className="w-[160px] text-left font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                    ตำแหน่งจัดเก็บ
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
                                        (isShowPickingQty ? 1 : 0) +
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
                                            กดปุ่ม &quot;เพิ่มรายการสินค้า (Add Item)&quot; ด้านบนเพื่อเลือกสินค้าจากสต็อกคงคลังตามคลังที่เลือก
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
                                    key={row.id ? `main-row-${row.id}-${idx}` : `main-row-${idx}`}
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
                                                <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                                                    {row.lotNo || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                                                    {row.serialNo || '-'}
                                                </span>
                                            </TableCell>
                                        </>
                                    )}

                                    <TableCell className="text-right py-2.5">
                                        {readOnly ? (
                                            <span className="font-bold font-mono text-xs text-zinc-900 dark:text-zinc-100">
                                                {row.itemQty.toLocaleString()}
                                            </span>
                                        ) : (
                                            <div className="flex flex-col items-end gap-1">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={row.availableQty && row.availableQty > 0 ? row.availableQty : undefined}
                                                    value={row.itemQty === 0 ? '' : row.itemQty}
                                                    onChange={(e) => {
                                                        const raw = e.target.value;
                                                        handleUpdateRow(
                                                            row.id,
                                                            'itemQty',
                                                            raw === '' ? 0 : Number(raw)
                                                        );
                                                    }}
                                                    onBlur={() => {
                                                        const currentVal = Number(row.itemQty) || 1;
                                                        handleUpdateRow(row.id, 'itemQty', Math.max(1, currentVal));
                                                    }}
                                                    className="w-20 h-8 px-2 text-right text-xs font-bold font-mono rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                {row.availableQty !== undefined && (
                                                    <span
                                                        className={`text-[10px] font-mono leading-none ${
                                                            row.availableQty - (Number(row.itemQty) || 0) <= 0
                                                                ? 'text-rose-500 font-semibold'
                                                                : 'text-zinc-400'
                                                        }`}
                                                        title={`จำนวนที่มีในคลังทั้งหมด: ${row.availableQty.toLocaleString()}`}
                                                    >
                                                        คงเหลือ: {Math.max(0, row.availableQty - (Number(row.itemQty) || 0)).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </TableCell>

                                    {isShowPickingQty && (
                                        <TableCell className="text-right py-2.5">
                                            <span className="font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400">
                                                {(row.pickingQty ?? 0).toLocaleString()}
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
                                            <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                                {row.locationName || '-'}
                                            </span>
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

            {/* ส่วนท้ายตารางแสดงยอดสรุปรวม */}
            {items.length > 0 && (
                <div className="px-4 sm:px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>
                            รวม <strong className="text-zinc-900 dark:text-zinc-100 font-mono text-sm">{items.length}</strong> รายการ
                        </span>
                        <span>
                            จำนวนเบิกรวม{' '}
                            <strong className="text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                                {totalQty.toLocaleString()}
                            </strong>{' '}
                            ชิ้น
                        </span>
                        {isShowPickingQty && (
                            <span>
                                จำนวนที่เบิกแล้วรวม{' '}
                                <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                                    {totalPickingQty.toLocaleString()}
                                </strong>{' '}
                                ชิ้น
                            </span>
                        )}
                    </div>

                    {showPrice && (
                        <div className="flex items-center gap-2">
                            <span>ยอดรวมทั้งหมด:</span>
                            <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                                {grandTotalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* หน้าต่าง MODAL: เลือกสินค้าจากสต็อกคงคลัง (Inventory) */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-6xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 max-h-[90dvh] overflow-y-auto overscroll-contain flex flex-col gap-4">
                    <DialogHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800 pr-8">
                        <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                                <Package className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="truncate">เลือกสินค้าจากสต็อกคงคลัง (Inventory Stock)</div>
                                <div className="text-xs font-normal text-zinc-500 mt-0.5">
                                    แสดงเฉพาะสินค้าที่มีอยู่ในคลังสินค้าที่เลือก ({filteredInventoryList.length} รายการ)
                                </div>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {/* ช่องค้นหาสินค้า */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            value={modalSearch}
                            onChange={(e) => setModalSearch(e.target.value)}
                            placeholder="ค้นหารหัสสินค้า, ชื่อสินค้า, ตำแหน่งจัดเก็บ, Lot/Serial..."
                            className="w-full h-10 pl-9 pr-9 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-all"
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

                    {/* ตารางแสดงรายการสินค้าคงคลังใน Modal */}
                    <div className="max-h-[420px] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                        {/* Mobile Item Selector Cards */}
                        <div className="md:hidden">
                            {loadingInventory ? (
                                <div className="h-40 flex flex-col items-center justify-center gap-2 text-zinc-500">
                                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs">กำลังโหลดข้อมูลสต็อกคงคลัง...</span>
                                </div>
                            ) : filteredInventoryList.length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center gap-1.5 py-6 text-zinc-400 text-xs">
                                    <Package className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                                    <span className="font-medium text-zinc-600 dark:text-zinc-400">
                                        ไม่พบสินค้าคงคลังในคลังที่เลือก
                                    </span>
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
                                                        const allIds = filteredInventoryList.map((item) => String(item.id));
                                                        setSelectedInvIds((prev) => Array.from(new Set([...prev, ...allIds])));
                                                    } else {
                                                        const filteredIds = new Set(
                                                            filteredInventoryList.map((item) => String(item.id))
                                                        );
                                                        setSelectedInvIds((prev) => prev.filter((id) => !filteredIds.has(id)));
                                                    }
                                                }}
                                                className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                            เลือกทั้งหมด ({filteredInventoryList.length})
                                        </label>
                                    </div>
                                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {filteredInventoryList.map((item) => {
                                            const invId = String(item.id);
                                            const isSelected = selectedInvIds.includes(invId);
                                            const isAlreadyInTable = items.some(
                                                (row) => String(row.invId ?? row.id) === invId
                                            );
                                            const usedQty = getUsedQtyInTable(item);
                                            const remainingQty = getRemainingStockQty(item);

                                            return (
                                                <div
                                                    key={`modal-card-${invId}`}
                                                    onClick={() => {
                                                        setSelectedInvIds((prev) =>
                                                            isSelected
                                                                ? prev.filter((id) => id !== invId)
                                                                : [...prev, invId]
                                                        );
                                                    }}
                                                    className={`p-3 flex items-start gap-2.5 cursor-pointer transition-colors text-xs ${
                                                        isSelected
                                                            ? 'bg-blue-50/70 dark:bg-blue-950/40'
                                                            : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40'
                                                    } ${remainingQty === 0 ? 'opacity-60' : ''}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                            setSelectedInvIds((prev) =>
                                                                e.target.checked
                                                                    ? [...prev, invId]
                                                                    : prev.filter((id) => id !== invId)
                                                            );
                                                        }}
                                                        className="mt-1 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                                    />
                                                    <div className="min-w-0 flex-1 space-y-1.5">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-900/60">
                                                                {item.itemCode || item.id}
                                                            </span>
                                                            {isAlreadyInTable && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                                                    เลือกแล้ว
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="font-medium text-zinc-900 dark:text-zinc-100 break-words">
                                                            {item.itemName}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                                            {(item.locationName || item.locationId) && (
                                                                <span className="font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700">
                                                                    {item.locationName || item.locationId}
                                                                </span>
                                                            )}
                                                            {item.lotNo && (
                                                                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono text-[10px]">
                                                                    Lot: {item.lotNo}
                                                                </span>
                                                            )}
                                                            {item.serialNo && (
                                                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono text-[10px]">
                                                                    S/N: {item.serialNo}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span
                                                                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border font-mono ${
                                                                        remainingQty === 0
                                                                            ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                                                                            : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                                                                    }`}
                                                                >
                                                                    {remainingQty === 0
                                                                        ? 'หมดสต็อก'
                                                                        : `คงเหลือ ${remainingQty.toLocaleString()} ${item.uomName || 'ชิ้น'}`}
                                                                </span>
                                                                {usedQty > 0 && (
                                                                    <span className="text-[10px] text-zinc-400 font-mono">
                                                                        (เลือก {usedQty.toLocaleString()})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                                                                {(Number(item.itemPrice) || 0).toLocaleString()} ฿
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
                                                        className="h-8 px-2.5 text-blue-600 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/50 border-zinc-200 dark:border-zinc-700 shrink-0"
                                                        title="เพิ่มรายการนี้เข้าตารางทันที"
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
                            <TableHeader className="bg-zinc-50 dark:bg-zinc-800/90 sticky top-0 z-10">
                                <TableRow className="border-b border-zinc-200 dark:border-zinc-700">
                                    <TableHead className="w-10 text-center py-2.5">
                                        <input
                                            type="checkbox"
                                            checked={isAllFilteredSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    const allIds = filteredInventoryList.map((item) => String(item.id));
                                                    setSelectedInvIds((prev) => Array.from(new Set([...prev, ...allIds])));
                                                } else {
                                                    const filteredIds = new Set(
                                                        filteredInventoryList.map((item) => String(item.id))
                                                    );
                                                    setSelectedInvIds((prev) => prev.filter((id) => !filteredIds.has(id)));
                                                }
                                            }}
                                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </TableHead>
                                    <TableHead className="w-28 py-2.5 text-xs font-semibold">รหัสสินค้า</TableHead>
                                    <TableHead className="py-2.5 text-xs font-semibold min-w-[220px]">รายละเอียดสินค้า</TableHead>
                                    <TableHead className="w-24 text-center py-2.5 text-xs font-semibold">ตำแหน่ง</TableHead>
                                    <TableHead className="w-28 text-right py-2.5 text-xs font-semibold">คงเหลือในคลัง</TableHead>
                                    <TableHead className="w-16 text-center py-2.5 text-xs font-semibold">หน่วย</TableHead>
                                    <TableHead className="w-24 text-right py-2.5 text-xs font-semibold">ราคา/หน่วย</TableHead>
                                    <TableHead className="w-16 text-center py-2.5 text-xs font-semibold">เลือก</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {loadingInventory ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-40 text-center text-zinc-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                <span className="text-xs">กำลังโหลดข้อมูลสต็อกคงคลัง...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredInventoryList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-40 text-center text-zinc-400 text-xs">
                                            <div className="flex flex-col items-center justify-center gap-1.5 py-6">
                                                <Package className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                                                <span className="font-medium text-zinc-600 dark:text-zinc-400">
                                                    ไม่พบสินค้าคงคลังในคลังที่เลือก
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredInventoryList.map((item) => {
                                        const invId = String(item.id);
                                        const isSelected = selectedInvIds.includes(invId);
                                        const isAlreadyInTable = items.some(
                                            (row) => String(row.invId ?? row.id) === invId
                                        );
                                        const usedQty = getUsedQtyInTable(item);
                                        const remainingQty = getRemainingStockQty(item);

                                        return (
                                            <TableRow
                                                key={invId}
                                                className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors text-xs ${
                                                    isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40' : ''
                                                } ${remainingQty === 0 ? 'opacity-60' : ''}`}
                                                onClick={() => {
                                                    setSelectedInvIds((prev) =>
                                                        isSelected
                                                            ? prev.filter((id) => id !== invId)
                                                            : [...prev, invId]
                                                    );
                                                }}
                                            >
                                                <TableCell className="text-center py-2.5" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            setSelectedInvIds((prev) =>
                                                                e.target.checked
                                                                    ? [...prev, invId]
                                                                    : prev.filter((id) => id !== invId)
                                                            );
                                                        }}
                                                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </TableCell>

                                                <TableCell className="py-2.5">
                                                    <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-900/60">
                                                        {item.itemCode || item.id}
                                                    </span>
                                                </TableCell>

                                                <TableCell className="py-2.5">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                                                {item.itemName}
                                                            </span>
                                                            {isAlreadyInTable && (
                                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                                                    เลือกแล้ว
                                                                </span>
                                                            )}
                                                        </div>
                                                        {(item.lotNo || item.serialNo) && (
                                                            <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                                                {item.lotNo && (
                                                                    <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono text-[10px]">
                                                                        Lot: {item.lotNo}
                                                                    </span>
                                                                )}
                                                                {item.serialNo && (
                                                                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono text-[10px]">
                                                                        S/N: {item.serialNo}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center py-2.5">
                                                    {item.locationName || item.locationId ? (
                                                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700">
                                                            {item.locationName || item.locationId}
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-400">-</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right py-2.5 font-mono">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span
                                                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                                                remainingQty === 0
                                                                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                                                                    : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                                                            }`}
                                                        >
                                                            {remainingQty === 0
                                                                ? 'หมดสต็อก'
                                                                : remainingQty.toLocaleString()}
                                                        </span>
                                                        {usedQty > 0 && (
                                                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                                                                (เลือกแล้ว {usedQty.toLocaleString()})
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center py-2.5 text-zinc-600 dark:text-zinc-400">
                                                    {item.uomName || 'ชิ้น'}
                                                </TableCell>

                                                <TableCell className="text-right font-mono py-2.5 font-medium text-zinc-800 dark:text-zinc-200">
                                                    {(Number(item.itemPrice) || 0).toLocaleString()} ฿
                                                </TableCell>

                                                <TableCell className="text-center py-2.5" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleAddSingleItem(item)}
                                                        className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/50 border-zinc-200 dark:border-zinc-700"
                                                        title="เพิ่มรายการนี้เข้าตารางทันที"
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

                    {/* ส่วนท้าย Modal */}
                    <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 sm:-mx-6 sm:-mb-6 sm:px-6">
                        <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-zinc-500">
                            <span>
                                เลือกอยู่{' '}
                                <strong className="font-semibold text-blue-600 dark:text-blue-400 font-mono text-sm">
                                    {selectedInvIds.length}
                                </strong>{' '}
                                รายการ
                            </span>
                            <span className="text-zinc-300 dark:text-zinc-700">|</span>
                            <span>จากทั้งหมด {filteredInventoryList.length} รายการ</span>
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setIsAddModalOpen(false)}
                                className="w-full sm:w-auto px-4 py-2 text-xs"
                            >
                                ปิด
                            </Button>
                            <Button
                                onClick={handleAddSelectedItems}
                                disabled={selectedInvIds.length === 0}
                                className="w-full sm:w-auto px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50"
                            >
                                เพิ่มรายการที่เลือก ({selectedInvIds.length})
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <QrScannerModal
                open={isQrScanOpen}
                onOpenChange={setIsQrScanOpen}
                onScan={handleIssueQrScanned}
                keepOpen
                title="สแกน QRCode เพิ่มรายการเบิกสินค้า"
                subtitle="สแกนต่อเนื่องได้ทันที ระบบจะเพิ่มรายการหรือบวกจำนวนเบิก +1 อัตโนมัติ (รองรับสินค้าที่ไม่มี Lot/SN)"
            />
        </Card>
    );
}

export default IssueItemTable;
