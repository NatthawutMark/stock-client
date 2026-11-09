'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { masterService } from '@/app/_services/master';
import type { MastLocation, MastUom } from '@/lib/types';
import type { TransactionItem, IssueItemTableProps } from './types';
import Swal from 'sweetalert2';
import {
    Button, Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui';
import {
    Plus,
    Trash2,
    Search,
    Package,
    X,
} from 'lucide-react';
import { inventoryService } from '@/app/_services/inventory';

// โครงสร้างข้อมูลสินค้าสำหรับ Dialog เลือกสินค้าเบิกจ่าย
export type IssueDialogItem = {
    id?: string | number;
    itemId?: string | number;
    itemCode?: string;
    itemName?: string;
    brandName?: string;
    availableQty?: number;
    categoryName?: string;
    locationName?: string;
    locationId?: string | number;
    uomName?: string;
    uomId?: string | number;
    itemPrice?: number;
    sellPrice?: number;
    buyPrice?: number;
    lotNo?: string;
    serialNo?: string;
    isLotNo?: boolean;
    isLotno?: boolean;
    isSerialNo?: boolean;
    warehouseName?: string;
    warehouseId?: string | number;
    mfgDate?: string;
    expireDate?: string;
};

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
    title = 'รายการสินค้า (Item List)',
    subtitle = 'เลือกสินค้าจากฐานข้อมูล Master เพื่อนำเข้าสู่ระบบ',
}: IssueItemTableProps) {
    // ตรวจสอบว่าจะแสดงคอลัมน์ putawayQty (จำนวนที่รับเข้า) หรือไม่
    // แสดงเมื่อส่ง showPutawayQty=true หรือเมื่อสถานะเอกสารเป็น confirm (หรือหลังจาก confirm เช่น complete/approved)
    const isShowPutawayQty = useMemo(() => {
        if (showPutawayQty !== undefined) return showPutawayQty;
        if (!statusCode) return false;
        const normalized = String(statusCode).trim().toLowerCase();
        return [
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
        ].includes(normalized);
    }, [showPutawayQty, statusCode]);

    // ─────────────────────────────────────────────────────────────
    // 1. STATE MANAGEMENT
    // ─────────────────────────────────────────────────────────────
    // State สำหรับ Modal เลือกสินค้า
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalSearch, setModalSearch] = useState('');
    const [selectedItemIds, setSelectedItemIds] = useState<(string | number)[]>([]);
    const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all');

    // รายการสินค้าสำหรับ Dialog (จาก inventoryService.issueInventoryList)
    const [masterItemList, setMasterItemList] = useState<IssueDialogItem[]>([]);
    const [loadingMaster, setLoadingMaster] = useState(false);

    // ข้อมูลเสริมสำหรับ Dropdowns (ตำแหน่งจัดเก็บ และ หน่วยนับ)
    const [locationList, setLocationList] = useState<MastLocation[]>([]);
    const [uomList, setUomList] = useState<MastUom[]>([]);

    // สรุปยอดจำนวนสินค้าที่ถูกเบิกในตารางหลักตามรหัส Inventory ID (O(M))
    const deductedQtyMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const it of items) {
            const rowInvId = it.invId ?? it.id;
            if (rowInvId !== undefined && rowInvId !== null && rowInvId !== '') {
                const k = String(rowInvId);
                const qty = Number(it.itemQty) || 0;
                map.set(k, (map.get(k) || 0) + qty);
            }
        }
        return map;
    }, [items]);

    // สร้าง Unique Identifier ประจำแถวใน Dialog เพื่อป้องกัน ID ชนกันเมื่อมีสินค้าหลาย Lot/Location หรือ API ส่งข้อมูลซ้ำ
    const getItemRowId = useCallback((item: IssueDialogItem): string => {
        return `${item.id ?? 'item'}_${item.lotNo || ''}_${item.serialNo || ''}_${item.locationId || ''}`;
    }, []);

    // O(1) Instant Lookup - ดึงค่ายอดที่ถูกหักได้ทันทีจาก Map ตามรหัสสินค้า Inventory ID นั้นๆ โดยตรง
    const getDeductedQtyInTable = useCallback(
        (dialogItem: IssueDialogItem): number => {
            if (dialogItem?.id !== undefined && dialogItem?.id !== null) {
                return deductedQtyMap.get(String(dialogItem.id)) || 0;
            }
            return 0;
        },
        [deductedQtyMap]
    );

    // ยอดคงเหลือสุทธิหลังหักลบจำนวนที่ระบุในตารางแล้ว
    const getRemainingQty = useCallback(
        (dialogItem: IssueDialogItem): number => {
            const originalQty = Number(
                dialogItem.availableQty ??
                (dialogItem as Record<string, unknown>).qty ??
                (dialogItem as Record<string, unknown>).itemQty ??
                0
            );
            const deducted = getDeductedQtyInTable(dialogItem);
            return Math.max(0, originalQty - deducted);
        },
        [getDeductedQtyInTable]
    );

    // คำนวณจำนวนสต็อกแยกตามกลุ่มสำหรับ Filter Chips
    const stockCounts = useMemo(() => {
        let inStock = 0;
        let lowStock = 0;
        let outOfStock = 0;
        masterItemList.forEach((it) => {
            const qty = getRemainingQty(it);
            if (qty === 0) outOfStock++;
            else if (qty <= 5) lowStock++;
            else inStock++;
        });
        return {
            all: masterItemList.length,
            inStock,
            lowStock,
            outOfStock,
        };
    }, [masterItemList, getRemainingQty]);

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
    }, [warehouseId]);

    // ตัวเลือก Locations ที่กรองตามคลังถ้ามีการระบุ warehouseId
    const filteredLocations = useMemo(() => {
        if (!warehouseId) return locationList;
        return locationList.filter((l) => {
            return String(l.warehouseId) === String(warehouseId);
        });
    }, [locationList, warehouseId]);

    // ซิงค์ Location ของรายการในตารางเมื่อคลังเปลี่ยน ให้เป็น Location ของคลังใหม่
    useEffect(() => {
        if (!filteredLocations || filteredLocations.length === 0 || items.length === 0) return;

        const validLocIds = new Set(filteredLocations.map((l) => String(l.id)));
        let changed = false;

        const updated = items.map((item) => {
            if (item.locationId && !validLocIds.has(String(item.locationId))) {
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
    // 3. โหลดรายการสินค้าจาก API เมื่อเปิด Modal
    // ─────────────────────────────────────────────────────────────
    const fetchMasterItems = useCallback(async () => {
        setLoadingMaster(true);
        try {
            const payload: Record<string, unknown> = {
                menuId: '85D356B7877647C49B61B71FB047E0B6',
            };
            if (warehouseId) {
                payload.warehouseId = warehouseId;
            }
            if (docId) {
                payload.docId = docId;
            }
            // ส่งรายการสินค้าที่เลือกแล้วในตารางพร้อมจำนวนที่กรอก เพื่อให้ API นำไปหักลบยอดคงคลัง
            if (items && items.length > 0) {
                payload.selectedItems = items.map((it) => ({
                    id: it.invId || it.id,
                    itemId: it.itemId,
                    itemQty: Number(it.itemQty) || 0,
                }));
            }
            const res = await inventoryService.issueInventoryList(payload);
            const rawItemData: IssueDialogItem[] = (
                res?.success
                    ? (Array.isArray(res.results?.data)
                        ? res.results.data
                        : Array.isArray(res.data)
                            ? res.data
                            : [])
                    : []
            ) as IssueDialogItem[];

            // กรองรายการซ้ำซ้อนจาก API (กรณี Backend Query หรือ UNION กับ selectedItems แล้วได้ record ซ้ำ)
            const seenKeys = new Set<string>();
            const itemData: IssueDialogItem[] = [];
            for (const item of rawItemData) {
                const uniqueKey = getItemRowId(item);
                if (!seenKeys.has(uniqueKey)) {
                    seenKeys.add(uniqueKey);
                    itemData.push(item);
                }
            }

            setMasterItemList(itemData);
        } catch (err) {
            console.error('Failed to load items for issue:', err);
            setMasterItemList([]);
        } finally {
            setLoadingMaster(false);
        }
    }, [warehouseId, docId, items, getItemRowId]);

    // เมื่อกดปุ่ม "เพิ่มรายการสินค้า" -> เคลียร์ค่าค้นหา และดึงรายการล่าสุดตามคลัง
    const handleOpenAddModal = () => {
        if (!warehouseId) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาเลือกคลังสินค้าจ่ายออกก่อน',
                text: 'กรุณาระบุคลังสินค้าจ่ายออกที่ส่วนหัวเอกสาร เพื่อกรองรายการสินค้าตามคลังที่เลือก',
                confirmButtonColor: '#2563eb',
            });
            return;
        }
        setModalSearch('');
        setStockFilter('all');
        setSelectedItemIds([]);
        fetchMasterItems();
        setIsAddModalOpen(true);
    };

    // กรองสินค้าใน Modal ตามคำค้นหา และ แท็บสถานะสต็อก
    const filteredMasterItems = useMemo(() => {
        const q = modalSearch.trim().toLowerCase();
        return masterItemList.filter((it) => {
            const item = it as IssueDialogItem;
            const qty = getRemainingQty(item);

            // 1. กรองตามสถานะสต็อก
            if (stockFilter === 'inStock' && qty <= 5) return false;
            if (stockFilter === 'lowStock' && (qty <= 0 || qty > 5)) return false;
            if (stockFilter === 'outOfStock' && qty > 0) return false;

            // 2. กรองตามคำค้นหา
            if (!q) return true;
            return (
                item.itemCode?.toLowerCase().includes(q) ||
                item.itemName?.toLowerCase().includes(q) ||
                item.brandName?.toLowerCase().includes(q) ||
                item.locationName?.toLowerCase().includes(q) ||
                item.uomName?.toLowerCase().includes(q)
            );
        });
    }, [masterItemList, modalSearch, stockFilter, getRemainingQty]);

    // ─────────────────────────────────────────────────────────────
    // 4. ฟังก์ชันเพิ่มสินค้าเข้าตาราง (Add Items)
    // ─────────────────────────────────────────────────────────────
    // 4.1 เพิ่มหลายรายการพร้อมกันจาก Checkbox
    const handleAddSelectedItems = () => {
        const toAdd = masterItemList.filter(
            (m): m is IssueDialogItem & { id: string | number } =>
                m.id !== undefined && selectedItemIds.includes(getItemRowId(m))
        );
        const newItems: TransactionItem[] = [...items];

        toAdd.forEach((m) => {
            const uom = uomList.find((u) => u.id === m.uomId)?.name || m.uomName || 'ชิ้น';
            const matchedLoc = filteredLocations.find((l) => String(l.id) === String(m.locationId)) || filteredLocations[0];
            const price = Number(m.itemPrice || m.sellPrice || m.buyPrice || 0);
            const totalAvail = Number(
                m.availableQty ??
                (m as Record<string, unknown>).qty ??
                (m as Record<string, unknown>).itemQty ??
                0
            );

            // ตรวจสอบว่ามีรายการนี้อยู่ในตารางแล้วหรือไม่ (เทียบด้วย invId)
            const existing = newItems.find((it) => {
                const rowInvId = it.invId ?? it.id;
                return rowInvId !== undefined && rowInvId !== null && String(rowInvId) === String(m.id);
            });

            if (existing) {
                const currentQty = Number(existing.itemQty) || 0;
                const maxQty =
                    existing.availableQty !== undefined && existing.availableQty > 0
                        ? existing.availableQty
                        : totalAvail;
                if (currentQty < maxQty) {
                    existing.itemQty = currentQty + 1;
                    existing.totalPrice = existing.itemQty * (existing.itemPrice || 0);
                }
            } else {
                const remaining = Math.max(0, totalAvail - getDeductedQtyInTable(m));
                const initQty = remaining > 0 ? 1 : 0;
                newItems.push({
                    id: m.id,
                    itemId: String(m.itemId),
                    itemCode: m.itemCode || (m.itemId ? String(m.itemId) : ''),
                    itemName: m.itemName || '',
                    uomId: m.uomId,
                    uomName: m.uomName || uom,
                    itemQty: initQty,
                    availableQty: totalAvail,
                    putawayQty: 0,
                    itemPrice: price,
                    totalPrice: price * initQty,
                    lotNo: m.lotNo || '',
                    serialNo: m.serialNo || '',
                    isLotNo: Boolean(m.lotNo || m.isLotNo || m.isLotno),
                    isSerialNo: Boolean(m.serialNo || m.isSerialNo),
                    locationId: matchedLoc?.id ?? m.locationId ?? '',
                    locationName: m.locationName || matchedLoc?.name || matchedLoc?.code || '',
                    remark: '',
                    invId: m.id,
                });
            }
        });
        onChange(newItems);
        setIsAddModalOpen(false);
    };

    // 4.2 เพิ่มทันที 1 รายการจากการกดปุ่ม (+) ใน Modal
    const handleAddSingleItem = (m: IssueDialogItem) => {
        const uom = uomList.find((u) => u.id === m.uomId)?.name || m.uomName || 'ชิ้น';
        const matchedLoc = filteredLocations.find((l) => String(l.id) === String(m.locationId)) || filteredLocations[0];
        const price = Number(m.itemPrice || m.sellPrice || m.buyPrice || 0);
        const totalAvail = Number(
            m.availableQty ??
            (m as Record<string, unknown>).qty ??
            (m as Record<string, unknown>).itemQty ??
            0
        );

        // ตรวจสอบว่ามีรายการนี้อยู่ในตารางแล้วหรือไม่ (เทียบด้วย invId)
        const existing = items.find((it) => {
            const rowInvId = it.invId ?? it.id;
            return rowInvId !== undefined && rowInvId !== null && String(rowInvId) === String(m.id);
        });

        if (existing) {
            const currentQty = Number(existing.itemQty) || 0;
            const maxQty =
                existing.availableQty !== undefined && existing.availableQty > 0
                    ? existing.availableQty
                    : totalAvail;
            if (currentQty < maxQty) {
                handleUpdateRow(existing.id, 'itemQty', currentQty + 1);
            }
            return;
        }

        const remaining = Math.max(0, totalAvail - getDeductedQtyInTable(m));
        const initQty = remaining > 0 ? 1 : 0;

        const newRow: TransactionItem = {
            id: String(m.id),
            itemId: String(m.itemId),
            itemCode: m.itemCode || (m.itemId ? String(m.itemId) : ''),
            itemName: m.itemName || '',
            uomId: m.uomId,
            uomName: m.uomName || uom,
            itemQty: initQty,
            availableQty: totalAvail,
            putawayQty: 0,
            itemPrice: price,
            totalPrice: price * initQty,
            lotNo: m.lotNo || '',
            serialNo: m.serialNo || '',
            isLotNo: Boolean(m.lotNo || m.isLotNo || m.isLotno),
            isSerialNo: Boolean(m.serialNo || m.isSerialNo),
            locationId: matchedLoc?.id ?? m.locationId ?? '',
            locationName: m.locationName || matchedLoc?.name || matchedLoc?.code || '',
            remark: '',
            invId: m.id,
        };

        onChange([...items, newRow]);
    };

    // ─────────────────────────────────────────────────────────────
    // 5. ฟังก์ชันแก้ไขและลบแถวในตาราง
    // ─────────────────────────────────────────────────────────────
    const handleUpdateRow = (
        id: string | number,
        fieldOrUpdates: keyof TransactionItem | Partial<TransactionItem>,
        value?: unknown
    ) => {
        const updated = items.map((item) => {
            if (item.id === id) {
                const patch: Partial<TransactionItem> =
                    typeof fieldOrUpdates === 'string'
                        ? { [fieldOrUpdates]: value }
                        : fieldOrUpdates;

                const updatedItem = { ...item, ...patch };

                // ตรวจสอบ itemQty ไม่ให้ติดลบ และไม่เกิน availableQty
                if ('itemQty' in patch) {
                    const maxQty =
                        updatedItem.availableQty !== undefined && updatedItem.availableQty > 0
                            ? updatedItem.availableQty
                            : undefined;
                    let q = Number(updatedItem.itemQty);
                    if (Number.isNaN(q) || q < 0) q = 0;
                    if (maxQty !== undefined && q > maxQty) {
                        q = maxQty;
                    }
                    updatedItem.itemQty = q;
                }

                // คำนวณราคารวมอัตโนมัติเมื่อจำนวนหรือราคาต่อหน่วยเปลี่ยน
                if ('itemQty' in patch || 'itemPrice' in patch) {
                    const q = updatedItem.itemQty;
                    const p = updatedItem.itemPrice || 0;
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

    const totalPutawayQty = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.putawayQty) || 0), 0);
    }, [items]);

    const grandTotal = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    }, [items]);

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
                            <TableHead className="w-[125px] text-right font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                จำนวนเบิก
                            </TableHead>
                            {isShowPutawayQty && (
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
                            {/* <TableHead className="min-w-[140px] text-left font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300 py-3">
                                หมายเหตุ
                            </TableHead> */}
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
                                                    max={row.availableQty !== undefined && row.availableQty > 0 ? row.availableQty : undefined}
                                                    value={row.itemQty === 0 ? '' : row.itemQty}
                                                    onChange={(e) => {
                                                        const raw = e.target.value;
                                                        if (raw === '') {
                                                            handleUpdateRow(row.id, 'itemQty', 0);
                                                            return;
                                                        }
                                                        let val = Number(raw);
                                                        if (Number.isNaN(val) || val < 0) val = 0;
                                                        const maxQty =
                                                            row.availableQty !== undefined && row.availableQty > 0
                                                                ? row.availableQty
                                                                : undefined;
                                                        if (maxQty !== undefined && val > maxQty) {
                                                            val = maxQty;
                                                        }
                                                        handleUpdateRow(row.id, 'itemQty', val);
                                                    }}
                                                    onBlur={() => {
                                                        const maxQty =
                                                            row.availableQty !== undefined && row.availableQty > 0
                                                                ? row.availableQty
                                                                : undefined;
                                                        let val = Number(row.itemQty) || 1;
                                                        if (val < 1) val = 1;
                                                        if (maxQty !== undefined && val > maxQty) {
                                                            val = maxQty;
                                                        }
                                                        handleUpdateRow(row.id, 'itemQty', val);
                                                    }}
                                                    className="w-20 h-8 px-2 text-right text-xs font-bold font-mono rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                {row.availableQty !== undefined && (
                                                    <span
                                                        className={`text-[10px] font-mono leading-none ${row.availableQty - (Number(row.itemQty) || 0) <= 0
                                                            ? 'text-rose-500 font-semibold'
                                                            : 'text-zinc-400'
                                                            }`}
                                                        title={`เพดานสูงสุด: ${row.availableQty.toLocaleString()}`}
                                                    >
                                                        คงคลัง: {Math.max(0, row.availableQty - (Number(row.itemQty) || 0)).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* จำนวนที่จ่ายออก (Picking Qty) */}
                                    {isShowPutawayQty && (
                                        <TableCell className="text-right py-2.5">
                                            <span className="font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400">
                                                {(row.pickingQty ?? 0).toLocaleString()}
                                            </span>
                                        </TableCell>
                                    )}

                                    {/* หน่วยนับ */}
                                    <TableCell className="text-center py-2.5">
                                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                            {row.uomName || 'ชิ้น'}
                                        </span>
                                    </TableCell>

                                    {/* ตำแหน่งจัดเก็บปลายทาง */}
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
                                            {(row.totalPrice || (row.itemQty * (row.itemPrice || 0))).toLocaleString(
                                                undefined,
                                                { minimumFractionDigits: 2 }
                                            )}
                                        </TableCell>
                                    )}

                                    {/* หมายเหตุ */}
                                    {/* <TableCell className="py-2.5">
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
                                    </TableCell> */}

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

            {/* ── MODAL: หน้าต่างเลือกสินค้าสำหรับเบิกจ่าย (Rich Data & Layout) ── */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-7xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-6 max-h-[92vh] flex flex-col gap-4">
                    <DialogHeader className="pb-1 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                                    <Package className="w-5 h-5" />
                                </div>
                                <div>
                                    <div>เลือกสินค้าสำหรับเบิกจ่าย (Issue Items)</div>
                                    <div className="text-xs font-normal text-zinc-500">
                                        ค้นหาและเลือกสินค้าจากคลัง เพื่อนำมาสร้างรายการเบิกจ่าย
                                    </div>
                                </div>
                            </DialogTitle>
                            {/* {warehouseId && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 self-start sm:self-auto font-medium">
                                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                    <span>คลังสินค้า ID: <strong className="font-semibold text-blue-900 dark:text-blue-100">{warehouseId}</strong></span>
                                </div>
                            )} */}
                        </div>
                    </DialogHeader>

                    {/* ช่องค้นหาสินค้า และ Filter Chips */}
                    <div className="space-y-3">
                        {/* Search Input Bar */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                value={modalSearch}
                                onChange={(e) => setModalSearch(e.target.value)}
                                placeholder="ค้นหารหัสสินค้า, ชื่อสินค้า, แบรนด์, ตำแหน่งจัดเก็บ..."
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

                        {/* Stock Filter Chips */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                            <span className="text-zinc-400 text-[11px] font-medium mr-1">สถานะสต็อก:</span>
                            <button
                                type="button"
                                onClick={() => setStockFilter('all')}
                                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${stockFilter === 'all'
                                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300'
                                    }`}
                            >
                                ทั้งหมด ({stockCounts.all})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStockFilter('inStock')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${stockFilter === 'inStock'
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
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${stockFilter === 'lowStock'
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
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${stockFilter === 'outOfStock'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60'
                                    }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                หมดสต็อก ({stockCounts.outOfStock})
                            </button>

                            <div className="ml-auto text-zinc-400 text-xs">
                                แสดง <strong className="font-semibold text-zinc-700 dark:text-zinc-200">{filteredMasterItems.length}</strong> รายการ
                            </div>
                        </div>
                    </div>

                    {/* ตารางแสดงสินค้า Master */}
                    <div className="max-h-[440px] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
                        <Table>
                            <TableHeader className="bg-zinc-50 dark:bg-zinc-800/90 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                                <TableRow className="border-b border-zinc-200 dark:border-zinc-700">
                                    <TableHead className="w-10 text-center py-2.5">
                                        <input
                                            type="checkbox"
                                            checked={
                                                filteredMasterItems.length > 0 &&
                                                selectedItemIds.length === filteredMasterItems.length
                                            }
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedItemIds(
                                                        filteredMasterItems.map((i) => getItemRowId(i))
                                                    );
                                                } else {
                                                    setSelectedItemIds([]);
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
                                {loadingMaster ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-40 text-center text-zinc-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                <span className="text-xs">กำลังโหลดข้อมูลรายการสินค้า...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredMasterItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-40 text-center text-zinc-400 text-xs">
                                            <div className="flex flex-col items-center justify-center gap-1.5 py-6">
                                                <Package className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                                                <span className="font-medium text-zinc-600 dark:text-zinc-400">ไม่พบรายการสินค้าที่ตรงกับเงื่อนไข</span>
                                                <span className="text-[11px] text-zinc-400">ลองเปลี่ยนคำค้นหา หรือสลับแท็บสถานะสต็อก</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredMasterItems.map((item, idx) => {
                                        const invId = item.id;
                                        if (invId === undefined) return null;
                                        const rowId = getItemRowId(item);
                                        const rowKey = `dialog-row-${invId}-${item.lotNo || ''}-${item.serialNo || ''}-${item.locationId || ''}-${idx}`;
                                        const isSelected = selectedItemIds.includes(rowId);
                                        const inTable = items.find((it) => {
                                            const rowInvId = it.invId ?? it.id;
                                            return rowInvId !== undefined && rowInvId !== null && String(rowInvId) === String(invId);
                                        });
                                        const isAlreadyAdded = Boolean(inTable);
                                        const deductedQty = getDeductedQtyInTable(item);
                                        const qty = getRemainingQty(item);
                                        const isOutOfStock = qty === 0;

                                        return (
                                            <TableRow
                                                key={rowKey}
                                                className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors text-xs ${isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40' : ''
                                                    } ${isOutOfStock ? 'opacity-70 bg-zinc-50/30' : ''}`}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedItemIds((prev) => prev.filter((id) => id !== rowId));
                                                    } else {
                                                        setSelectedItemIds((prev) => [...prev, rowId]);
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
                                                                setSelectedItemIds((prev) => [...prev, rowId]);
                                                            } else {
                                                                setSelectedItemIds((prev) => prev.filter((id) => id !== rowId));
                                                            }
                                                        }}
                                                        className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </TableCell>

                                                {/* Item Code */}
                                                <TableCell className="py-2.5">
                                                    <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-900/60">
                                                        {item.itemCode || item.id || `ITM${item.id}`}
                                                    </span>
                                                </TableCell>

                                                {/* Item Info + Badges */}
                                                <TableCell className="py-2.5">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                                                {item.itemName}
                                                            </span>
                                                            {isAlreadyAdded && (
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
                                                            {item.lotNo ? (
                                                                <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono text-[10px]">
                                                                    Lot: {item.lotNo}
                                                                </span>
                                                            ) : item.isLotNo ? (
                                                                <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono text-[10px]">
                                                                    LOT
                                                                </span>
                                                            ) : null}
                                                            {item.serialNo ? (
                                                                <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono text-[10px]">
                                                                    S/N: {item.serialNo}
                                                                </span>
                                                            ) : item.isSerialNo ? (
                                                                <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono text-[10px]">
                                                                    S/N
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Location */}
                                                <TableCell className="text-center py-2.5">
                                                    {item.locationName || item.locationId ? (
                                                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700">
                                                            {item.locationName || item.locationId}
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-400">-</span>
                                                    )}
                                                </TableCell>

                                                {/* Available Stock */}
                                                <TableCell className="text-right py-2.5 font-mono">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        {qty === 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                หมดสต็อก
                                                            </span>
                                                        ) : qty <= 5 ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                {qty.toLocaleString()} (เหลือน้อย)
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                {qty.toLocaleString()}
                                                            </span>
                                                        )}
                                                        {deductedQty > 0 && (
                                                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                                                                (เลือกแล้ว {deductedQty.toLocaleString()})
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* UOM */}
                                                <TableCell className="text-center py-2.5 text-zinc-600 dark:text-zinc-400">
                                                    {item.uomName || 'ชิ้น'}
                                                </TableCell>

                                                {/* Sell/Buy Price */}
                                                <TableCell className="text-right font-mono py-2.5 font-medium text-zinc-800 dark:text-zinc-200">
                                                    {(Number(item.itemPrice || item.sellPrice || item.buyPrice || 0)).toLocaleString()} ฿
                                                </TableCell>

                                                {/* Action Button */}
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

                    <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span>
                                เลือกอยู่ <strong className="font-semibold text-blue-600 dark:text-blue-400 font-mono text-sm">{selectedItemIds.length}</strong> รายการ
                            </span>
                            <span className="text-zinc-300 dark:text-zinc-700">|</span>
                            <span>จากทั้งหมด {filteredMasterItems.length} รายการ</span>
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
                                disabled={selectedItemIds.length === 0}
                                className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50"
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

export default IssueItemTable;

