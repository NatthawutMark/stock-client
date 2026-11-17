'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    Button,
    Alert,
    AlertTitle,
    AlertDescription,
} from '@/components/ui/index';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { masterService } from '@/app/_services/master';
import { extractErrorMessage } from '@/lib/utils';
import type { MastCustomer } from '@/lib/types';
import Swal from 'sweetalert2';

interface CustomerFormData {
    id?: string;
    custCode: string;
    custName: string;
    contactName: string;
    tel: string;
    address: string;
    remark: string;
    isActive: boolean;
}

const defaultFormData: CustomerFormData = {
    custCode: '',
    custName: '',
    contactName: '',
    tel: '',
    address: '',
    remark: '',
    isActive: true,
};

interface CreateCustomerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    dataEdit: MastCustomer | null;
}

export function CreateCustomerModal({ open, onOpenChange, onSaved, dataEdit }: CreateCustomerModalProps) {
    const [formData, setFormData] = useState<CustomerFormData>({ ...defaultFormData });
    const [saving, setSaving] = useState(false);
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const isEditMode = Boolean(dataEdit);

    const resetForm = () => {
        setFormData({ ...defaultFormData });
    };

    // Auto-dismiss success alert after 4 seconds
    useEffect(() => {
        if (alertMessage?.type === 'success') {
            const timer = setTimeout(() => {
                setAlertMessage(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [alertMessage]);

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAlertMessage(null);
            if (dataEdit) {
                setFormData({
                    id: dataEdit.id,
                    custCode: dataEdit.custCode || '',
                    custName: dataEdit.custName || '',
                    contactName: dataEdit.contactName || '',
                    tel: dataEdit.tel || '',
                    address: dataEdit.address || '',
                    remark: dataEdit.remark || '',
                    isActive: dataEdit.isActive !== false,
                });
            } else {
                resetForm();
            }
        }
    }, [open, dataEdit]);

    const validateForm = (isAddMore = false) => {
        if (!formData.custCode.trim()) {
            if (isAddMore) {
                setAlertMessage({ type: 'error', message: 'กรุณากรอกรหัสลูกค้า' });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณากรอกรหัสลูกค้า',
                    confirmButtonColor: '#2563eb',
                });
            }
            return false;
        }
        if (!formData.custName.trim()) {
            if (isAddMore) {
                setAlertMessage({ type: 'error', message: 'กรุณากรอกชื่อลูกค้า' });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณากรอกชื่อลูกค้า',
                    confirmButtonColor: '#2563eb',
                });
            }
            return false;
        }
        return true;
    };

    const handleSave = async (andAddMore = false) => {
        setAlertMessage(null);
        if (!validateForm(andAddMore)) return;

        setSaving(true);
        try {
            const payload: Partial<MastCustomer> = {
                id: isEditMode ? formData.id : undefined,
                custCode: formData.custCode.trim(),
                custName: formData.custName.trim(),
                contactName: formData.contactName.trim(),
                tel: formData.tel.trim(),
                address: formData.address.trim(),
                remark: formData.remark.trim(),
                isActive: formData.isActive,
            };

            const res = isEditMode
                ? await masterService.customers.update(payload)
                : await masterService.customers.create(payload);

            if (res && res.success !== false) {
                onSaved();
                if (andAddMore && !isEditMode) {
                    resetForm();
                    setAlertMessage({
                        type: 'success',
                        message: res.message || 'เพิ่มข้อมูลลูกค้าเรียบร้อยแล้ว สามารถกรอกรายการถัดไปได้ทันที',
                    });
                } else {
                    await Swal.fire({
                        icon: 'success',
                        title: 'สำเร็จ',
                        text:
                            res.message ||
                            (isEditMode ? 'แก้ไขข้อมูลลูกค้าเรียบร้อยแล้ว' : 'เพิ่มข้อมูลลูกค้าเรียบร้อยแล้ว'),
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    resetForm();
                    onOpenChange(false);
                }
            } else {
                const errMsg = extractErrorMessage(
                    res,
                    isEditMode ? 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลลูกค้า' : 'เกิดข้อผิดพลาดในการสร้างข้อมูลลูกค้า'
                );
                if (andAddMore) {
                    setAlertMessage({ type: 'error', message: errMsg });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: isEditMode ? 'แก้ไขไม่สำเร็จ' : 'สร้างไม่สำเร็จ',
                        text: errMsg,
                        confirmButtonColor: '#dc2626',
                    });
                }
            }
        } catch (error: unknown) {
            console.error('Customer save failed:', error);
            const errMsg = extractErrorMessage(error, 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้');
            if (andAddMore) {
                setAlertMessage({ type: 'error', message: errMsg });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: errMsg,
                    confirmButtonColor: '#dc2626',
                });
            }
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        resetForm();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal={true}>
            <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-[min(56rem,calc(100vw-2rem))] p-4 sm:p-6 overflow-y-auto overscroll-contain">
                <DialogHeader className="pr-8">
                    <DialogTitle className="flex flex-wrap items-center gap-2 text-lg sm:text-xl">
                        <span>{isEditMode ? 'แก้ไขข้อมูลลูกค้า' : 'สร้างข้อมูลลูกค้าใหม่'}</span>
                        {isEditMode && formData.custCode && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-normal">
                                รหัส: {formData.custCode}
                            </span>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? 'แก้ไขรายละเอียดข้อมูลลูกค้าด้านล่างแล้วกดบันทึกการแก้ไข'
                            : 'กรอกข้อมูลลูกค้าด้านล่างแล้วกดบันทึก เพื่อบันทึกลงระบบ'}
                    </DialogDescription>
                </DialogHeader>

                {alertMessage && (
                    <div className="pt-2">
                        <Alert
                            variant={alertMessage.type === 'error' ? 'destructive' : 'default'}
                            className={
                                alertMessage.type === 'success'
                                    ? 'border-emerald-500/50 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400'
                                    : ''
                            }
                        >
                            {alertMessage.type === 'success' ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                <AlertCircle className="h-4 w-4" />
                            )}
                            <AlertTitle className="font-semibold">
                                {alertMessage.type === 'success' ? 'บันทึกสำเร็จ' : 'ข้อผิดพลาด'}
                            </AlertTitle>
                            <AlertDescription className={alertMessage.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : ''}>
                                {alertMessage.message}
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {/* รหัสลูกค้า */}
                        <div className="space-y-1.5 min-w-0">
                            <label className="block text-sm font-medium">
                                รหัสลูกค้า (Customer Code) <span className="text-red-500">*</span>
                            </label>
                            <input
                                disabled={isEditMode}
                                type="text"
                                value={formData.custCode}
                                onChange={(e) => setFormData({ ...formData, custCode: e.target.value })}
                                className="w-full min-w-0 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-ring/50 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder="เช่น CUST001"
                            />
                        </div>

                        {/* ชื่อลูกค้า */}
                        <div className="space-y-1.5 min-w-0">
                            <label className="block text-sm font-medium">
                                ชื่อลูกค้า (Customer Name) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.custName}
                                onChange={(e) => setFormData({ ...formData, custName: e.target.value })}
                                className="w-full min-w-0 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-ring/50 outline-none"
                                placeholder="ชื่อบริษัท หรือ ชื่อ-นามสกุล"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {/* ชื่อผู้ติดต่อ */}
                        <div className="space-y-1.5 min-w-0">
                            <label className="block text-sm font-medium">
                                ผู้ติดต่อ (Contact Name)
                            </label>
                            <input
                                type="text"
                                value={formData.contactName}
                                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                className="w-full min-w-0 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-ring/50 outline-none"
                                placeholder="ชื่อผู้ติดต่อหรือผู้ประสานงาน"
                            />
                        </div>

                        {/* เบอร์โทรศัพท์ */}
                        <div className="space-y-1.5 min-w-0">
                            <label className="block text-sm font-medium">
                                เบอร์โทรศัพท์ (Telephone)
                            </label>
                            <input
                                type="tel"
                                value={formData.tel}
                                onChange={(e) => setFormData({ ...formData, tel: e.target.value })}
                                className="w-full min-w-0 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-ring/50 outline-none"
                                placeholder="เช่น 02-123-4567, 089-999-9999"
                            />
                        </div>
                    </div>

                    {/* ที่อยู่ */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium">
                            ที่อยู่ (Address)
                        </label>
                        <textarea
                            rows={3}
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-ring/50 outline-none resize-none"
                            placeholder="ที่อยู่สำหรับจัดส่ง หรือ ออกใบเสร็จ..."
                        />
                    </div>

                    {/* หมายเหตุ */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium">
                            หมายเหตุ (Remark)
                        </label>
                        <input
                            type="text"
                            value={formData.remark}
                            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-ring/50 outline-none"
                            placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)"
                        />
                    </div>

                    {/* สถานะใช้งาน */}
                    <div className="pt-2">
                        <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span>เปิดใช้งาน (Active)</span>
                        </label>
                    </div>
                </div>

                {/* Footer Buttons */}
                <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button variant="outline" onClick={handleClose} disabled={saving} className="w-full sm:w-auto">
                        ยกเลิก
                    </Button>
                    {!isEditMode && (
                        <Button
                            type="button"
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {saving ? 'กำลังบันทึก...' : 'บันทึกและเพิ่มอีก'}
                        </Button>
                    )}
                    <Button
                        variant="default"
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="w-full sm:w-auto"
                    >
                        {saving ? 'กำลังบันทึก...' : isEditMode ? 'บันทึกการแก้ไข' : 'บันทึก'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
