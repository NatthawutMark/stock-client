'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import { transactionService } from '@/app/_services/transaction';
import { extractList, extractErrorMessage } from '@/lib/utils';
import type { DocReceive, DocReceiveDetail, MastDocType, MastEmployee, MastVendor, MastWarehouse } from '@/lib/types';
import { MasterItemTable, TransactionItem } from '@/components/transaction';
import { Button, Card, CardContent, DatePicker, Label, SearchableSelect, renderStatusBadge } from '@/components/ui';
import Swal from 'sweetalert2';
import { Save, FileCheck, FileText, Layers } from 'lucide-react';

const MENU_ID = '00E03A994280450ABF7E2EE62A7AD4D6';

function mapDetailToTableItem(d: DocReceiveDetail, index: number): TransactionItem {
    const qty = Number(d.itemQty) || 1;
    const price = Number(d.itemPrice) || 0;
    return {
        id: d.id || `edit-item-${index}`,
        itemId: d.itemId ?? '',
        itemCode: d.itemCode || `ITM${d.itemId}`,
        itemName: d.itemName || '',
        uomId: d.uomId,
        uomName: d.uomName || 'ชิ้น',
        itemQty: qty,
        putawayQty: Number(d.putawayQty) || 0,
        itemPrice: price,
        totalPrice: qty * price,
        lotNo: d.lotNo || '',
        serialNo: d.serialNo || '',
        isLotNo: Boolean(d.isLotNo || d.lotNo),
        isSerialNo: Boolean(d.isSerialNo || d.serialNo),
        locationId: d.locationId,
        locationName: d.locationName || '',
        remark: d.remark || '',
    };
}

function ReceiveFormContent() {
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
    const [vendorId, setVendorId] = useState<string>('');
    const [docTypeId, setDocTypeId] = useState<string>('');
    const [docNoRef, setDocNoRef] = useState<string>('');
    const [employeeId, setEmployeeId] = useState<string>('');
    const [remark, setRemark] = useState<string>('');
    const [warehouseId, setWarehouseId] = useState<string>('');
    const [statusCode, setStatusCode] = useState<string>('DRAFT');

    // รายการสินค้าในเอกสาร
    const [items, setItems] = useState<TransactionItem[]>([]);

    // Master Dropdowns
    const [vendorList, setVendorList] = useState<MastVendor[]>([]);
    const [warehouseList, setWarehouseList] = useState<MastWarehouse[]>([]);
    const [employeeList, setEmployeeList] = useState<MastEmployee[]>([]);
    const [docTypeList, setDocTypeList] = useState<MastDocType[]>([]);

    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);

    useEffect(() => {
        setPageTitle(
            isEditMode
                ? 'แก้ไขใบรับสินค้า (Edit Goods Receive)'
                : 'สร้างใบรับสินค้า (Create Goods Receive)'
        );
    }, [isEditMode, setPageTitle]);

    // ─────────────────────────────────────────────────────────────
    // โหลดข้อมูลตัวเลือก Master Dropdowns
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadMasters = async () => {
            try {
                const [vendRes, whRes, empRes, dTypeRes] = await Promise.all([
                    masterService.vendors.list(),
                    masterService.warehouses.list(),
                    masterService.employees.list(),
                    masterService.docTypes.list({ menuId: MENU_ID }),
                ]);

                const warehouses = extractList<MastWarehouse>(whRes);
                setVendorList(extractList<MastVendor>(vendRes));
                setWarehouseList(warehouses);
                setEmployeeList(extractList<MastEmployee>(empRes));
                setDocTypeList(extractList<MastDocType>(dTypeRes));

                if (!isEditMode && warehouses.length > 0 && warehouses[0].id) {
                    setWarehouseId((prev) => prev || String(warehouses[0].id));
                }
            } catch (err) {
                console.error('Failed to load masters from DB:', err);
            }
        };

        loadMasters();
    }, [isEditMode]);

    // ─────────────────────────────────────────────────────────────
    // โหลดข้อมูลเอกสารเดิมเมื่ออยู่ในโหมดแก้ไข (Edit Mode)
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isEditMode || !editId) return;

        const loadEditDoc = async () => {
            setLoading(true);
            try {
                const res = await transactionService.receive.get(editId);
                const foundDoc: (DocReceive & { details?: DocReceiveDetail[] }) | null =
                    res?.success ? (res.results || res.data || null) : null;

                if (!foundDoc) {
                    await Swal.fire({
                        icon: 'error',
                        title: 'ไม่พบเอกสาร',
                        text: `ไม่พบเอกสารรับสินค้ารหัส #${editId} ในฐานข้อมูล`,
                    });
                    router.push('/transaction/receive');
                    return;
                }

                setDocNo(foundDoc.docNo || '');
                const rawDate = foundDoc.docDate || '';
                setDocDate(
                    rawDate.length >= 10
                        ? rawDate.slice(0, 10)
                        : new Date().toISOString().split('T')[0]
                );
                setVendorId(foundDoc.vendId ? String(foundDoc.vendId) : '');
                setDocTypeId(foundDoc.docTypeId ? String(foundDoc.docTypeId) : '');
                setDocNoRef(foundDoc.refDocNo || '');
                setEmployeeId(foundDoc.empId ? String(foundDoc.empId) : '');
                setRemark(foundDoc.remark || '');
                if (foundDoc.warehouseId) setWarehouseId(String(foundDoc.warehouseId));
                if (foundDoc.statusCode) setStatusCode(foundDoc.statusCode);

                const details = Array.isArray(foundDoc.details) ? foundDoc.details : [];
                setItems(details.map(mapDetailToTableItem));
            } catch (err) {
                console.error('Failed to load receive doc from API:', err);
                await Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'ไม่สามารถโหลดข้อมูลเอกสารจากฐานข้อมูลได้',
                });
                router.push('/transaction/receive');
            } finally {
                setLoading(false);
            }
        };

        loadEditDoc();
    }, [isEditMode, editId, router]);

    // ─────────────────────────────────────────────────────────────
    // ตรวจสอบความถูกต้องและบันทึกเอกสาร
    // ─────────────────────────────────────────────────────────────
    const validateForm = (): string | null => {
        if (!docDate) return 'กรุณาระบุวันที่เอกสาร (Doc Date)';
        if (!docTypeId) return 'กรุณาเลือกประเภทเอกสาร (Doc Type)';
        if (!employeeId) return 'กรุณาเลือกพนักงาน (Employee)';
        if (!warehouseId) return 'กรุณาเลือกคลังรับเข้า (Warehouse)';
        if (items.length === 0) return 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ';

        const invalidQty = items.find((i) => !i.itemQty || i.itemQty <= 0);
        if (invalidQty) {
            return `จำนวนสินค้าต้องมากกว่า 0 (ตรวจสอบ: ${invalidQty.itemName})`;
        }

        const invalidLotNo = items.find((i) => i.isLotNo && !i.lotNo?.trim());
        if (invalidLotNo) {
            return `กรุณาระบุ Lot No. สำหรับสินค้า: ${invalidLotNo.itemName}`;
        }

        const invalidSerialNo = items.find((i) => i.isSerialNo && !i.serialNo?.trim());
        if (invalidSerialNo) {
            return `กรุณาระบุ Serial No. สำหรับสินค้า: ${invalidSerialNo.itemName}`;
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
                refDocNo: docNoRef.trim(),
                empId: employeeId.trim() || undefined,
                vendId: vendorId || undefined,
                warehouseId: warehouseId || undefined,
                remark: remark.trim(),
                menuId: MENU_ID,
                docTypeId,
                statusCode: targetStatus,
                details: items.map((item) => {
                    const qty = Number(item.itemQty) || 1;
                    const price = Number(item.itemPrice) || 0;
                    return {
                        itemId: String(item.itemId),
                        itemCode: item.itemCode,
                        itemName: item.itemName,
                        uomId: item.uomId ? String(item.uomId) : undefined,
                        uomName: item.uomName,
                        itemQty: qty,
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
                const res = await transactionService.receive.update(editId, payload);
                if (res && res.success === false) {
                    throw new Error(res.message || 'ไม่สามารถแก้ไขเอกสารได้');
                }
            } else {
                const res = await transactionService.receive.create(payload);
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
                text: `${isEditMode ? 'อัปเดต' : 'สร้าง'}ใบรับสินค้าเรียบร้อยแล้ว`,
                timer: 1800,
                showConfirmButton: false,
            });

            const targetId = isEditMode ? editId : createdId;
            router.push(targetId ? `/transaction/receive/${targetId}` : '/transaction/receive');
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
                            ? 'แก้ไขใบรับสินค้า (Edit Goods Receive)'
                            : 'สร้างใบรับสินค้า (Create Goods Receive)'}
                    </h1>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {isEditMode
                            ? `กำลังแก้ไขข้อมูลเอกสารเลขที่ ${docNo}`
                            : 'บันทึกข้อมูลการรับสินค้าเข้าคลัง และระบุรายการสินค้า'}
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-400">สถานะ:</span>
                    {renderStatusBadge(statusCode)}
                </div>
            </div>

            {/* 1. ข้อมูลส่วนหัวเอกสาร */}
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
                                    <span className="text-red-500">*</span> พนักงาน :
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
                                    htmlFor="warehouse"
                                    className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-start sm:justify-end sm:text-right gap-1.5"
                                >
                                    <span className="text-red-500">*</span> คลังรับเข้า :
                                </Label>
                                <SearchableSelect
                                    id="warehouse"
                                    value={warehouseId}
                                    onChange={setWarehouseId}
                                    options={warehouseList.map((v) => ({
                                        value: String(v.id),
                                        label: `${v.code ? `[${v.code}] ` : ''}${v.warehouseName}`,
                                    }))}
                                    placeholder="-- เลือกคลังเก็บสินค้า (Warehouse) --"
                                    searchPlaceholder="ค้นหารหัส หรือคลังเก็บสินค้า..."
                                    clearable={false}
                                />
                            </div>
                        </div>

                        {/* คอลัมน์ขวา */}
                        <div className="space-y-4 min-w-0">
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-1.5 sm:gap-2">
                                <Label
                                    htmlFor="vendor"
                                    className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-start sm:justify-end sm:text-right gap-1.5"
                                >
                                    ผู้จำหน่าย :
                                </Label>
                                <SearchableSelect
                                    id="vendor"
                                    value={vendorId}
                                    onChange={setVendorId}
                                    options={vendorList.map((v) => ({
                                        value: String(v.id),
                                        label: `${v.vendCode ? `[${v.vendCode}] ` : ''}${v.vendName}`,
                                        subLabel: v.contactName
                                            ? `ผู้ติดต่อ: ${v.contactName}${v.tel ? ` (${v.tel})` : ''}`
                                            : v.tel
                                                ? `โทร: ${v.tel}`
                                                : undefined,
                                    }))}
                                    placeholder="-- เลือกผู้จำหน่าย (Vendor) --"
                                    searchPlaceholder="ค้นหารหัส หรือชื่อผู้จำหน่าย..."
                                    clearable
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-1.5 sm:gap-2">
                                <Label
                                    htmlFor="docNoRef"
                                    className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-start sm:justify-end sm:text-right gap-1.5"
                                >
                                    เอกสารอ้างอิง :
                                </Label>
                                <input
                                    id="docNoRef"
                                    type="text"
                                    value={docNoRef}
                                    onChange={(e) => setDocNoRef(e.target.value)}
                                    placeholder="เช่น เลขที่ PO, เลขที่ใบส่งของ..."
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
                                    rows={3}
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                    placeholder="ระบุหมายเหตุเพิ่มเติมของเอกสาร (ถ้ามี)..."
                                    className="w-full p-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. ตารางรายการสินค้าที่จะรับเข้า */}
            <div className="mb-6">
                <MasterItemTable
                    items={items}
                    onChange={setItems}
                    warehouseId={warehouseId}
                    statusCode={statusCode}
                    showPrice
                    showLotSerial
                    showLocation
                    title="รายการสินค้าที่จะรับเข้า (Receive Items)"
                    subtitle="เลือกสินค้าจาก Master Catalog เพื่อบันทึกการรับสินค้าเข้าคลัง"
                />
            </div>

            {/* 3. ปุ่มดำเนินการ (Actions) */}
            <div className="py-2 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
                <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/transaction/receive')}
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
                        {saving ? 'กำลังบันทึก...' : isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกรับสินค้า (Save)'}
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}

export default function ReceiveFormPage() {
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
            <ReceiveFormContent />
        </Suspense>
    );
}
