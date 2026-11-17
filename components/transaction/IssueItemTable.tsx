'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { TransactionItem, IssueItemTableProps } from './types';
import { inventoryService } from '@/app/_services/inventory';
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
import {
    Plus,
    Trash2,
    Search,
    Package,
    X,
} from 'lucide-react';

// ============================================================
// โครงสร้างข้อมูลสินค้าจากสต็อกคงคลัง (Inventory) สำหรับแสดงใน Modal
// ============================================================
export type IssueDialogItem = {
    id?: string;
    itemId?: string;
    itemCode?: string;
    itemName?: string;
    brandName?: string;
    availableQty?: number;
    categoryName?: string;
    locationName?: string;
    locationId?: string;
    uomName?: string;
    uomId?: string;
    itemPrice?: number;
    sellPrice?: number;
    buyPrice?: number;
    lotNo?: string;
    serialNo?: string;
    isLotNo?: boolean;
    isSerialNo?: boolean;
    warehouseName?: string;
    warehouseId?: string;
    mfgDate?: string;
    expireDate?: string;
};

// ฟังก์ชันช่วยดึงจำนวนสต็อกคงคลังตั้งต้นของสินค้า 1 รายการ
function getOriginalStockQty(item: IssueDialogItem): number {
    const rawRecord = item as Record<string, unknown>;
    return Number(item.availableQty ?? rawRecord.qty ?? rawRecord.itemQty ?? 0);
}

// ฟังก์ชันสร้างรหัสอ้างอิงเฉพาะของแต่ละแถวใน Modal (ป้องกันข้อมูลซ้ำกัน)
function getDialogRowKey(item: IssueDialogItem): string {
    return `${item.id ?? 'item'}_${item.lotNo || ''}_${item.serialNo || ''}_${item.locationId || ''}`;
}

export function IssueItemTable({
    items,
    onChange,
    warehouseId,
    docId,
    readOnly = false,
    showPrice = true,
    showLotSerial = true,
    showLocation = true,
    showPutawayQty,
    statusCode,
    title = 'รายการสินค้าเบิกจ่าย (Issue Item List)',
    subtitle = 'เลือกสินค้าที่มีอยู่ในสต็อกคงคลัง (Inventory) ตามคลังสินค้าที่เลือก',
}: IssueItemTableProps) {
    // ─────────────────────────────────────────────────────────────
    // ส่วนที่ 1: State เก็บข้อมูลของหน้าจอ
    // ─────────────────────────────────────────────────────────────
    // เปิด/ปิด หน้าต่าง Modal เลือกสินค้า
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // คำค้นหา และ ตัวกรองสถานะสต็อกใน Modal
    const [modalSearch, setModalSearch] = useState('');
    const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all');

    // รายการที่ถูกติ๊กถูก (Checkbox) ใน Modal
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

    // รายการสินค้าคงคลังที่ดึงมาจาก API ตามคลังที่เลือก
    const [inventoryList, setInventoryList] = useState<IssueDialogItem[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);

    // ตรวจสอบว่าจะแสดงคอลัมน์ "จำนวนที่เบิกแล้ว (Picking Qty)" หรือไม่
    const isShowPickingQty = useMemo(() => {
        if (showPutawayQty !== undefined) return showPutawayQty;
        if (!statusCode) return false;

        const status = String(statusCode).trim().toLowerCase();
        const confirmedStatuses = [
            'confirm', 'confirmed', 'complete', 'completed',
            'approve', 'approved', 'picking', 'ยืนยัน', 'ยืนยันเอกสาร', 'สำเร็จ', 'เสร็จสิ้น',
        ];
        return confirmedStatuses.includes(status);
    }, [showPutawayQty, statusCode]);

    // ─────────────────────────────────────────────────────────────
    // ส่วนที่ 2: คำนวณยอดคงเหลือสุทธิ (ยอดในคลัง - ยอดที่เลือกใส่ตารางแล้ว)
    // ─────────────────────────────────────────────────────────────
    // รวมยอดสินค้าที่ถูกเลือกใส่ตารางหลักไปแล้ว แยกตามรหัสสต็อก (invId)
    const usedQtyByInvId = useMemo(() => {
        const map = new Map<string, number>();

        for (const row of items) {
            const invId = row.invId || row.id;
            if (invId) {
                const key = String(invId);
                const currentQty = map.get(key) || 0;
                map.set(key, currentQty + (Number(row.itemQty) || 0));
            }
        }
        return map;
    }, [items]);

    // ดึงจำนวนที่ถูกเลือกใส่ตารางไปแล้วของสินค้านั้น
    const getUsedQtyInTable = useCallback(
        (stockItem: IssueDialogItem): number => {
            if (!stockItem.id) return 0;
            return usedQtyByInvId.get(String(stockItem.id)) || 0;
        },
        [usedQtyByInvId]
    );

    // คำนวณยอดคงเหลือที่ยังสามารถเบิกเพิ่มได้
    const getRemainingStockQty = useCallback(
        (stockItem: IssueDialogItem): number => {
            const totalInStock = getOriginalStockQty(stockItem);
            const usedInTable = getUsedQtyInTable(stockItem);
            return Math.max(0, totalInStock - usedInTable);
        },
        [getUsedQtyInTable]
    );

    // ─────────────────────────────────────────────────────────────
    // ส่วนที่ 3: ดึงข้อมูลสต็อกจาก Inventory ตามคลังสินค้า (warehouseId)
    // ─────────────────────────────────────────────────────────────
    // เมื่อผู้ใช้เปลี่ยนคลังสินค้า (warehouseId) ให้ล้างรายการสต็อกเก่าใน Modal ทิ้งทันที
    useEffect(() => {
        setInventoryList([]);
        setSelectedRowKeys([]);
    }, [warehouseId]);

    // ฟังก์ชันดึงข้อมูลสินค้าคงคลังจาก API เฉพาะคลังที่เลือก
    const fetchInventoryItems = useCallback(async () => {
        if (!warehouseId) {
            setInventoryList([]);
            return;
        }

        setLoadingInventory(true);
        try {
            console.log('กำลังดึงข้อมูลสต็อกคงคลังจาก API ตาม warehouseId:', warehouseId, 'docId:', docId);

            const payload: Record<string, unknown> = {
                menuId: '85D356B7877647C49B61B71FB047E0B6',
                warehouseId: String(warehouseId),
            };

            if (docId) {
                payload.docId = String(docId);
            }

            // ส่งรายการที่เลือกไว้แล้วในตารางไปให้ Backend คำนวณควบคู่กัน
            if (items.length > 0) {
                payload.selectedItems = items.map((it) => ({
                    id: it.invId || it.id,
                    itemId: it.itemId,
                    itemQty: Number(it.itemQty) || 0,
                }));
            }

            const res = await inventoryService.issueInventoryList(payload);

            // ดึง Array รายการสินค้าออกจาก Response
            const rawData: IssueDialogItem[] = res?.success
                ? (Array.isArray(res.results?.data)
                    ? res.results.data
                    : Array.isArray(res.data)
                        ? res.data
                        : [])
                : [];

            // กรองเฉพาะสินค้าในคลังที่เลือก และตัดรายการที่ซ้ำกันออก
            const seenKeys = new Set<string>();
            const filteredByWarehouse: IssueDialogItem[] = [];

            for (const item of rawData) {
                // ถ้ารายการมีฟิลด์ warehouseId ติดมา ต้องตรงกับ warehouseId ที่เลือกเท่านั้น
                if (item.warehouseId && String(item.warehouseId) !== String(warehouseId)) {
                    continue;
                }

                const uniqueKey = getDialogRowKey(item);
                if (!seenKeys.has(uniqueKey)) {
                    seenKeys.add(uniqueKey);
                    filteredByWarehouse.push(item);
                }
            }

            setInventoryList(filteredByWarehouse);
        } catch (error) {
            console.error('ไม่สามารถดึงข้อมูลสต็อกคงคลังได้:', error);
            setInventoryList([]);
        } finally {
            setLoadingInventory(false);
        }
    }, [warehouseId, docId, items]);

    // เมื่อกดปุ่ม "เพิ่มรายการสินค้า"
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
        setStockFilter('all');
        setSelectedRowKeys([]);
        fetchInventoryItems();
        setIsAddModalOpen(true);
    };

    // ─────────────────────────────────────────────────────────────
    // ส่วนที่ 4: การกรองข้อมูลสินค้าใน Modal (ค้นหา + แท็บสถานะสต็อก)
    // ─────────────────────────────────────────────────────────────
    // นับจำนวนสินค้าแยกตามสถานะสต็อก เพื่อแสดงตัวเลขบนปุ่มตัวกรอง
    const stockCounts = useMemo(() => {
        let inStock = 0;
        let lowStock = 0;
        let outOfStock = 0;

        for (const item of inventoryList) {
            const remaining = getRemainingStockQty(item);
            if (remaining === 0) outOfStock++;
            else if (remaining <= 5) lowStock++;
            else inStock++;
        }

        return {
            all: inventoryList.length,
            inStock,
            lowStock,
            outOfStock,
        };
    }, [inventoryList, getRemainingStockQty]);

    // กรองรายการสินค้าใน Modal ตามปุ่มสถานะสต็อก และ คำค้นหา
    const filteredInventoryList = useMemo(() => {
        const keyword = modalSearch.trim().toLowerCase();

        return inventoryList.filter((item) => {
            const remaining = getRemainingStockQty(item);

            // 1. กรองตามแท็บสถานะสต็อก
            if (stockFilter === 'inStock' && remaining <= 5) return false;
            if (stockFilter === 'lowStock' && (remaining <= 0 || remaining > 5)) return false;
            if (stockFilter === 'outOfStock' && remaining > 0) return false;

            // 2. กรองตามคำค้นหา (รหัสสินค้า, ชื่อสินค้า, แบรนด์, ตำแหน่ง, หน่วยนับ, Lot/Serial)
            if (!keyword) return true;

            return (
                item.itemCode?.toLowerCase().includes(keyword) ||
                item.itemName?.toLowerCase().includes(keyword) ||
                item.brandName?.toLowerCase().includes(keyword) ||
                item.locationName?.toLowerCase().includes(keyword) ||
                item.uomName?.toLowerCase().includes(keyword) ||
                item.lotNo?.toLowerCase().includes(keyword) ||
                item.serialNo?.toLowerCase().includes(keyword)
            );
        });
    }, [inventoryList, modalSearch, stockFilter, getRemainingStockQty]);

    // ─────────────────────────────────────────────────────────────
    // ส่วนที่ 5: ฟังก์ชันจัดการตาราง (เพิ่ม / แก้ไข / ลบแถวสินค้า)
    // ─────────────────────────────────────────────────────────────
    // ฟังก์ชันกลางสำหรับแปลงข้อมูลสต็อก 1 รายการ ให้เป็นข้อมูลแถวในตารางเบิกจ่าย
    const createTableRow = (stockItem: IssueDialogItem, initQty: number): TransactionItem => {
        const price = Number(stockItem.itemPrice || stockItem.sellPrice || stockItem.buyPrice || 0);
        const totalAvail = getOriginalStockQty(stockItem);

        return {
            id: String(stockItem.id ?? ''),
            invId: stockItem.id ? String(stockItem.id) : undefined,
            itemId: String(stockItem.itemId ?? ''),
            itemCode: stockItem.itemCode || String(stockItem.itemId ?? ''),
            itemName: stockItem.itemName || '',
            uomId: stockItem.uomId ? String(stockItem.uomId) : undefined,
            uomName: stockItem.uomName || 'ชิ้น',
            locationId: stockItem.locationId ? String(stockItem.locationId) : undefined,
            locationName: stockItem.locationName || '-',
            itemQty: initQty,
            availableQty: totalAvail,
            putawayQty: 0,
            itemPrice: price,
            totalPrice: price * initQty,
            lotNo: stockItem.lotNo || '',
            serialNo: stockItem.serialNo || '',
            isLotNo: Boolean(stockItem.lotNo || stockItem.isLotNo),
            isSerialNo: Boolean(stockItem.serialNo || stockItem.isSerialNo),
            remark: '',
        };
    };

    // 5.1 เพิ่มสินค้าหลายรายการพร้อมกัน (จากที่ติ๊ก Checkbox ใน Modal)
    const handleAddSelectedItems = () => {
        const selectedStockItems = inventoryList.filter(
            (item) => item.id !== undefined && selectedRowKeys.includes(getDialogRowKey(item))
        );

        const updatedItems: TransactionItem[] = [...items];

        for (const stockItem of selectedStockItems) {
            const totalAvail = getOriginalStockQty(stockItem);

            // เช็คว่ามีสินค้านี้ในตารางหรือยัง (เทียบจากรหัสสต็อก invId)
            const existingRow = updatedItems.find(
                (row) => String(row.invId ?? row.id) === String(stockItem.id)
            );

            if (existingRow) {
                // ถ้ามีในตารางแล้ว ให้บวกจำนวนเพิ่ม 1 (แต่ไม่เกินยอดคงคลัง)
                const currentQty = Number(existingRow.itemQty) || 0;
                const maxQty = existingRow.availableQty || totalAvail;
                if (currentQty < maxQty) {
                    existingRow.itemQty = currentQty + 1;
                    existingRow.totalPrice = existingRow.itemQty * (existingRow.itemPrice || 0);
                }
            } else {
                // ถ้ายังไม่มีในตาราง ให้สร้างแถวใหม่
                const remaining = getRemainingStockQty(stockItem);
                const initQty = remaining > 0 ? 1 : 0;
                updatedItems.push(createTableRow(stockItem, initQty));
            }
        }

        onChange(updatedItems);
        setIsAddModalOpen(false);
    };

    // 5.2 เพิ่มสินค้าทีละ 1 รายการ (กดปุ่ม + ใน Modal)
    const handleAddSingleItem = (stockItem: IssueDialogItem) => {
        const totalAvail = getOriginalStockQty(stockItem);

        // เช็คว่ามีสินค้านี้ในตารางหรือยัง
        const existingRow = items.find(
            (row) => String(row.invId ?? row.id) === String(stockItem.id)
        );

        if (existingRow) {
            const currentQty = Number(existingRow.itemQty) || 0;
            const maxQty = existingRow.availableQty || totalAvail;
            if (currentQty < maxQty) {
                handleUpdateRow(existingRow.id, 'itemQty', currentQty + 1);
            }
            return;
        }

        const remaining = getRemainingStockQty(stockItem);
        const initQty = remaining > 0 ? 1 : 0;
        const newRow = createTableRow(stockItem, initQty);

        onChange([...items, newRow]);
    };

    // 5.3 แก้ไขข้อมูลในแถว (เช่น เปลี่ยนจำนวนเบิก หรือ เปลี่ยนราคาต่อหน่วย)
    const handleUpdateRow = (
        rowId: string,
        field: keyof TransactionItem,
        value: unknown
    ) => {
        const updatedItems = items.map((row) => {
            if (row.id !== rowId) return row;

            const updatedRow: TransactionItem = {
                ...row,
                [field]: value,
            };

            // ตรวจสอบไม่ให้จำนวนเบิกติดลบ หรือเกินยอดที่มีในคลัง
            if (field === 'itemQty') {
                let qty = Number(updatedRow.itemQty);
                if (Number.isNaN(qty) || qty < 0) qty = 0;

                if (updatedRow.availableQty !== undefined && updatedRow.availableQty > 0) {
                    if (qty > updatedRow.availableQty) {
                        qty = updatedRow.availableQty;
                    }
                }
                updatedRow.itemQty = qty;
            }

            // คำนวณราคารวมใหม่ = จำนวนเบิก x ราคาต่อหน่วย
            const qty = Number(updatedRow.itemQty) || 0;
            const price = Number(updatedRow.itemPrice) || 0;
            updatedRow.totalPrice = qty * price;

            return updatedRow;
        });

        onChange(updatedItems);
    };

    // 5.4 ลบแถวออกจากตาราง
    const handleDeleteRow = (rowId: string) => {
        onChange(items.filter((row) => row.id !== rowId));
    };

    // ─────────────────────────────────────────────────────────────
    // ส่วนที่ 6: คำนวณยอดรวมท้ายตาราง (Summary Footer)
    // ─────────────────────────────────────────────────────────────
    const totalQty = useMemo(
        () => items.reduce((sum, item) => sum + (Number(item.itemQty) || 0), 0),
        [items]
    );

    const totalPickingQty = useMemo(
        () => items.reduce((sum, item) => sum + (Number(item.pickingQty ?? item.putawayQty) || 0), 0),
        [items]
    );

    const grandTotalPrice = useMemo(
        () => items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0),
        [items]
    );

    // ─────────────────────────────────────────────────────────────
    // ส่วนแสดงผลหน้าจอ (UI)
    // ─────────────────────────────────────────────────────────────
    return (
        <Card className="w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
            {/* ── หัวตารางหลัก ── */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-800/40">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Package className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            {title}
                            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                แหล่งข้อมูล: สต็อกคงคลัง (Inventory)
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

            {/* ── ตารางแสดงรายการสินค้าที่เลือกเบิก ── */}
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

                                    {/* จำนวนเบิก */}
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
                                                        if (raw === '') {
                                                            handleUpdateRow(row.id, 'itemQty', 0);
                                                            return;
                                                        }
                                                        handleUpdateRow(row.id, 'itemQty', Number(raw));
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

                                    {/* จำนวนที่เบิกแล้ว (Picking Qty) */}
                                    {isShowPickingQty && (
                                        <TableCell className="text-right py-2.5">
                                            <span className="font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400">
                                                {(row.pickingQty ?? 0).toLocaleString()}
                                            </span>
                                        </TableCell>
                                    )}

                                    {/* หน่วยนับ (ดึงจาก Inventory ตรงๆ) */}
                                    <TableCell className="text-center py-2.5">
                                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                            {row.uomName || 'ชิ้น'}
                                        </span>
                                    </TableCell>

                                    {/* ตำแหน่งจัดเก็บ (ดึงจาก Inventory ตรงๆ) */}
                                    {showLocation && (
                                        <TableCell className="py-2.5">
                                            <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                                {row.locationName || '-'}
                                            </span>
                                        </TableCell>
                                    )}

                                    {/* ราคาต่อหน่วย */}
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

                                    {/* รวมเงิน */}
                                    {showPrice && (
                                        <TableCell className="text-right py-2.5 font-bold font-mono text-xs text-zinc-900 dark:text-zinc-100">
                                            {(row.totalPrice || row.itemQty * (row.itemPrice || 0)).toLocaleString(
                                                undefined,
                                                { minimumFractionDigits: 2 }
                                            )}
                                        </TableCell>
                                    )}

                                    {/* ปุ่มลบแถว */}
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

            {/* ── ส่วนท้ายตารางแสดงยอดสรุปรวม ── */}
            {items.length > 0 && (
                <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-4">
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

            {/* ── หน้าต่าง MODAL: เลือกสินค้าจากสต็อกคงคลัง (Inventory) ── */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-7xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-6 max-h-[92vh] flex flex-col gap-4">
                    <DialogHeader className="pb-1 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                                    <Package className="w-5 h-5" />
                                </div>
                                <div>
                                    <div>เลือกสินค้าจากสต็อกคงคลัง (Inventory Stock)</div>
                                    <div className="text-xs font-normal text-zinc-500">
                                        แสดงเฉพาะสินค้าที่มีอยู่ในคลังสินค้าที่เลือก
                                    </div>
                                </div>
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    {/* ช่องค้นหาสินค้า และ ปุ่มกรองสถานะสต็อก */}
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                value={modalSearch}
                                onChange={(e) => setModalSearch(e.target.value)}
                                placeholder="ค้นหารหัสสินค้า, ชื่อสินค้า, แบรนด์, ตำแหน่งจัดเก็บ, Lot/Serial..."
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

                        {/* ปุ่มกรองตามสถานะสต็อก */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                            <span className="text-zinc-400 text-[11px] font-medium mr-1">สถานะสต็อก:</span>
                            <button
                                type="button"
                                onClick={() => setStockFilter('all')}
                                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                                    stockFilter === 'all'
                                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300'
                                }`}
                            >
                                ทั้งหมด ({stockCounts.all})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStockFilter('inStock')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                                    stockFilter === 'inStock'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                พร้อมเบิก ({stockCounts.inStock})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStockFilter('lowStock')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                                    stockFilter === 'lowStock'
                                        ? 'bg-amber-600 text-white shadow-sm'
                                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                ใกล้หมด ({stockCounts.lowStock})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStockFilter('outOfStock')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                                    stockFilter === 'outOfStock'
                                        ? 'bg-rose-600 text-white shadow-sm'
                                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60'
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                หมดสต็อก ({stockCounts.outOfStock})
                            </button>

                            <div className="ml-auto text-zinc-400 text-xs">
                                แสดง <strong className="font-semibold text-zinc-700 dark:text-zinc-200">{filteredInventoryList.length}</strong> รายการ
                            </div>
                        </div>
                    </div>

                    {/* ตารางแสดงรายการสินค้าคงคลังใน Modal */}
                    <div className="max-h-[440px] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
                        <Table>
                            <TableHeader className="bg-zinc-50 dark:bg-zinc-800/90 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                                <TableRow className="border-b border-zinc-200 dark:border-zinc-700">
                                    <TableHead className="w-10 text-center py-2.5">
                                        <input
                                            type="checkbox"
                                            checked={
                                                filteredInventoryList.length > 0 &&
                                                selectedRowKeys.length === filteredInventoryList.length
                                            }
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedRowKeys(
                                                        filteredInventoryList.map((item) => getDialogRowKey(item))
                                                    );
                                                } else {
                                                    setSelectedRowKeys([]);
                                                }
                                            }}
                                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </TableHead>
                                    <TableHead className="w-28 py-2.5 text-xs font-semibold">รหัสสินค้า</TableHead>
                                    <TableHead className="py-2.5 text-xs font-semibold min-w-[240px]">รายละเอียดสินค้า</TableHead>
                                    <TableHead className="w-24 text-center py-2.5 text-xs font-semibold">ตำแหน่ง</TableHead>
                                    <TableHead className="w-28 text-right py-2.5 text-xs font-semibold">คงเหลือในคลัง</TableHead>
                                    <TableHead className="w-16 text-center py-2.5 text-xs font-semibold">หน่วย</TableHead>
                                    <TableHead className="w-24 text-right py-2.5 text-xs font-semibold">ราคาขาย</TableHead>
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
                                                <span className="text-[11px] text-zinc-400">
                                                    ลองเปลี่ยนคำค้นหา หรือสลับแท็บสถานะสต็อก
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredInventoryList.map((item, idx) => {
                                        if (!item.id) return null;

                                        const rowKey = getDialogRowKey(item);
                                        const isSelected = selectedRowKeys.includes(rowKey);
                                        const isAlreadyInTable = items.some(
                                            (row) => String(row.invId ?? row.id) === String(item.id)
                                        );

                                        const usedQty = getUsedQtyInTable(item);
                                        const remainingQty = getRemainingStockQty(item);
                                        const isOutOfStock = remainingQty === 0;

                                        return (
                                            <TableRow
                                                key={`${rowKey}-${idx}`}
                                                className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors text-xs ${
                                                    isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40' : ''
                                                } ${isOutOfStock ? 'opacity-70 bg-zinc-50/30' : ''}`}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedRowKeys((prev) => prev.filter((k) => k !== rowKey));
                                                    } else {
                                                        setSelectedRowKeys((prev) => [...prev, rowKey]);
                                                    }
                                                }}
                                            >
                                                {/* Checkbox */}
                                                <TableCell className="text-center py-2.5" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedRowKeys((prev) => [...prev, rowKey]);
                                                            } else {
                                                                setSelectedRowKeys((prev) => prev.filter((k) => k !== rowKey));
                                                            }
                                                        }}
                                                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </TableCell>

                                                {/* รหัสสินค้า */}
                                                <TableCell className="py-2.5">
                                                    <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-900/60">
                                                        {item.itemCode || item.id}
                                                    </span>
                                                </TableCell>

                                                {/* ชื่อสินค้า + แบรนด์ + Lot/Serial */}
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
                                                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-500">
                                                            {item.brandName && (
                                                                <span className="text-zinc-500 dark:text-zinc-400">
                                                                    แบรนด์: <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{item.brandName}</strong>
                                                                </span>
                                                            )}
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
                                                    </div>
                                                </TableCell>

                                                {/* ตำแหน่งจัดเก็บ */}
                                                <TableCell className="text-center py-2.5">
                                                    {item.locationName || item.locationId ? (
                                                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700">
                                                            {item.locationName || item.locationId}
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-400">-</span>
                                                    )}
                                                </TableCell>

                                                {/* ยอดคงเหลือในคลัง */}
                                                <TableCell className="text-right py-2.5 font-mono">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        {remainingQty === 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                หมดสต็อก
                                                            </span>
                                                        ) : remainingQty <= 5 ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                {remainingQty.toLocaleString()} (เหลือน้อย)
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                {remainingQty.toLocaleString()}
                                                            </span>
                                                        )}
                                                        {usedQty > 0 && (
                                                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                                                                (เลือกแล้ว {usedQty.toLocaleString()})
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* หน่วยนับ */}
                                                <TableCell className="text-center py-2.5 text-zinc-600 dark:text-zinc-400">
                                                    {item.uomName || 'ชิ้น'}
                                                </TableCell>

                                                {/* ราคาต่อหน่วย */}
                                                <TableCell className="text-right font-mono py-2.5 font-medium text-zinc-800 dark:text-zinc-200">
                                                    {Number(item.itemPrice || item.sellPrice || item.buyPrice || 0).toLocaleString()} ฿
                                                </TableCell>

                                                {/* ปุ่มกดเพิ่มทันที 1 รายการ */}
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

                    {/* ส่วนท้าย Modal */}
                    <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span>
                                เลือกอยู่ <strong className="font-semibold text-blue-600 dark:text-blue-400 font-mono text-sm">{selectedRowKeys.length}</strong> รายการ
                            </span>
                            <span className="text-zinc-300 dark:text-zinc-700">|</span>
                            <span>จากทั้งหมด {filteredInventoryList.length} รายการ</span>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-4 py-2 text-xs"
                            >
                                ปิด
                            </Button>
                            <Button
                                onClick={handleAddSelectedItems}
                                disabled={selectedRowKeys.length === 0}
                                className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50"
                            >
                                เพิ่มรายการที่เลือก ({selectedRowKeys.length})
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

export default IssueItemTable;
