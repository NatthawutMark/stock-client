'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import { transactionService } from '@/app/_services/transaction';
import { inventoryService, type IssueInventoryList } from '@/app/_services/inventory';
import { extractList, extractErrorMessage } from '@/lib/utils';
import type { DocIssue, DocIssueDetail, MastCustomer, MastDocType, MastEmployee, MastWarehouse } from '@/lib/types';
import { TransactionItem, IssueItemTable } from '@/components/transaction';
import { Button, Card, CardContent, DatePicker, Label, SearchableSelect, renderStatusBadge } from '@/components/ui';
import Swal from 'sweetalert2';
import { Save, FileCheck, FileText, Layers } from 'lucide-react';

const MENU_ID = '85D356B7877647C49B61B71FB047E0B6';

/**
 * แปลงรายการสินค้าจากฐานข้อมูล (DocIssueDetail) ให้เป็นโครงสร้างตาราง (TransactionItem)
 */
function mapDetailToTableItem(
    detail: DocIssueDetail,
    index: number,
    invStockMap: Map<string, number>
): TransactionItem {
    const invId = detail.invId ?? detail.id;
    const itemQty = Number(detail.itemQty) || Number(detail.bookingQty) || 1;
    const price = Number(detail.itemPrice) || 0;

    // ดึงยอดคงเหลือสูงสุดจาก Inventory API (ถ้าไม่พบให้ใช้จำนวนที่เบิกในเอกสารนี้เป็นขั้นต่ำ)
    const stockAvail =
        (invId ? invStockMap.get(String(invId)) : undefined) ??
        (detail.itemId ? invStockMap.get(`item_${detail.itemId}`) : undefined) ??
        itemQty;

    return {
        id: String(invId || `edit-item-${index}`),
        invId: invId ? String(invId) : undefined,
        itemId: String(detail.itemId ?? ''),
        itemCode: detail.itemCode || `ITM${detail.itemId}`,
        itemName: detail.itemName || '',
        uomId: detail.uomId,
        uomName: detail.uomName || 'ชิ้น',
        itemQty,
        availableQty: Math.max(stockAvail, itemQty),
        itemPrice: price,
        totalPrice: itemQty * price,
        lotNo: detail.lotNo || '',
        serialNo: detail.serialNo || '',
        locationId: detail.locationId,
        locationName: detail.locationName || '',
        remark: detail.remark || '',
    };
}

function IssueFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');
    const isEditMode = Boolean(editId);

    const { setPageTitle } = useLayout();

    // ─────────────────────────────────────────────────────────────
    // ข้อมูลส่วนหัวเอกสาร (Form Header State)
    // ─────────────────────────────────────────────────────────────
    const [docNo, setDocNo] = useState<string>('');
    const [docDate, setDocDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [customerId, setCustomerId] = useState<string>('');
    const [docTypeId, setDocTypeId] = useState<string>('');
    const [refDocNo, setRefDocNo] = useState<string>('');
    const [bookingId, setBookingId] = useState<string>('');
    const [employeeId, setEmployeeId] = useState<string>('');
    const [remark, setRemark] = useState<string>('');
    const [warehouseId, setWarehouseId] = useState<string>('');
    const [statusCode, setStatusCode] = useState<string>('DRAFT');

    // รายการสินค้าในตาราง
    const [items, setItems] = useState<TransactionItem[]>([]);

    // ข้อมูลตัวเลือก Dropdown (Master Data)
    const [customerList, setCustomerList] = useState<MastCustomer[]>([]);
    const [warehouseList, setWarehouseList] = useState<MastWarehouse[]>([]);
    const [employeeList, setEmployeeList] = useState<MastEmployee[]>([]);
    const [docTypeList, setDocTypeList] = useState<MastDocType[]>([]);

    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);

    // ─────────────────────────────────────────────────────────────
    // 1. ตั้งชื่อหัวข้อหน้า
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        setPageTitle(
            isEditMode
                ? 'แก้ไขใบเบิกสินค้า (Edit Goods Issue)'
                : 'สร้างใบเบิกสินค้า (Create Goods Issue)'
        );
    }, [isEditMode, setPageTitle]);

    // ─────────────────────────────────────────────────────────────
    // 2. โหลดข้อมูลตัวเลือก Master Dropdowns
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadMasters = async () => {
            try {
                const [custRes, whRes, empRes, dTypeRes] = await Promise.all([
                    masterService.customers.list(),
                    masterService.warehouses.list(),
                    masterService.employees.list(),
                    masterService.docTypes.list({ menuId: MENU_ID }),
                ]);

                const warehouses = extractList<MastWarehouse>(whRes);
                setCustomerList(extractList<MastCustomer>(custRes));
                setWarehouseList(warehouses);
                setEmployeeList(extractList<MastEmployee>(empRes));
                setDocTypeList(extractList<MastDocType>(dTypeRes));

                if (!isEditMode && warehouses.length > 0 && warehouses[0].id) {
                    setWarehouseId((prev) => prev || String(warehouses[0].id));
                }
            } catch (err) {
                console.error('Failed to load masters for issue form:', err);
            }
        };

        loadMasters();
    }, [isEditMode]);

    // ─────────────────────────────────────────────────────────────
    // 3. โหลดข้อมูลเอกสารเดิมเมื่ออยู่ในโหมดแก้ไข (Edit Mode)
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isEditMode || !editId) return;

        const loadEditDoc = async () => {
            setLoading(true);
            try {
                const res = await transactionService.issue.get(editId);
                const foundDoc: (DocIssue & { details?: DocIssueDetail[] }) | null =
                    res?.success ? (res.results || res.data || null) : null;

                if (!foundDoc) {
                    await Swal.fire({
                        icon: 'error',
                        title: 'ไม่พบเอกสาร',
                        text: `ไม่พบเอกสารเบิกสินค้ารหัส #${editId} ในฐานข้อมูล`,
                    });
                    router.push('/transaction/issue');
                    return;
                }

                setDocNo(foundDoc.docNo || '');
                const rawDate = foundDoc.docDate || '';
                setDocDate(
                    rawDate.length >= 10
                        ? rawDate.slice(0, 10)
                        : new Date().toISOString().split('T')[0]
                );
                setCustomerId(foundDoc.custId ? String(foundDoc.custId) : '');
                setDocTypeId(foundDoc.docTypeId ? String(foundDoc.docTypeId) : '');
                setRefDocNo(foundDoc.refDocNo || '');
                setBookingId(foundDoc.bookingId || '');
                setEmployeeId(foundDoc.empId ? String(foundDoc.empId) : '');
                setRemark(foundDoc.remark || '');
                if (foundDoc.warehouseId) setWarehouseId(String(foundDoc.warehouseId));
                if (foundDoc.statusCode) setStatusCode(foundDoc.statusCode);

                const details = Array.isArray(foundDoc.details) ? foundDoc.details : [];
                if (details.length === 0) {
                    setItems([]);
                    return;
                }

                // ดึงยอดคงเหลือล่าสุดของคลังสินค้านี้ เพื่อใช้ตรวจเพดานการเบิกในตาราง
                const invStockMap = new Map<string, number>();
                if (foundDoc.warehouseId) {
                    try {
                        const invRes = await inventoryService.issueInventoryList({
                            warehouseId: String(foundDoc.warehouseId),
                            docId: editId,
                            menuId: MENU_ID,
                        });
                        for (const item of extractList<IssueInventoryList>(invRes)) {
                            const avail = Number(item.availableQty) || 0;
                            if (item.id) invStockMap.set(String(item.id), avail);
                            if (item.itemId && !invStockMap.has(`item_${item.itemId}`)) {
                                invStockMap.set(`item_${item.itemId}`, avail);
                            }
                        }
                    } catch (err) {
                        console.warn('Failed to load inventory stock for issue edit doc:', err);
                    }
                }

                setItems(details.map((d, idx) => mapDetailToTableItem(d, idx, invStockMap)));
            } catch (err) {
                console.error('Failed to load issue doc from API:', err);
                await Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'ไม่สามารถโหลดข้อมูลเอกสารจากฐานข้อมูลได้',
                });
                router.push('/transaction/issue');
            } finally {
                setLoading(false);
            }
        };

        loadEditDoc();
    }, [isEditMode, editId, router]);

    // ─────────────────────────────────────────────────────────────
    // 4. เปลี่ยนคลังสินค้า (ถามยืนยันก่อนล้างตารางหากเลือกสินค้าไว้แล้ว)
    // ─────────────────────────────────────────────────────────────
    const handleWarehouseChange = async (newWhId: string) => {
        if (!newWhId || newWhId === warehouseId) return;

        if (items.length > 0) {
            const selectedWh = warehouseList.find((w) => String(w.id) === String(newWhId));
            const whName = selectedWh
                ? `${selectedWh.code ? `[${selectedWh.code}] ` : ''}${selectedWh.warehouseName}`
                : `คลัง #${newWhId}`;

            const result = await Swal.fire({
                title: 'ยืนยันการเปลี่ยนคลังสินค้า?',
                text: `การเปลี่ยนคลังสินค้าเป็น "${whName}" จะล้างรายการสินค้าในตารางทั้งหมด (${items.length} รายการ) คุณต้องการดำเนินการต่อหรือไม่?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#2563eb',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'ใช่, ต้องการเปลี่ยน',
                cancelButtonText: 'ยกเลิก',
                reverseButtons: true,
            });

            if (!result.isConfirmed) return;
        }

        setWarehouseId(newWhId);
        setItems([]);
    };

    // ─────────────────────────────────────────────────────────────
    // 5. ตรวจสอบความถูกต้องและบันทึกเอกสาร
    // ─────────────────────────────────────────────────────────────
    const validateForm = (): string | null => {
        if (!docDate) return 'กรุณาระบุวันที่เอกสาร (Doc Date)';
        if (!docTypeId) return 'กรุณาเลือกประเภทเอกสาร (Doc Type)';
        if (!employeeId) return 'กรุณาเลือกพนักงานผู้เบิก (Employee)';
        if (!warehouseId) return 'กรุณาเลือกคลังสินค้าจ่ายออก (Warehouse)';
        if (items.length === 0) return 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ';

        const invalidQty = items.find((i) => !i.itemQty || i.itemQty <= 0);
        if (invalidQty) {
            return `จำนวนสินค้าต้องมากกว่า 0 (ตรวจสอบ: ${invalidQty.itemName})`;
        }

        const overQty = items.find(
            (i) =>
                i.availableQty !== undefined &&
                i.availableQty > 0 &&
                Number(i.itemQty) > Number(i.availableQty)
        );
        if (overQty) {
            return `สินค้า "${overQty.itemName}" เบิกได้สูงสุด ${overQty.availableQty} แต่ระบุเบิก ${overQty.itemQty}`;
        }

        return null;
    };

    const handleSubmit = async (targetStatus: 'Draft' | 'Save' = 'Save') => {
        const validationError = validateForm();
        if (validationError) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: validationError,
                confirmButtonColor: '#2563eb',
            });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                docDate,
                refDocNo: refDocNo.trim(),
                bookingId: bookingId.trim() || undefined,
                empId: employeeId.trim() || undefined,
                custId: customerId || undefined,
                warehouseId: warehouseId || undefined,
                remark: remark.trim(),
                menuId: MENU_ID,
                docTypeId,
                statusCode: targetStatus,
                details: items.map((item) => {
                    const qty = Number(item.itemQty) || 1;
                    const price = Number(item.itemPrice) || 0;
                    return {
                        id: item.id,
                        invId: item.invId,
                        itemId: String(item.itemId),
                        itemCode: item.itemCode,
                        itemName: item.itemName,
                        bookingQty: qty,
                        uomId: item.uomId ? String(item.uomId) : undefined,
                        uomName: item.uomName,
                        itemQty: qty,
                        pickingQty: 0,
                        itemPrice: price,
                        totalPrice: Number(item.totalPrice) || qty * price,
                        lotNo: item.lotNo || '',
                        serialNo: item.serialNo || '',
                        locationId: item.locationId ? String(item.locationId) : undefined,
                        locationName: item.locationName || '',
                        remark: item.remark || '',
                    };
                }),
            };

            Swal.fire({
                title: 'กำลังบันทึกข้อมูล',
                html: 'โปรดรอสักครู่...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading(),
            });

            let createdId: string | undefined;

            if (isEditMode && editId) {
                const res = await transactionService.issue.update(editId, payload);
                if (res && res.success === false) {
                    throw new Error(res.message || 'ไม่สามารถแก้ไขเอกสารได้');
                }
            } else {
                const res = await transactionService.issue.create(payload);
                if (res && res.success === false) {
                    throw new Error(res.message || 'ไม่สามารถสร้างเอกสารได้');
                }

                const data = (res?.results ?? res?.data ?? res) as Record<string, unknown> | string | undefined;
                if (typeof data === 'string' || typeof data === 'number') {
                    createdId = String(data);
                } else if (data && typeof data === 'object') {
                    createdId = String(data.id ?? data.docId ?? data.DocId ?? data.ID ?? '');
                }
            }

            await Swal.fire({
                icon: 'success',
                title: isEditMode ? 'แก้ไขเอกสารสำเร็จ' : 'สร้างเอกสารสำเร็จ',
                text: `${isEditMode ? 'อัปเดต' : 'สร้าง'}ใบเบิกสินค้าเรียบร้อยแล้ว`,
                timer: 1800,
                showConfirmButton: false,
            });

            const targetId = isEditMode ? editId : createdId;
            router.push(targetId ? `/transaction/issue/${targetId}` : '/transaction/issue');
        } catch (error: unknown) {
            console.error('Save error:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: extractErrorMessage(error, 'ไม่สามารถบันทึกข้อมูลเอกสารได้'),
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center h-80 gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-zinc-500">กำลังโหลดข้อมูลเอกสาร...</span>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            {/* ส่วนหัวหน้าจอ */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shrink-0">
                            <FileText className="w-5 h-5" />
                        </span>
                        {isEditMode
                            ? 'แก้ไขใบเบิกสินค้า (Edit Goods Issue)'
                            : 'สร้างใบเบิกสินค้า (Create Goods Issue)'}
                    </h1>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {isEditMode
                            ? `กำลังแก้ไขข้อมูลเอกสารเลขที่ ${docNo}`
                            : 'บันทึกข้อมูลการเบิกสินค้าออกจากคลัง และระบุรายการสินค้า'}
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-400">สถานะ:</span>
                    {renderStatusBadge(statusCode)}
                </div>
            </div>

            {/* 1. ส่วนหัวเอกสาร (Document Header) */}
            <Card className="mb-6 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                            ข้อมูลส่วนหัวเอกสาร (Document Header)
                        </span>
                    </div>
                    <span className="text-xs text-zinc-400">
                        {isEditMode ? 'โหมดแก้ไขข้อมูล' : 'โหมดสร้างเอกสารใหม่'}
                    </span>
                </div>

                <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
                        {/* คอลัมน์ซ้าย */}
                        <div className="space-y-4 min-w-0">
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-1.5 sm:gap-2">
                                <Label
                                    htmlFor="docDate"
                                    className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-start sm:justify-end sm:text-right gap-1.5 select-none"
                                >
                                    <span className="text-red-500">*</span> วันที่เอกสาร :
                                </Label>
                                <DatePicker
                                    id="docDate"
                                    value={docDate}
                                    isRequire
                                    onChange={setDocDate}
                                    placeholder="เลือกวันที่เอกสาร (Docdate)..."
                                    formatString="dd/MM/yyyy"
                                    className="h-10 text-sm font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-1.5 sm:gap-2">
                                <Label
                                    htmlFor="docType"
                                    className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 justify-start sm:justify-end sm:text-right"
                                >
                                    <span className="text-red-500">*</span> ประเภทเอกสาร :
                                </Label>
                                <SearchableSelect
                                    id="docType"
                                    value={docTypeId}
                                    onChange={setDocTypeId}
                                    options={docTypeList.map((v) => ({
                                        value: String(v.id),
                                        label: `${v.docTypeName || v.name || v.id}`,
                                    }))}
                                    placeholder="-- เลือกประเภทเอกสาร (DocType) --"
                                    searchPlaceholder="ค้นหารหัส หรือประเภทเอกสาร..."
                                    clearable={false}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-1.5 sm:gap-2">
                                <Label
                                    htmlFor="employee"
                                    className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-start sm:justify-end sm:text-right gap-1.5"
                                >
                                    <span className="text-red-500">*</span> พนักงานผู้เบิก :
                                </Label>
                                <SearchableSelect
                                    id="employee"
                                    value={employeeId}
                                    onChange={setEmployeeId}
                                    options={employeeList.map((v) => ({
                                        value: String(v.id),
                                        label: `${v.empCode ? `[${v.empCode}] ` : ''}${v.fName} ${v.lName}`,
                                        subLabel: v.tel ? `โทร: ${v.tel}` : '',
                                    }))}
                                    placeholder="-- เลือกพนักงาน (Employee) --"
                                    searchPlaceholder="ค้นหารหัส หรือชื่อพนักงาน..."
                                    clearable={false}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-1.5 sm:gap-2">
                                <Label
                                    htmlFor="warehouseId"
                                    className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-start sm:justify-end sm:text-right gap-1.5"
                                >
                                    <span className="text-red-500">*</span> คลังจ่ายออก :
                                </Label>
                                <SearchableSelect
                                    id="warehouseId"
                                    value={warehouseId}
                                    onChange={handleWarehouseChange}
                                    options={warehouseList.map((v) => ({
                                        value: String(v.id),
                                        label: `${v.code ? `[${v.code}] ` : ''}${v.warehouseName}`,
                                    }))}
                                    placeholder="-- เลือกคลังสินค้า (Warehouse) --"
                                    searchPlaceholder="ค้นหารหัส หรือคลังสินค้า..."
                                    clearable={false}
                                />
                            </div>
                        </div>

                        {/* คอลัมน์ขวา */}
                        <div className="space-y-4 min-w-0">
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-1.5 sm:gap-2">
                                <Label
                                    htmlFor="customer"
                                    className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-start sm:justify-end sm:text-right gap-1.5"
                                >
                                    ลูกค้า / ผู้เบิก :
                                </Label>
                                <SearchableSelect
                                    id="customer"
                                    value={customerId}
                                    onChange={setCustomerId}
                                    options={customerList.map((v) => ({
                                        value: String(v.id),
                                        label: `${v.custCode ? `[${v.custCode}] ` : ''}${v.custName}`,
                                        subLabel: v.contactName
                                            ? `ผู้ติดต่อ: ${v.contactName}${v.tel ? ` (${v.tel})` : ''}`
                                            : v.tel
                                                ? `โทร: ${v.tel}`
                                                : undefined,
                                    }))}
                                    placeholder="-- เลือกลูกค้า (Customer) --"
                                    searchPlaceholder="ค้นหารหัส หรือชื่อลูกค้า..."
                                    clearable
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-1.5 sm:gap-2">
                                <Label
                                    htmlFor="refDocNo"
                                    className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-start sm:justify-end sm:text-right gap-1.5"
                                >
                                    เอกสารอ้างอิง :
                                </Label>
                                <input
                                    id="refDocNo"
                                    type="text"
                                    value={refDocNo}
                                    onChange={(e) => setRefDocNo(e.target.value)}
                                    placeholder="เช่น เลขที่ SO, เลขที่ใบสั่งขาย..."
                                    className="w-full h-10 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-1.5 sm:gap-2">
                                <Label
                                    htmlFor="bookingId"
                                    className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-start sm:justify-end sm:text-right gap-1.5"
                                >
                                    เลขที่ใบจอง :
                                </Label>
                                <input
                                    id="bookingId"
                                    type="text"
                                    value={bookingId}
                                    onChange={(e) => setBookingId(e.target.value)}
                                    placeholder="เช่น รหัสการจองสินค้า (Booking ID)..."
                                    className="w-full h-10 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-start gap-1.5 sm:gap-2">
                                <Label
                                    htmlFor="remark"
                                    className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-start sm:justify-end sm:text-right sm:pt-2"
                                >
                                    หมายเหตุ :
                                </Label>
                                <textarea
                                    id="remark"
                                    rows={2}
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                    placeholder="ระบุหมายเหตุเพิ่มเติมของเอกสารเบิกสินค้า (ถ้ามี)..."
                                    className="w-full p-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. ส่วนตารางรายการสินค้าที่จะเบิกออก */}
            <div className="mb-6">
                <IssueItemTable
                    items={items}
                    onChange={setItems}
                    warehouseId={warehouseId}
                    docId={editId || undefined}
                    statusCode={statusCode}
                    showPrice
                    showLotSerial
                    showLocation
                    title="รายการสินค้าที่จะเบิกออก (Issue Items)"
                    subtitle="เลือกสินค้าที่มีในคลังเพื่อบันทึกการเบิกจ่ายสินค้าออกจากคลัง"
                />
            </div>

            {/* 3. ปุ่มดำเนินการ (Actions) */}
            <div className="py-2 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
                <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/transaction/issue')}
                        className="w-full sm:w-auto justify-center px-4 py-2 text-sm rounded-xl border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        ยกเลิก (Cancel)
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        disabled={saving}
                        hidden={statusCode.toUpperCase() !== 'DRAFT'}
                        onClick={() => handleSubmit('Draft')}
                        className="w-full sm:w-auto justify-center px-4 py-2 text-sm rounded-xl border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1.5"
                    >
                        <Save className="w-4 h-4" />
                        บันทึกฉบับร่าง (Save Draft)
                    </Button>

                    <Button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSubmit('Save')}
                        className="w-full sm:w-auto justify-center px-5 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1.5"
                    >
                        <FileCheck className="w-4 h-4" />
                        {saving ? 'กำลังบันทึก...' : isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกเบิกสินค้า (Save)'}
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}

export default function IssueFormPage() {
    return (
        <Suspense
            fallback={
                <AppLayout>
                    <div className="flex items-center justify-center h-80 text-zinc-500">
                        กำลังโหลดหน้าเอกสาร...
                    </div>
                </AppLayout>
            }
        >
            <IssueFormContent />
        </Suspense>
    );
}
