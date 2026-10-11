'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import { transactionService } from '@/app/_services/transaction';
import { docReceives, docReceiveDetails, vendors as mockVendors, warehouses as mockWarehouses, employees as mockEmployees } from '@/lib/mock/data';
import type { DocReceive, MastVendor, MastWarehouse } from '@/lib/types';
import { MasterItemTable, TransactionItem } from '@/components/transaction';
import { Button, Card, CardContent, DatePicker, Label } from '@/components/ui';
import Swal from 'sweetalert2';
import {
    Save, FileCheck, Building2, Calendar, FileText, Truck, User, Hash, Layers,
} from 'lucide-react';

function ReceiveFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');
    const isEditMode = Boolean(editId);

    const { setPageTitle } = useLayout();

    // ─────────────────────────────────────────────────────────────
    // Form Header States (ตาม Wireframe กล่องเขียวด้านบน)
    // - Left Column: DocNo, Docdate, Vendor
    // - Right Column: DocnoRef, Employee, Remark
    // ─────────────────────────────────────────────────────────────
    const [docNo, setDocNo] = useState<string>('');
    const [docDate, setDocDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [vendorId, setVendorId] = useState<string>('');
    const [vendorName, setVendorName] = useState<string>('');

    const [docNoRef, setDocNoRef] = useState<string>('');
    const [employeeId, setEmployeeId] = useState<string>('');
    const [remark, setRemark] = useState<string>('');

    // ฟิลด์เพิ่มเติมที่จำเป็นในระบบ WMS (เช่น คลังสินค้า)
    const [warehouseId, setWarehouseId] = useState<string>('');// 
    const [statusId, setStatusId] = useState<number>(1);
    const [docStatus, setDocStatus] = useState<string>('Draft');

    // รายการสินค้าในเอกสาร (ส่งให้ Table add Item Component)
    const [items, setItems] = useState<TransactionItem[]>([]);

    // Master Dropdowns
    const [vendorList, setVendorList] = useState<MastVendor[]>([]);
    const [warehouseList, setWarehouseList] = useState<MastWarehouse[]>([]);
    const [employeeList, setEmployeeList] = useState<{ id: string | number; name: string }[]>([]);

    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);

    // ─────────────────────────────────────────────────────────────
    // 1. ตั้งชื่อหัวข้อหน้า
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const title = isEditMode ? 'แก้ไขใบรับสินค้า (Edit Goods Receive)' : 'สร้างใบรับสินค้า (Create Goods Receive)';
        setPageTitle(title);
    }, [isEditMode, setPageTitle]);

    // ─────────────────────────────────────────────────────────────
    // 2. โหลด Master Dropdowns (Vendor, Warehouse, Employee)
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadMasters = async () => {
            try {
                const [vendRes, whRes] = await Promise.all([
                    masterService.vendors.list(),
                    masterService.warehouses.list(),
                ]);

                if (vendRes?.success && Array.isArray(vendRes.results) && vendRes.results.length > 0) {
                    setVendorList(vendRes.results);
                } else {
                    setVendorList(mockVendors);
                }

                if (whRes?.success && Array.isArray(whRes.results) && whRes.results.length > 0) {
                    setWarehouseList(whRes.results);
                } else {
                    setWarehouseList(mockWarehouses);
                }
            } catch {
                setVendorList(mockVendors);
                setWarehouseList(mockWarehouses);
            }

            // โหลดรายชื่อพนักงานจาก API, LocalStorage หรือ Mock
            try {
                const localUser = localStorage.getItem('wms-user');
                let currentUserName = '';
                if (localUser) {
                    const parsed = JSON.parse(localUser);
                    currentUserName = `${parsed.fName || ''} ${parsed.lName || ''}`.trim() || parsed.username || '';
                }

                let emps: { id: string | number; name: string }[] = [];
                try {
                    const empRes = await masterService.employees.list();
                    if (empRes?.success && Array.isArray(empRes.results) && empRes.results.length > 0) {
                        emps = empRes.results.map((e) => ({
                            id: e.id,
                            name: `${e.fName || ''} ${e.lName || ''}`.trim(),
                        }));
                    }
                } catch {
                    // API error fallback
                }

                if (emps.length === 0) {
                    emps = mockEmployees.map((e) => ({
                        id: e.id,
                        name: `${e.fName} ${e.lName}`,
                    }));
                }

                setEmployeeList(emps);

                if (!isEditMode && currentUserName) {
                    setEmployeeId(currentUserName);
                } else if (!isEditMode && emps.length > 0) {
                    setEmployeeId(emps[0].name);
                }
            } catch {
                setEmployeeList(mockEmployees.map((u) => ({ id: u.id, name: `${u.fName} ${u.lName}` })));
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
                    // ลองเรียก API หรือค้นหาจาก Mock
                    let foundDoc: DocReceive | undefined;
                    try {
                        const res = await transactionService.receive.get(Number(editId));
                        if (res?.success && res.results) {
                            foundDoc = res.results;
                        }
                    } catch {
                        // ignore API error
                    }

                    if (!foundDoc) {
                        foundDoc = docReceives.find((d) => String(d.id) === String(editId));
                    }

                    if (foundDoc) {
                        setDocNo(foundDoc.docNo || '');
                        const rawDate = foundDoc.docDate || '';
                        setDocDate(rawDate.length >= 10 ? rawDate.slice(0, 10) : new Date().toISOString().split('T')[0]);
                        setVendorId(foundDoc.vendorId ? String(foundDoc.vendorId) : '');
                        setDocNoRef(foundDoc.docNoRef || '');
                        setEmployeeId(String(foundDoc.employeeId));
                        setRemark(foundDoc.remark || '');
                        setWarehouseId(String(foundDoc.warehouseId));

                        // โหลดรายการสินค้าที่มีอยู่เดิม
                        const matchedDetails = docReceiveDetails.filter((d) => String(d.docId) === String(editId));
                        if (matchedDetails.length > 0) {
                            setItems(
                                matchedDetails.map((d, index) => ({
                                    id: d.id || `edit-item-${index}`,
                                    itemId: d.itemId,
                                    itemCode: d.itemCode || `ITM00${d.itemId}`,
                                    itemName: d.itemName,
                                    uomId: d.uomId,
                                    uomName: d.uomName || 'ชิ้น',
                                    itemQty: d.itemQty || 1,
                                    unitPrice: d.unitPrice || 0,
                                    totalPrice: (d.itemQty || 1) * (d.unitPrice || 0),
                                    lotNo: d.lotNo || '',
                                    serialNo: d.serialNo || '',
                                    locationId: d.locationId,
                                    locationName: d.locationName || '',
                                    remark: d.remark || '',
                                }))
                            );
                        } else {
                            // ถ้าไม่มี detail ให้สร้าง 1 รายการตัวอย่าง
                            setItems([
                                {
                                    id: 'initial-1',
                                    itemId: 1,
                                    itemCode: 'ITM001',
                                    itemName: 'โน๊ตบุ๊ค Dell Inspiron 15',
                                    uomId: 1,
                                    uomName: 'เครื่อง',
                                    itemQty: 5,
                                    unitPrice: 18000,
                                    totalPrice: 90000,
                                    lotNo: 'LOT-2024-01',
                                    serialNo: '',
                                    locationId: 1,
                                    locationName: 'ชั้น A แถว 01 ช่อง 01',
                                    remark: '',
                                },
                            ]);
                        }
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'ไม่พบเอกสาร',
                            text: `ไม่พบเอกสารรับสินค้ารหัส #${editId}`,
                        });
                        router.push('/transaction/receive');
                    }
                } finally {
                    setLoading(false);
                }
            };
            loadEditDoc();
        } else {
            // Create Mode: รันเลขที่เอกสารอัตโนมัติ
            const currentYear = new Date().getFullYear();
            const randomCode = Math.floor(1000 + Math.random() * 9000);
            setDocNo(`GR${currentYear}${randomCode}`);
            setDocDate(new Date().toISOString().split('T')[0]);
            setItems([]);
        }
    }, [isEditMode, editId, router]);

    // เมื่อเปลี่ยน Vendor ใน Dropdown
    const handleVendorChange = (idVal: string) => {
        setVendorId(idVal);
        const vend = vendorList.find((v) => String(v.id) === idVal);
        if (vend) {
            setVendorName(vend.vendName);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // 4. บันทึกข้อมูลเอกสาร (Save / Submit)
    // ─────────────────────────────────────────────────────────────
    const handleSubmit = async (targetStatus: 'Draft' | 'Completed' = 'Completed') => {
        // Validation
        if (!docNo.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณากรอกเลขที่เอกสาร (DocNo)',
                confirmButtonColor: '#2563eb',
            });
            return;
        }

        if (!docDate) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาระบุวันที่เอกสาร (Docdate)',
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

        setSaving(true);
        try {
            const currentStatusId = targetStatus === 'Completed' ? 3 : (statusId || 1);
            const currentStatusName = targetStatus;

            const payload: Partial<DocReceive> = {
                id: isEditMode && editId ? Number(editId) : Date.now(),
                docNo: docNo.trim(),
                docDate: docDate,
                docNoRef: docNoRef.trim(),
                employeeId: employeeId.trim(),
                vendorId: Number(vendorId) || 1,
                warehouseId: String(warehouseId),
                remark: remark.trim(),
                menuId: 1,
                isActive: true,
                isDelete: false,
                updateDate: new Date().toISOString(),
            };

            // บันทึกลง Mock data เพื่อให้หน้าหลักสามารถมองเห็นข้อมูลได้ทันที
            if (isEditMode && editId) {
                const idx = docReceives.findIndex((d) => String(d.id) === String(editId));
                if (idx !== -1) {
                    docReceives[idx] = { ...docReceives[idx], ...payload };
                }
            } else {
                docReceives.unshift({
                    ...payload,
                    id: payload.id || Date.now(),
                    createDate: new Date().toISOString(),
                    createBy: employeeId || 'admin',
                } as DocReceive);
            }

            await Swal.fire({
                icon: 'success',
                title: isEditMode ? 'แก้ไขเอกสารสำเร็จ' : 'สร้างเอกสารสำเร็จ',
                text: `${isEditMode ? 'อัปเดต' : 'สร้าง'}ใบรับสินค้าเลขที่ ${docNo} เรียบร้อยแล้ว`,
                timer: 1800,
                showConfirmButton: false,
            });

            router.push('/transaction/receive');
        } catch (error) {
            console.error('Save error:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถบันทึกข้อมูลเอกสารได้',
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
                    {/* <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/transaction/receive')}
                        className="h-9 px-3 rounded-xl border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        ย้อนกลับ (Back)
                    </Button> */}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
                                <FileText className="w-5 h-5" />
                            </span>
                            {isEditMode ? 'แก้ไขใบรับสินค้า (Edit Goods Receive)' : 'สร้างใบรับสินค้า (Create Goods Receive)'}
                        </h1>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {isEditMode
                                ? `กำลังแก้ไขข้อมูลเอกสารเลขที่ ${docNo}`
                                : 'บันทึกข้อมูลการรับสินค้าเข้าคลัง และระบุรายการสินค้า'}
                        </p>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">สถานะ:</span>
                    <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${docStatus === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            }`}
                    >
                        {docStatus === 'Completed' ? 'Completed (รับแล้ว)' : 'Draft (ร่าง)'}
                    </span>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                1. Form Header Section (ตรงตามส่วนกล่องสีเขียวใน Wireframe)
                - Left Column: DocNo, Docdate, Vendor
                - Right Column: DocnoRef, Employee, Remark
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
                            {/* 1. DocNo */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
                                <Label htmlFor="docNo" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                    <Hash className="w-3.5 h-3.5 text-blue-500" />
                                    DocNo <span className="text-red-500">*</span>
                                </Label>
                                <input
                                    id="docNo"
                                    type="text"
                                    value={docNo}
                                    onChange={(e) => setDocNo(e.target.value)}
                                    placeholder="เช่น GR2024001"
                                    className="w-full h-10 px-3.5 text-sm font-mono font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                            </div>

                            {/* 2. Docdate (Shadcn DatePicker) */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
                                <Label
                                    htmlFor="docDate"
                                    className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 select-none"
                                >
                                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                    Docdate <span className="text-red-500">*</span>
                                </Label>
                                <DatePicker
                                    id="docDate"
                                    value={docDate}
                                    onChange={(val) => setDocDate(val)}
                                    placeholder="เลือกวันที่เอกสาร (Docdate)..."
                                    formatString="dd/MM/yyyy"
                                    className="h-10 text-sm font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                            </div>

                            {/* 3. Vendor */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
                                <Label htmlFor="vendor" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                    <Truck className="w-3.5 h-3.5 text-blue-500" />
                                    Vendor <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="vendor"
                                    value={vendorId}
                                    onChange={(e) => handleVendorChange(e.target.value)}
                                    className="w-full h-10 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                                >
                                    <option value="">-- เลือกผู้จำหน่าย (Vendor) --</option>
                                    {vendorList.map((v) => (
                                        <option key={v.id} value={String(v.id)}>
                                            {v.vendCode ? `[${v.vendCode}] ` : ''}{v.vendName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* เสริม: Warehouse (คลังสินค้ารับเข้า) */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
                                <Label htmlFor="warehouse" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                                    คลังรับเข้า
                                </Label>
                                <select
                                    id="warehouse"
                                    value={warehouseId}
                                    onChange={(e) => setWarehouseId(e.target.value)}
                                    className="w-full h-10 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                                >
                                    {warehouseList.map((wh) => (
                                        <option key={wh.id} value={String(wh.id)}>
                                            {wh.warehouseName} ({wh.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ─── ฝั่งขวา (Right Column) ─── */}
                        <div className="space-y-4">
                            {/* 4. DocnoRef */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
                                <Label htmlFor="docNoRef" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                                    DocnoRef
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

                            {/* 5. Employee */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
                                <Label htmlFor="employeeId" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-blue-500" />
                                    Employee
                                </Label>
                                <div>
                                    <input
                                        id="employeeId"
                                        list="employeeId-options"
                                        type="text"
                                        value={employeeId}
                                        onChange={(e) => setEmployeeId(e.target.value)}
                                        placeholder="ชื่อผู้รับสินค้า / พนักงาน..."
                                        className="w-full h-10 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                    />
                                    <datalist id="employeeId-options">
                                        {employeeList.map((emp) => (
                                            <option key={emp.id} value={emp.name} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            {/* 6. Remark (ช่อง textarea สูงตาม Wireframe) */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-start gap-2">
                                <Label htmlFor="remark" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 pt-2">
                                    Remark
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

            {/* ─────────────────────────────────────────────────────────────
                2. Table Section: Table add Item (Reusable Component)
                - source="master" (สำหรับหน้า Receive)
                - รองรับการเอาไปใช้หน้าอื่นด้วย source="inventory"
               ───────────────────────────────────────────────────────────── */}
            <div className="mb-6">
                <MasterItemTable
                    items={items}
                    onChange={setItems}
                    warehouseId={warehouseId}
                    showPrice={true}
                    showLotSerial={true}
                    showLocation={true}
                    title="Table add Item (รายการสินค้าที่จะรับเข้า)"
                    subtitle="เลือกสินค้าจาก Master Catalog เพื่อบันทึกการรับสินค้าเข้าคลัง"
                />
            </div>

            {/* ─────────────────────────────────────────────────────────────
                3. Action Button Section (ตรงตามแถบสีเหลืองใน Wireframe)
               ───────────────────────────────────────────────────────────── */}
            <Card className="mb-6 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
                    {/* <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>รายการสินค้าทั้งหมด: <strong className="text-zinc-800 dark:text-zinc-200">{items.length}</strong> รายการ</span>
                        <span>•</span>
                        <span>จำนวนรวม: <strong className="text-zinc-800 dark:text-zinc-200">{items.reduce((s, i) => s + (Number(i.itemQty) || 0), 0)}</strong> ชิ้น</span>
                    </div> */}

                    <div className="flex items-end gap-3">
                        {/* ปุ่มยกเลิก / ย้อนกลับ */}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push('/transaction/receive')}
                            className="px-4 py-2 text-sm rounded-xl border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            ยกเลิก (Cancel)
                        </Button>

                        {/* ปุ่มบันทึกฉบับร่าง */}
                        <Button
                            type="button"
                            variant="outline"
                            disabled={saving}
                            onClick={() => handleSubmit('Draft')}
                            className="px-4 py-2 text-sm rounded-xl border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1.5"
                        >
                            <Save className="w-4 h-4" />
                            บันทึกฉบับร่าง (Save Draft)
                        </Button>

                        {/* ปุ่มบันทึกรับสินค้า / ยืนยัน */}
                        <Button
                            type="button"
                            disabled={saving}
                            onClick={() => handleSubmit('Completed')}
                            className="px-5 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1.5"
                        >
                            <FileCheck className="w-4 h-4" />
                            {saving ? 'กำลังบันทึก...' : isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกรับสินค้า (Save)'}
                        </Button>
                    </div>
                </div>
            </Card>

        </AppLayout>
    );
}

export default function ReceiveCreatePage() {
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
