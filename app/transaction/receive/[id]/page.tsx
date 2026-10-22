'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import { transactionService } from '@/app/_services/transaction';
import {
    docReceives,
    vendors as mockVendors,
    warehouses as mockWarehouses,
    employees as mockEmployees,
} from '@/lib/mock/data';
import type { DocReceive, DocReceiveDetail, MastVendor, MastWarehouse } from '@/lib/types';
import { MasterItemTable, TransactionItem } from '@/components/transaction';
import { Button, Card, CardContent, Label, renderStatusBadge } from '@/components/ui';
import Swal from 'sweetalert2';
import {
    Building2,
    Calendar,
    FileText,
    Truck,
    User,
    Layers,
    Pencil,
    Hash,
    NotepadText,
    type LucideIcon,
    FileCheck,
} from 'lucide-react';

type EmployeeOption = { id: string | number; name: string };

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const toDateOnly = (raw?: string) =>
    raw && raw.length >= 10 ? raw.slice(0, 10) : new Date().toISOString().split('T')[0];

// ใช้ผลลัพธ์จาก API ถ้าเป็น array ที่มีข้อมูล ไม่เช่นนั้นใช้ fallback (mock)
function pickList<T>(res: { success?: boolean; results?: unknown } | undefined, fallback: T[]): T[] {
    return res?.success && Array.isArray(res.results) && res.results.length > 0 ? (res.results as T[]) : fallback;
}

const toEmployeeOptions = (list: { id?: string | number; fName?: string; lName?: string }[]): EmployeeOption[] =>
    list.map((e) => ({
        id: e.id ?? '',
        name: `${e.fName || ''} ${e.lName || ''}`.trim(),
    }));

const toTransactionItem = (d: DocReceiveDetail, index: number): TransactionItem => {
    const qty = Number(d.itemQty) || 1;
    const price = Number(d.itemPrice) || 0;
    return {
        id: d.id || `view-item-${index}`,
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
        locationId: d.locationId,
        locationName: d.locationName || '',
        remark: d.remark || '',
    };
};

// แถวแสดงข้อมูล Label : Value
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
        <div className={`grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 ${alignTop ? 'items-start' : 'items-center'}`}>
            <Label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 select-none">
                <Icon className="w-3.5 h-3.5 text-blue-500" />
                {label}:
            </Label>
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{children}</span>
        </div>
    );
}

function ReceiveDetailContent() {
    const router = useRouter();
    const params = useParams();
    const docId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || '';

    const { setPageTitle } = useLayout();

    // Document Header
    const [doc, setDoc] = useState<DocReceive | null>(null);
    const [items, setItems] = useState<TransactionItem[]>([]);

    // Master Data
    const [vendorList, setVendorList] = useState<MastVendor[]>([]);
    const [warehouseList, setWarehouseList] = useState<MastWarehouse[]>([]);
    const [employeeList, setEmployeeList] = useState<EmployeeOption[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);

    // ─────────────────────────────────────────────────────────────
    // 1. ตั้งชื่อหัวข้อหน้า
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        setPageTitle('รายละเอียดใบรับสินค้า (Goods Receive Detail)');
    }, [setPageTitle]);

    // ─────────────────────────────────────────────────────────────
    // 2. โหลด Master Data (Vendor, Warehouse, Employee)
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadMasters = async () => {
            try {
                const [vendRes, whRes] = await Promise.all([
                    masterService.vendors.list(),
                    masterService.warehouses.list(),
                ]);
                setVendorList(pickList(vendRes, mockVendors));
                setWarehouseList(pickList(whRes, mockWarehouses));
            } catch {
                setVendorList(mockVendors);
                setWarehouseList(mockWarehouses);
            }

            try {
                const empRes = await masterService.employees.list();
                setEmployeeList(toEmployeeOptions(pickList(empRes, mockEmployees)));
            } catch {
                setEmployeeList(toEmployeeOptions(mockEmployees));
            }
        };

        loadMasters();
    }, []);

    // ─────────────────────────────────────────────────────────────
    // 3. โหลดข้อมูลเอกสาร
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!docId) return;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        const loadDoc = async () => {
            try {
                let foundDoc: DocReceive | undefined;
                try {
                    const res = await transactionService.receive.get(docId);
                    if (res?.success && res.results) foundDoc = res.results;
                } catch {
                    // API error → fallback to mock
                }

                foundDoc ??= docReceives.find((d) => String(d.id) === String(docId));

                if (!foundDoc) {
                    await Swal.fire({
                        icon: 'error',
                        title: 'ไม่พบเอกสาร',
                        text: `ไม่พบเอกสารรับสินค้ารหัส #${docId} ในฐานข้อมูล`,
                    });
                    router.push('/transaction/receive');
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

    // ─────────────────────────────────────────────────────────────
    // ค่าที่ใช้แสดงผล
    // ─────────────────────────────────────────────────────────────
    const docNo = doc?.docNo || '';
    const docDate = doc ? toDateOnly(doc.docDate) : '';
    const docNoRef = doc?.refDocNo || '';
    const remark = doc?.remark || '';
    const vendorId = String(doc?.vendId || '');
    const employeeId = String(doc?.empId || doc?.employeeId || '');
    const warehouseId = String(doc?.warehouseId || '');
    const statusCode = String(doc?.statusCode || doc?.statusName || 'Draft');

    const vendorDisplayName = useMemo(() => {
        const vend = vendorList.find((v) => String(v.id) === vendorId);
        if (!vend) return vendorId || '-';
        return vend.vendCode ? `[${vend.vendCode}] ${vend.vendName}` : vend.vendName;
    }, [vendorList, vendorId]);

    const warehouseDisplayName = useMemo(() => {
        const wh = warehouseList.find((w) => String(w.id) === warehouseId);
        return wh ? `${wh.warehouseName} (${wh.code})` : warehouseId || '-';
    }, [warehouseList, warehouseId]);

    const employeeDisplayName = useMemo(() => {
        const emp = employeeList.find((e) => String(e.id) === employeeId || e.name === employeeId);
        return emp?.name || employeeId || '-';
    }, [employeeList, employeeId]);

    const handleSubmit = async (targetStatus: 'Draft' | 'Save' | 'Confirm' | 'Complete' | 'Putaway' = 'Save') => {
        setSaving(true);
        try {
            Swal.fire({
                title: 'กำลังบันทึกข้อมูล',
                html: 'โปรดรอสักครู่...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            if (targetStatus === 'Confirm') {
                await transactionService.receive.confirm(docId);
                setDoc((prev) => (prev ? { ...prev, statusCode: 'CONFIRM' } : null));

                await Swal.fire({
                    icon: 'success',
                    title: 'ยืนยันเอกสารสำเร็จ',
                    text: 'ยืนยันใบรับสินค้าเรียบร้อยแล้ว',
                    timer: 1800,
                    showConfirmButton: false,
                });
            }
            else if (targetStatus === 'Putaway') {
                await transactionService.receive.putaway(docId);
                setDoc((prev) => (prev ? { ...prev, statusCode: 'COMPLETE' } : null));

                await Swal.fire({
                    icon: 'success',
                    title: 'นำเข้าคลังสำเร็จ',
                    text: 'นำสินค้าเข้าคลังเรียบร้อยแล้ว',
                    timer: 1800,
                    showConfirmButton: false,
                });
            }
            else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'การทำงานของปุ่มทำงานไม่ถูกต้อง',
                });
            }


        } catch (error: unknown) {
            console.error('Save error:', error);
            const errMsg = error instanceof Error ? error.message : 'ไม่สามารถบันทึกข้อมูลเอกสารได้';
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
            {/* Page Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
                            <FileText className="w-5 h-5" />
                        </span>
                        รายละเอียดใบรับสินค้า (Goods Receive Detail)
                    </h1>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        เลขที่เอกสาร {docNo || '-'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">สถานะ:</span>
                    {renderStatusBadge(statusCode)}
                </div>
            </div>

            {/* Document Header */}
            <Card className="mb-6 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-6 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                        ข้อมูลส่วนหัวเอกสาร (Document Header)
                    </span>
                </div>

                <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* ฝั่งซ้าย */}
                        <div className="space-y-4">
                            <InfoRow icon={Hash} label="เลขที่เอกสาร">
                                <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100">{docNo || '-'}</span>
                            </InfoRow>
                            <InfoRow icon={Calendar} label="วันที่เอกสาร">{docDate || '-'}</InfoRow>
                            <InfoRow icon={User} label="พนักงาน">{employeeDisplayName}</InfoRow>
                            <InfoRow icon={Building2} label="คลังรับเข้า">{warehouseDisplayName}</InfoRow>
                        </div>

                        {/* ฝั่งขวา */}
                        <div className="space-y-4">
                            <InfoRow icon={Truck} label="ผู้จำหน่าย">{vendorDisplayName}</InfoRow>
                            <InfoRow icon={FileText} label="เลขที่อ้างอิง">
                                <span className="font-mono">{docNoRef || '-'}</span>
                            </InfoRow>
                            <InfoRow icon={NotepadText} label="หมายเหตุ" alignTop>
                                <span className="font-normal whitespace-pre-wrap">{remark || '-'}</span>
                            </InfoRow>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Items (Read Only) */}
            <div className="mb-6">
                <MasterItemTable
                    items={items}
                    onChange={setItems}
                    warehouseId={warehouseId}
                    statusCode={statusCode}
                    readOnly
                    showPrice
                    showLotSerial
                    showLocation
                    title="รายการสินค้าในเอกสาร (Received Items)"
                    subtitle={`มีสินค้าทั้งหมด ${items.length} รายการ`}
                />
            </div>

            {/* Actions */}
            <div className="py-2 flex items-center justify-end gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/transaction/receive')}
                    className="px-4 py-2 text-sm rounded-xl border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                    ย้อนกลับ (Back)
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    hidden={['CONFIRM', 'COMPLETE', 'CANCEL', 'COMPLETED'].includes(statusCode)}
                    onClick={() => router.push(`/transaction/receive/form?id=${docId}`)}
                    className="px-4 py-2 text-sm rounded-xl border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1.5"
                >
                    <Pencil className="w-3.5 h-3.5" />
                    แก้ไขเอกสาร (Edit)
                </Button>

                {/* ปุ่มยืนยัน */}
                <Button
                    type="button"
                    disabled={saving}
                    hidden={['DRAFT', 'CONFIRM', 'COMPLETE', 'CANCEL', 'COMPLETED'].includes(statusCode)}
                    onClick={() => handleSubmit('Confirm')}
                    className="px-5 py-2 text-sm font-semibold rounded-xl text-white bg-green-600 hover:bg-green-700 shadow-sm flex items-center gap-1.5"
                >
                    <FileCheck className="w-4 h-4" />
                    {saving ? 'กำลังยืนยัน...' : 'ยืนยันเอกสาร'}
                </Button>

                {/* ปุ่มบันทึกรับสินค้า*/}
                <Button
                    type="button"
                    disabled={saving}
                    hidden={['DRAFT', 'SAVE', 'COMPLETE', 'CANCEL', 'COMPLETED'].includes(statusCode)}
                    onClick={() => handleSubmit('Putaway')}
                    className="px-5 py-2 text-sm font-semibold rounded-xl text-white bg-green-600 hover:bg-green-700 shadow-sm flex items-center gap-1.5"
                >
                    <FileCheck className="w-4 h-4" />
                    {saving ? 'กำลังยืนยัน...' : 'รับเข้าคลัง'}
                </Button>
            </div>
        </AppLayout>
    );
}

export default function ReceiveDetailPage() {
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
            <ReceiveDetailContent />
        </Suspense>
    );
}
