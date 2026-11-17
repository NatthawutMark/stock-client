'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import { transactionService } from '@/app/_services/transaction';
import { extractList } from '@/lib/utils';
import type { DocIssue, DocIssueDetail, MastCustomer, MastWarehouse, MastDocType, MastEmployee } from '@/lib/types';
import { IssueItemTable, TransactionItem } from '@/components/transaction';
import { Button, Card, CardContent, Label, renderStatusBadge } from '@/components/ui';
import Swal from 'sweetalert2';
import {
    Building2,
    Calendar,
    FileText,
    User,
    Layers,
    Pencil,
    Hash,
    NotepadText,
    type LucideIcon,
    FileCheck,
    Bookmark,
} from 'lucide-react';

type EmployeeOption = { id: string | number; name: string };

const MENU_ID = '85D356B7877647C49B61B71FB047E0B6';

const toDateOnly = (raw?: string) =>
    raw && raw.length >= 10 ? raw.slice(0, 10) : new Date().toISOString().split('T')[0];

const toEmployeeOptions = (list: MastEmployee[]): EmployeeOption[] =>
    list.map((e) => ({
        id: e.id ?? '',
        name: `${e.fName || ''} ${e.lName || ''}`.trim(),
    }));

const toTransactionItem = (d: DocIssueDetail, index: number): TransactionItem => {
    const qty = Number(d.itemQty) || Number(d.bookingQty) || 1;
    const price = Number(d.itemPrice) || 0;
    const pickingQty = Number(d.pickingQty) || 0;
    return {
        id: d.id || `view-item-${index}`,
        itemId: d.itemId ?? '',
        itemCode: d.itemCode || `ITM${d.itemId}`,
        itemName: d.itemName || '',
        uomId: d.uomId,
        uomName: d.uomName || 'ชิ้น',
        itemQty: qty,
        pickingQty,
        itemPrice: price,
        totalPrice: qty * price,
        lotNo: d.lotNo || '',
        serialNo: d.serialNo || '',
        locationId: d.locationId,
        locationName: d.locationName || '',
        remark: d.remark || '',
    };
};

function InfoRow({
    icon: Icon,
    label,
    children,
    alignTop = false,
}: {
    icon: LucideIcon;
    label: string;
    children: React.ReactNode;
    alignTop?: boolean;
}) {
    return (
        <div className={`grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-1 sm:gap-2 min-w-0 ${alignTop ? 'items-start' : 'items-center'}`}>
            <Label className="text-xs sm:text-sm font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 select-none">
                <Icon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                {label}:
            </Label>
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 min-w-0 break-words">
                {children}
            </span>
        </div>
    );
}

function IssueDetailContent() {
    const router = useRouter();
    const params = useParams();
    const docId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || '';

    const { setPageTitle } = useLayout();

    const [doc, setDoc] = useState<DocIssue | null>(null);
    const [items, setItems] = useState<TransactionItem[]>([]);

    const [customerList, setCustomerList] = useState<MastCustomer[]>([]);
    const [warehouseList, setWarehouseList] = useState<MastWarehouse[]>([]);
    const [employeeList, setEmployeeList] = useState<EmployeeOption[]>([]);
    const [docTypeList, setDocTypeList] = useState<MastDocType[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);

    useEffect(() => {
        setPageTitle('รายละเอียดใบเบิกสินค้า (Goods Issue Detail)');
    }, [setPageTitle]);

    // โหลดข้อมูล Master ทั้งหมดพร้อมกัน
    useEffect(() => {
        const loadMasters = async () => {
            try {
                const [custRes, whRes, dTypeRes, empRes] = await Promise.all([
                    masterService.customers.list(),
                    masterService.warehouses.list(),
                    masterService.docTypes.list({ menuId: MENU_ID }),
                    masterService.employees.list(),
                ]);
                setCustomerList(extractList<MastCustomer>(custRes));
                setWarehouseList(extractList<MastWarehouse>(whRes));
                setDocTypeList(extractList<MastDocType>(dTypeRes));
                setEmployeeList(toEmployeeOptions(extractList<MastEmployee>(empRes)));
            } catch {
                setCustomerList([]);
                setWarehouseList([]);
                setDocTypeList([]);
                setEmployeeList([]);
            }
        };

        loadMasters();
    }, []);

    // โหลดข้อมูลเอกสารใบเบิกสินค้า
    useEffect(() => {
        if (!docId) return;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        const loadDoc = async () => {
            try {
                let foundDoc: (DocIssue & { details?: DocIssueDetail[] }) | undefined;
                try {
                    const res = await transactionService.issue.get(docId);
                    if (res?.success && (res.results || res.data)) {
                        foundDoc = (res.results || res.data) as DocIssue & { details?: DocIssueDetail[] };
                    }
                } catch (err) {
                    console.error('Fetch issue document failed:', err);
                }

                if (!foundDoc) {
                    await Swal.fire({
                        icon: 'error',
                        title: 'ไม่พบเอกสาร',
                        text: `ไม่พบเอกสารเบิกสินค้ารหัส #${docId} ในฐานข้อมูล`,
                    });
                    router.push('/transaction/issue');
                    return;
                }

                setDoc(foundDoc);
                setItems((foundDoc.details ?? []).map(toTransactionItem));
            } finally {
                setLoading(false);
            }
        };

        loadDoc();
    }, [docId, router]);

    const docNo = doc?.docNo || '';
    const docDate = doc ? toDateOnly(doc.docDate) : '';
    const refDocNo = doc?.refDocNo || '';
    const bookingId = doc?.bookingId || '';
    const remark = doc?.remark || '';
    const customerId = String(doc?.custId || '');
    const employeeId = String(doc?.empId || '');
    const warehouseId = String(doc?.warehouseId || '');
    const docTypeId = String(doc?.docTypeId || '');
    const statusCode = String(doc?.statusCode || doc?.statusName || 'Draft');
    const normalizedStatus = statusCode.toUpperCase();

    const customerDisplayName = useMemo(() => {
        const cust = customerList.find((c) => String(c.id) === customerId);
        if (!cust) return doc?.custName || customerId || '-';
        return cust.custCode ? `[${cust.custCode}] ${cust.custName}` : cust.custName;
    }, [customerList, customerId, doc?.custName]);

    const warehouseDisplayName = useMemo(() => {
        const wh = warehouseList.find((w) => String(w.id) === warehouseId);
        return wh ? `${wh.warehouseName} (${wh.code})` : doc?.warehouseName || warehouseId || '-';
    }, [warehouseList, warehouseId, doc?.warehouseName]);

    const employeeDisplayName = useMemo(() => {
        const emp = employeeList.find((e) => String(e.id) === employeeId || e.name === employeeId);
        return emp?.name || doc?.empName || employeeId || '-';
    }, [employeeList, employeeId, doc?.empName]);

    const docTypeDisplayName = useMemo(() => {
        const dt = docTypeList.find((d) => String(d.id) === docTypeId);
        return dt?.docTypeName || dt?.name || doc?.menuName || docTypeId || '-';
    }, [docTypeList, docTypeId, doc?.menuName]);

    const handleConfirm = async () => {
        const result = await Swal.fire({
            title: 'ยืนยันการเบิกสินค้า?',
            text: `ต้องการยืนยันเอกสารเลขที่ ${docNo || docId} ใช่หรือไม่`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#2563eb',
        });

        if (!result.isConfirmed) return;

        setSaving(true);
        try {
            Swal.fire({
                title: 'กำลังบันทึกข้อมูล',
                html: 'โปรดรอสักครู่...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading(),
            });

            await transactionService.issue.confirm(docId);
            setDoc((prev) => (prev ? { ...prev, statusCode: 'CONFIRM' } : null));

            await Swal.fire({
                icon: 'success',
                title: 'ยืนยันเอกสารสำเร็จ',
                text: 'ยืนยันใบเบิกสินค้าเรียบร้อยแล้ว',
                timer: 1800,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error('Confirm error:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถยืนยันเอกสารได้',
            });
        } finally {
            setSaving(false);
        }
    };

    const handlePicking = async () => {
        const result = await Swal.fire({
            title: 'ยืนยันการจ่ายสินค้าออกคลัง?',
            text: `ต้องการยืนยันการจ่ายสินค้าตามเอกสารเลขที่ ${docNo || docId} ใช่หรือไม่`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#16a34a',
        });

        if (!result.isConfirmed) return;

        setSaving(true);
        try {
            Swal.fire({
                title: 'กำลังบันทึกข้อมูล',
                html: 'โปรดรอสักครู่...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading(),
            });

            await transactionService.issue.picking(docId);
            setDoc((prev) => (prev ? { ...prev, statusCode: 'COMPLETED' } : null));

            // โหลดรายละเอียดเอกสารใหม่เพื่ออัปเดตตัวเลขจำนวนที่เบิกแล้ว (pickingQty)
            const refreshed = await transactionService.issue.get(docId);
            const updatedDoc = refreshed?.results || refreshed?.data;
            if (updatedDoc?.details) {
                setItems(updatedDoc.details.map(toTransactionItem));
            }

            await Swal.fire({
                icon: 'success',
                title: 'จ่ายสินค้าออกคลังสำเร็จ',
                text: 'บันทึกจ่ายสินค้าออกจากคลังเรียบร้อยแล้ว',
                timer: 1800,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error('Picking error:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถบันทึกจ่ายสินค้าออกคลังได้',
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

    const isLocked = ['CANCEL', 'CANCELLED', 'CONFIRM', 'COMPLETE', 'COMPLETED'].includes(normalizedStatus);

    return (
        <AppLayout>
            {/* ส่วนหัวหน้าจอ */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shrink-0">
                            <FileText className="w-5 h-5" />
                        </span>
                        รายละเอียดใบเบิกสินค้า (Goods Issue Detail)
                    </h1>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                        เลขที่เอกสาร: {docNo || `#${docId}`}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-400">สถานะ:</span>
                    {renderStatusBadge(statusCode)}
                </div>
            </div>

            {/* 1. ข้อมูลส่วนหัวเอกสาร (View Only) */}
            <Card className="mb-6 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                            ข้อมูลส่วนหัวเอกสาร (Document Header)
                        </span>
                    </div>
                    <span className="text-xs font-mono text-zinc-400">ID: {docId}</span>
                </div>

                <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
                        <div className="space-y-3 sm:space-y-4 min-w-0">
                            <InfoRow icon={Calendar} label="วันที่เอกสาร">
                                {docDate || '-'}
                            </InfoRow>
                            <InfoRow icon={Layers} label="ประเภทเอกสาร">
                                {docTypeDisplayName}
                            </InfoRow>
                            <InfoRow icon={User} label="พนักงานผู้เบิก">
                                {employeeDisplayName}
                            </InfoRow>
                            <InfoRow icon={Building2} label="คลังจ่ายออก">
                                {warehouseDisplayName}
                            </InfoRow>
                        </div>

                        <div className="space-y-3 sm:space-y-4 min-w-0">
                            <InfoRow icon={User} label="ลูกค้า / ผู้เบิก">
                                {customerDisplayName}
                            </InfoRow>
                            <InfoRow icon={Hash} label="เอกสารอ้างอิง">
                                <span className="font-mono">{refDocNo || '-'}</span>
                            </InfoRow>
                            <InfoRow icon={Bookmark} label="เลขที่ใบจอง">
                                <span className="font-mono">{bookingId || '-'}</span>
                            </InfoRow>
                            <InfoRow icon={NotepadText} label="หมายเหตุ" alignTop>
                                <span className="whitespace-pre-wrap">{remark || '-'}</span>
                            </InfoRow>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. ตารางรายการสินค้าที่เบิกจ่าย (Read Only) */}
            <div className="mb-6">
                <IssueItemTable
                    items={items}
                    onChange={setItems}
                    warehouseId={warehouseId}
                    statusCode={statusCode}
                    readOnly
                    showPrice
                    showLotSerial
                    showLocation
                    title="รายการสินค้าที่เบิกจ่าย (Issued Items)"
                    subtitle="รายการสินค้าและจำนวนที่ระบุในใบเบิกสินค้านี้"
                />
            </div>

            {/* 3. ปุ่มดำเนินการ (Action Buttons) */}
            <div className="py-2 flex flex-col-reverse sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-end gap-2 sm:gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/transaction/issue')}
                    className="w-full sm:w-auto justify-center px-4 py-2 text-sm rounded-xl border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                    ย้อนกลับ
                </Button>

                {!isLocked && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(`/transaction/issue/form?id=${docId}`)}
                        className="w-full sm:w-auto justify-center px-4 py-2 text-sm rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-1.5"
                    >
                        <Pencil className="w-4 h-4" />
                        แก้ไขเอกสาร
                    </Button>
                )}

                {!isLocked && normalizedStatus !== 'DRAFT' && (
                    <Button
                        type="button"
                        disabled={saving}
                        onClick={handleConfirm}
                        className="w-full sm:w-auto justify-center px-5 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1.5"
                    >
                        <FileCheck className="w-4 h-4" />
                        {saving ? 'กำลังบันทึก...' : 'ยืนยันการเบิกสินค้า'}
                    </Button>
                )}

                <Button
                    type="button"
                    disabled={saving}
                    hidden={['DRAFT', 'SAVE', 'CANCEL', 'CANCELLED', 'COMPLETE', 'COMPLETED'].includes(normalizedStatus)}
                    onClick={handlePicking}
                    className="w-full sm:w-auto justify-center px-5 py-2 text-sm font-semibold rounded-xl text-white bg-green-600 hover:bg-green-700 shadow-sm flex items-center gap-1.5"
                >
                    <FileCheck className="w-4 h-4" />
                    {saving ? 'กำลังยืนยัน...' : 'จ่ายสินค้าออกคลัง'}
                </Button>
            </div>
        </AppLayout>
    );
}

export default function IssueDetailPage() {
    return (
        <Suspense
            fallback={
                <AppLayout>
                    <div className="flex items-center justify-center h-80 text-zinc-500">
                        กำลังโหลดหน้ารายละเอียดเอกสาร...
                    </div>
                </AppLayout>
            }
        >
            <IssueDetailContent />
        </Suspense>
    );
}
