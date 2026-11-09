'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import { transactionService } from '@/app/_services/transaction';
import { inventoryService } from '@/app/_services/inventory';
import type { DocIssue, DocIssueDetail, MastCustomer, MastDocType, MastEmployee, MastWarehouse } from '@/lib/types';
import { TransactionItem, IssueItemTable } from '@/components/transaction';
import { Button, Card, CardContent, DatePicker, Label, SearchableSelect, renderStatusBadge } from '@/components/ui';
import Swal from 'sweetalert2';
import {
    Save, FileCheck, FileText, Layers,
} from 'lucide-react';

const MENU_ID = '85D356B7877647C49B61B71FB047E0B6';

function IssueFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');
    const isEditMode = Boolean(editId);

    const { setPageTitle } = useLayout();

    // ─────────────────────────────────────────────────────────────
    // Form Header States (อิงตาม DocIssue ใน lib/types/index.ts)
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

    // รายการสินค้าในเอกสาร (อิงตาม DocIssueDetail)
    const [items, setItems] = useState<TransactionItem[]>([]);

    // Master Dropdowns
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
        const title = isEditMode ? 'แก้ไขใบเบิกสินค้า (Edit Goods Issue)' : 'สร้างใบเบิกสินค้า (Create Goods Issue)';
        setPageTitle(title);
    }, [isEditMode, setPageTitle]);

    // ─────────────────────────────────────────────────────────────
    // 2. โหลด Master Dropdowns (Customer, Warehouse, Employee, DocType)
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

                // Customer
                const cData = custRes?.success
                    ? (Array.isArray(custRes.results) ? custRes.results : Array.isArray(custRes.data) ? custRes.data : [])
                    : [];
                setCustomerList(cData);

                // Warehouse
                const wData = whRes?.success
                    ? (Array.isArray(whRes.results) ? whRes.results : Array.isArray(whRes.data) ? whRes.data : [])
                    : [];
                setWarehouseList(wData);

                if (!isEditMode && wData.length > 0) {
                    setWarehouseId((prev) => prev || String(wData[0].id));
                }

                // Employee
                const eData = empRes?.success
                    ? (Array.isArray(empRes.results) ? empRes.results : Array.isArray(empRes.data) ? empRes.data : [])
                    : [];
                setEmployeeList(eData);

                // DocType
                const dTypeData = dTypeRes?.success
                    ? (Array.isArray(dTypeRes.results) ? dTypeRes.results : Array.isArray(dTypeRes.data) ? dTypeRes.data : [])
                    : [];
                setDocTypeList(dTypeData);
            } catch (err) {
                console.error('Failed to load masters for issue form:', err);
                setCustomerList([]);
                setWarehouseList([]);
                setEmployeeList([]);
                setDocTypeList([]);
            }
        };

        loadMasters();
    }, [isEditMode]);

    // ─────────────────────────────────────────────────────────────
    // 3. โหลดข้อมูลเมื่อเป็น Edit Mode หรือตั้งค่าเริ่มต้นสำหรับ Create Mode
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (isEditMode && editId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(true);
            const loadEditDoc = async () => {
                try {
                    const res = await transactionService.issue.get(editId);
                    if (res && res.success) {
                        const foundDoc: (DocIssue & { details?: DocIssueDetail[] }) | null = res?.success
                            ? (res.results || res.data)
                            : null;

                        if (foundDoc) {
                            setDocNo(foundDoc.docNo || '');
                            const rawDate = foundDoc.docDate || '';
                            setDocDate(rawDate.length >= 10 ? rawDate.slice(0, 10) : new Date().toISOString().split('T')[0]);
                            setCustomerId(foundDoc.custId ? String(foundDoc.custId) : '');
                            setDocTypeId(foundDoc.docTypeId ? String(foundDoc.docTypeId) : '');
                            setRefDocNo(foundDoc.refDocNo || '');
                            setBookingId(foundDoc.bookingId || '');
                            setEmployeeId(foundDoc.empId ? String(foundDoc.empId) : foundDoc.employeeId ? String(foundDoc.employeeId) : '');
                            setRemark(foundDoc.remark || '');
                            if (foundDoc.warehouseId) {
                                setWarehouseId(String(foundDoc.warehouseId));
                            }
                            if (foundDoc.statusCode) {
                                setStatusCode(foundDoc.statusCode);
                            }

                            // โหลดรายการสินค้าที่มีอยู่จริงจาก DB
                            const details = Array.isArray(foundDoc.details) ? foundDoc.details : [];
                            if (details.length > 0) {
                                // ดึงข้อมูลคงคลังล่าสุดของคลังนี้ (ส่ง docId ไปด้วยเพื่อให้ได้ยอดเพดานรวมที่ถูกต้อง)
                                const invStockMap = new Map<string, number>();
                                if (foundDoc.warehouseId) {
                                    try {
                                        const invRes = await inventoryService.issueInventoryList({
                                            warehouseId: foundDoc.warehouseId,
                                            docId: editId,
                                            menuId: MENU_ID,
                                        });
                                        const invData = invRes?.success
                                            ? (Array.isArray(invRes.results?.data)
                                                ? invRes.results.data
                                                : Array.isArray(invRes.data)
                                                    ? invRes.data
                                                    : [])
                                            : [];
                                        for (const item of invData) {
                                            const avail = Number(item.availableQty ?? (item as Record<string, unknown>).qty ?? 0);
                                            if (item.id !== undefined && item.id !== null) {
                                                invStockMap.set(String(item.id), avail);
                                            }
                                            if (item.itemId !== undefined && item.itemId !== null) {
                                                const key = `item_${item.itemId}`;
                                                if (!invStockMap.has(key)) {
                                                    invStockMap.set(key, avail);
                                                }
                                            }
                                        }
                                    } catch (err) {
                                        console.warn('Failed to load inventory stock for issue edit doc:', err);
                                    }
                                }

                                setItems(
                                    details.map((d: DocIssueDetail, index: number) => {
                                        const raw = d as unknown as Record<string, unknown>;
                                        const invId = (d.invId ?? raw.invId ?? raw.inventoryId ?? d.id) as string | number | undefined;
                                        const itemQty = Number(d.itemQty) || Number(d.bookingQty) || 1;

                                        // ค้นหายอดเพดานคงคลังจาก Inventory API
                                        let availableQty: number | undefined = undefined;
                                        if (invId !== undefined && invId !== null && invStockMap.has(String(invId))) {
                                            availableQty = invStockMap.get(String(invId));
                                        } else if (d.itemId !== undefined && invStockMap.has(`item_${d.itemId}`)) {
                                            availableQty = invStockMap.get(`item_${d.itemId}`);
                                        } else {
                                            // Fallback: ดึงจาก raw data ของ detail ใน DB
                                            const rawVal = raw.availableQty ?? raw.available_qty ?? raw.availableStock ?? raw.qty;
                                            if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
                                                // หาก DB ส่งยอดคงเหลือมา ให้รวมกับ itemQty ของเอกสารนี้เพื่อให้ได้เพดานรวม
                                                availableQty = Number(rawVal) + itemQty;
                                            }
                                        }

                                        // หากหาไม่พบ ให้ตั้งเพดานเริ่มต้นไม่ต่ำกว่ายอดที่เคยเบิกไว้
                                        if (availableQty === undefined || Number.isNaN(availableQty)) {
                                            availableQty = itemQty;
                                        }

                                        return {
                                            id: invId || d.id || `edit-item-${index}`,
                                            itemId: d.itemId ?? '',
                                            itemCode: d.itemCode || `ITM${d.itemId}`,
                                            itemName: d.itemName || '',
                                            uomId: d.uomId,
                                            uomName: d.uomName || 'ชิ้น',
                                            itemQty: itemQty,
                                            originalQty: itemQty,
                                            availableQty: availableQty,
                                            itemPrice: Number(d.itemPrice) || 0,
                                            totalPrice: itemQty * (Number(d.itemPrice) || 0),
                                            lotNo: d.lotNo || '',
                                            serialNo: d.serialNo || '',
                                            isLotNo: Boolean(d.isLotNo),
                                            isSerialNo: Boolean(d.isSerialNo),
                                            locationId: d.locationId,
                                            locationName: d.locationName || '',
                                            remark: d.remark || '',
                                            invId: invId,
                                        };
                                    })
                                );
                            } else {
                                setItems([]);
                            }

                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'ไม่พบเอกสาร',
                                text: `ไม่พบเอกสารเบิกสินค้ารหัส #${editId} ในฐานข้อมูล`,
                            });
                            router.push('/transaction/issue');
                        }
                    }
                } catch (err) {
                    console.error('Failed to load issue doc from API:', err);
                    Swal.fire({
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
        } else {
            setDocDate(new Date().toISOString().split('T')[0]);
            setItems([]);
        }
    }, [isEditMode, editId, router]);

    // ─────────────────────────────────────────────────────────────
    // จัดการการเปลี่ยนคลังสินค้า (ถ้ามีรายการสินค้าอยู่แล้ว ให้ถามยืนยันก่อนเคลียร์ตาราง)
    // ─────────────────────────────────────────────────────────────
    const handleWarehouseChange = async (newWhId: string) => {
        console.log('newWhId', newWhId);

        if (!newWhId || newWhId === warehouseId) return;

        // ถ้ามีสินค้าในตารางอย่างน้อย 1 ชิ้น ให้ถามยืนยันด้วย SweetAlert
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

            if (result.isConfirmed) {
                setWarehouseId(newWhId);
                setItems([]);
            }
        } else {
            setWarehouseId(newWhId);
            setItems([]);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // 4. บันทึกข้อมูลเอกสาร (Save / Submit)
    // ─────────────────────────────────────────────────────────────
    const handleSubmit = async (targetStatus: 'Draft' | 'Save' | 'Complete' | 'Confirm' = 'Save') => {
        // Validation
        if (!docDate) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาระบุวันที่เอกสาร (Doc Date)',
                confirmButtonColor: '#2563eb',
            });
            return;
        }

        if (!docTypeId) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาเลือกประเภทเอกสาร (Doc Type)',
                confirmButtonColor: '#2563eb',
            });
            return;
        }

        if (!employeeId) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาเลือกพนักงาน (Employee)',
                confirmButtonColor: '#2563eb',
            });
            return;
        }

        if (!warehouseId) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาเลือกคลังสินค้าจ่ายออก (Warehouse)',
                confirmButtonColor: '#2563eb',
            });
            return;
        }

        if (items.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ',
                text: 'ในตาราง "Table add Item" ด้านล่าง',
                confirmButtonColor: '#2563eb',
            });
            return;
        }

        // ตรวจสอบจำนวนสินค้า
        const invalidQty = items.find((i) => !i.itemQty || i.itemQty <= 0);
        if (invalidQty) {
            Swal.fire({
                icon: 'warning',
                title: 'จำนวนสินค้าต้องมากกว่า 0',
                text: `กรุณาตรวจสอบสินค้า: ${invalidQty.itemName}`,
                confirmButtonColor: '#2563eb',
            });
            return;
        }

        // ตรวจสอบจำนวนเบิกเกินยอดคงเหลือในคลัง
        const overQty = items.find(
            (i) => i.availableQty !== undefined && i.availableQty > 0 && Number(i.itemQty) > Number(i.availableQty)
        );
        if (overQty) {
            Swal.fire({
                icon: 'warning',
                title: 'จำนวนเบิกเกินยอดคงคลัง',
                text: `สินค้า "${overQty.itemName}" สามารถเบิกได้สูงสุด ${overQty.availableQty} แต่ระบุเบิก ${overQty.itemQty} กรุณาปรับลดจำนวน`,
                confirmButtonColor: '#2563eb',
            });
            return;
        }

        const invalidLotNo = items.find((i) => i.isLotNo && !i.lotNo?.trim());
        if (invalidLotNo) {
            Swal.fire({
                icon: 'warning',
                title: 'มีบางรายการไม่ได้ระบุ LotNo',
                text: `กรุณาตรวจสอบสินค้า: ${invalidLotNo.itemName}`,
                confirmButtonColor: '#2563eb',
            });
            return;
        }

        const invalidSerialNo = items.find((i) => i.isSerialNo && !i.serialNo?.trim());
        if (invalidSerialNo) {
            Swal.fire({
                icon: 'warning',
                title: 'มีบางรายการไม่ได้ระบุ Serial No',
                text: `กรุณาตรวจสอบสินค้า: ${invalidSerialNo.itemName}`,
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
                employeeId: employeeId.trim() || undefined,
                custId: customerId || undefined,
                warehouseId: warehouseId || undefined,
                remark: remark.trim(),
                menuId: MENU_ID,
                docTypeId,
                statusCode: targetStatus,
                details: items.map((item) => ({
                    id: item.id,
                    invId: item.invId, // รหัสคงคลัง Inventory ID สำหรับหักลบยอด
                    itemId: Number(item.itemId) || item.itemId,
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    bookingQty: Number(item.itemQty) || 1,
                    uomId: item.uomId ? (Number(item.uomId) || item.uomId) : undefined,
                    uomName: item.uomName,
                    itemQty: Number(item.itemQty) || 1,
                    pickingQty: 0,
                    itemPrice: Number(item.itemPrice) || 0,
                    totalPrice: Number(item.totalPrice) || ((Number(item.itemQty) || 1) * (Number(item.itemPrice) || 0)),
                    lotNo: item.lotNo || '',
                    serialNo: item.serialNo || '',
                    isLotNo: Boolean(item.isLotNo),
                    isSerialNo: Boolean(item.isSerialNo),
                    locationId: item.locationId ? (Number(item.locationId) || item.locationId) : undefined,
                    locationName: item.locationName || '',
                    remark: item.remark || '',
                })),
            };

            // แสดง Loading Modal ขณะกำลังบันทึกข้อมูล
            Swal.fire({
                title: 'กำลังบันทึกข้อมูล',
                html: 'โปรดรอสักครู่...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            let createdId: string | undefined = undefined;

            if (isEditMode && editId) {
                if (['Draft', 'Save'].includes(targetStatus)) {
                    const res = await transactionService.issue.update(editId, payload);
                    if (res && res.success === false) {
                        throw new Error(res.message || 'ไม่สามารถแก้ไขเอกสารได้');
                    }
                }
                if (['Confirm'].includes(targetStatus)) {
                    await transactionService.issue.confirm(editId);
                }
            } else {
                const res = await transactionService.issue.create(payload);
                if (res && (res as { success?: boolean }).success === false) {
                    throw new Error((res as { message?: string }).message || 'ไม่สามารถสร้างเอกสารได้');
                }

                // ดึง id เอกสารที่สร้างขึ้นใหม่จาก response
                if (res) {
                    const raw = res as unknown as Record<string, unknown>;
                    const data = (raw.results ?? raw.data ?? raw) as Record<string, unknown> | string;
                    if (typeof data === 'string' || typeof data === 'number') {
                        createdId = String(data);
                    } else if (data && typeof data === 'object') {
                        createdId = (data.id ?? data.docId ?? data.DocId ?? data.ID) as string;
                    }
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
            if (targetId) {
                router.push(`/transaction/issue/${targetId}`);
            } else {
                router.push('/transaction/issue');
            }

        } catch (error: unknown) {
            console.error('Save error:', error);
            let errMsg = 'ไม่สามารถบันทึกข้อมูลเอกสารได้';
            if (error instanceof Error) {
                errMsg = error.message;
            }
            const axiosErr = error as { response?: { data?: { message?: string; error?: string } } };
            if (axiosErr.response?.data?.message) {
                errMsg = axiosErr.response.data.message;
            } else if (axiosErr.response?.data?.error) {
                errMsg = axiosErr.response.data.error;
            }

            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: errMsg,
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
            {/* Top Navigation & Breadcrumb */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
                                <FileText className="w-5 h-5" />
                            </span>
                            {isEditMode ? 'แก้ไขใบเบิกสินค้า (Edit Goods Issue)' : 'สร้างใบเบิกสินค้า (Create Goods Issue)'}
                        </h1>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {isEditMode
                                ? `กำลังแก้ไขข้อมูลเอกสารเลขที่ ${docNo}`
                                : 'บันทึกข้อมูลการเบิกสินค้าออกจากคลัง และระบุรายการสินค้า'}
                        </p>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">สถานะ:</span>
                    {renderStatusBadge(statusCode)}
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                1. Form Header Section
                - Left Column: Docdate, DocType, Employee, Warehouse
                - Right Column: Customer, RefDocNo, BookingId, Remark
               ───────────────────────────────────────────────────────────── */}
            <Card className="mb-6 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-6 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                            ข้อมูลส่วนหัวเอกสาร (Document Header)
                        </span>
                    </div>
                    <span className="text-xs text-zinc-400">
                        {isEditMode ? 'โหมดแก้ไขข้อมูล' : 'โหมดสร้างเอกสารใหม่'}
                    </span>
                </div>

                <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* ─── ฝั่งซ้าย (Left Column) ─── */}
                        <div className="space-y-4">
                            {/* Docdate */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
                                <Label
                                    htmlFor="docDate"
                                    className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-end gap-1.5 select-none"
                                >
                                    <span className="text-red-500">*</span> วันที่เอกสาร :
                                </Label>
                                <DatePicker
                                    id="docDate"
                                    value={docDate}
                                    isRequire
                                    onChange={(val) => setDocDate(val)}
                                    placeholder="เลือกวันที่เอกสาร (Docdate)..."
                                    formatString="dd/MM/yyyy"
                                    className="h-10 text-sm font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                            </div>

                            {/* DocType */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
                                <Label htmlFor="docType" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 justify-end">
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

                            {/* Employee */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
                                <Label htmlFor="employee" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-end gap-1.5">
                                    <span className="text-red-500">*</span> พนักงานผู้เบิก :
                                </Label>
                                <div>
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
                            </div>

                            {/* Warehouse */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
                                <Label htmlFor="warehouseId" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-end gap-1.5">
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

                        {/* ─── ฝั่งขวา (Right Column) ─── */}
                        <div className="space-y-4">
                            {/* Customer */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
                                <Label htmlFor="customer" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-end gap-1.5">
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
                                            : (v.tel ? `โทร: ${v.tel}` : undefined),
                                    }))}
                                    placeholder="-- เลือกลูกค้า (Customer) --"
                                    searchPlaceholder="ค้นหารหัส หรือชื่อลูกค้า..."
                                    clearable
                                />
                            </div>

                            {/* RefDocNo */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
                                <Label htmlFor="refDocNo" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-end gap-1.5">
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

                            {/* BookingId (อิงตาม DocIssue) */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
                                <Label htmlFor="bookingId" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-end gap-1.5">
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

                            {/* Remark */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-start gap-2">
                                <Label htmlFor="remark" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 justify-end pt-2">
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

            {/* ─────────────────────────────────────────────────────────────
                2. Table Section: Table add Item (Reusable Component)
               ───────────────────────────────────────────────────────────── */}
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
                    title="Table add Item (รายการสินค้าที่จะเบิกออก)"
                    subtitle="เลือกสินค้าเพื่อบันทึกการเบิกจ่ายสินค้าออกจากคลัง"
                />
            </div>

            {/* ─────────────────────────────────────────────────────────────
                3. Action Button Section
               ───────────────────────────────────────────────────────────── */}
            <div className="py-2 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
                <div className="flex items-end gap-3">
                    {/* ปุ่มยกเลิก / ย้อนกลับ */}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/transaction/issue')}
                        className="px-4 py-2 text-sm rounded-xl border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        ยกเลิก (Cancel)
                    </Button>

                    {/* ปุ่มบันทึกฉบับร่าง */}
                    <Button
                        type="button"
                        variant="outline"
                        disabled={saving}
                        hidden={statusCode !== 'DRAFT'}
                        onClick={() => handleSubmit('Draft')}
                        className="px-4 py-2 text-sm rounded-xl border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1.5"
                    >
                        <Save className="w-4 h-4" />
                        บันทึกฉบับร่าง (Save Draft)
                    </Button>

                    {/* ปุ่มบันทึกเบิกสินค้า */}
                    <Button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSubmit('Save')}
                        className="px-5 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1.5"
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

