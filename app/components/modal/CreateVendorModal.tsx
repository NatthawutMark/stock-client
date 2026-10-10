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
import type { MastVendor } from '@/lib/types';
import Swal from 'sweetalert2';

interface VendorFormData {
    id?: string | number;
    originalVendCode?: string;
    vendCode: string;
    vendName: string;
    contactName: string;
    tel: string;
    address: string;
    remark: string;
    isActive: boolean;
}

const defaultFormData: VendorFormData = {
    vendCode: '',
    vendName: '',
    contactName: '',
    tel: '',
    address: '',
    remark: '',
    isActive: true,
};

interface CreateVendorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    dataEdit: MastVendor | null;
}

export function CreateVendorModal({ open, onOpenChange, onSaved, dataEdit }: CreateVendorModalProps) {
    const [formData, setFormData] = useState<VendorFormData>({ ...defaultFormData });
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
                    originalVendCode: dataEdit.vendCode || '',
                    vendCode: dataEdit.vendCode || '',
                    vendName: dataEdit.vendName || '',
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
        if (!formData.vendCode.trim()) {
            if (isAddMore) {
                setAlertMessage({ type: 'error', message: 'กรุณากรอกรหัสผู้จำหน่าย' });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณากรอกรหัสผู้จำหน่าย',
                    confirmButtonColor: '#2563eb',
                });
            }
            return false;
        }
        if (!formData.vendName.trim()) {
            if (isAddMore) {
                setAlertMessage({ type: 'error', message: 'กรุณากรอกชื่อผู้จำหน่าย' });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณากรอกชื่อผู้จำหน่าย',
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
            if (isEditMode) {
                const payload = {
                    id: formData.id ? String(formData.id) : undefined,
                    vendCode: formData.vendCode.trim(),
                    vendName: formData.vendName.trim(),
                    contactName: formData.contactName.trim(),
                    tel: formData.tel.trim(),
                    address: formData.address.trim(),
                    remark: formData.remark.trim(),
                    isActive: formData.isActive,
                };

                const res = await masterService.vendors.update(payload);

                if (res && res.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'สำเร็จ',
                        text: res.message || 'แก้ไขข้อมูลผู้จำหน่ายเรียบร้อยแล้ว',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    onSaved();
                    onOpenChange(false);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'แก้ไขไม่สำเร็จ',
                        text: res?.error || res?.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้จำหน่าย',
                        confirmButtonColor: '#dc2626',
                    });
                }
            } else {
                const payload = {
                    vendCode: formData.vendCode.trim(),
                    vendName: formData.vendName.trim(),
                    contactName: formData.contactName.trim(),
                    tel: formData.tel.trim(),
                    address: formData.address.trim(),
                    remark: formData.remark.trim(),
                    isActive: formData.isActive,
                };

                const res = await masterService.vendors.create(payload);

                if (res && res.success) {
                    onSaved();
                    if (andAddMore) {
                        resetForm();
                        setAlertMessage({
                            type: 'success',
                            message: res.message || 'เพิ่มผู้จำหน่ายใหม่เรียบร้อยแล้ว สามารถกรอกรายการถัดไปได้ทันที',
                        });
                    } else {
                        await Swal.fire({
                            icon: 'success',
                            title: 'สำเร็จ',
                            text: res.message || 'เพิ่มผู้จำหน่ายใหม่เรียบร้อยแล้ว',
                            timer: 1500,
                            showConfirmButton: false,
                        });
                        onOpenChange(false);
                    }
                } else {
                    const errMsg = res?.error || res?.message || 'เกิดข้อผิดพลาดในการเพิ่มผู้จำหน่าย';
                    if (andAddMore) {
                        setAlertMessage({ type: 'error', message: errMsg });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'เพิ่มไม่สำเร็จ',
                            text: errMsg,
                            confirmButtonColor: '#dc2626',
                        });
                    }
                }
            }
        } catch (error: unknown) {
            console.error('Save vendor failed:', error);
            const err = error as { message?: string };
            const errMsg = err.message || 'ไม่สามารถบันทึกข้อมูลได้';
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal={true}>
            <DialogContent className="max-w-4xl sm:max-w-4xl w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                        {isEditMode ? 'แก้ไขข้อมูลผู้จำหน่าย' : 'เพิ่มผู้จำหน่ายใหม่ (New Vendor)'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {isEditMode
                            ? 'ปรับปรุงรายละเอียดข้อมูลผู้จำหน่าย / Supplier'
                            : 'กรอกรายละเอียดเพื่อสร้างข้อมูลผู้จำหน่ายใหม่ลงในระบบ'}
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

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Vendor Code */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                รหัสผู้จำหน่าย (Vendor Code) <span className="text-red-500">*</span>
                            </label>
                            <input
                                disabled={isEditMode}
                                type="text"
                                value={formData.vendCode}
                                onChange={(e) => {
                                    setFormData((prev) => ({ ...prev, vendCode: e.target.value }));
                                    if (alertMessage) setAlertMessage(null);
                                }}
                                placeholder="เช่น VEN-001..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Vendor Name */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                ชื่อผู้จำหน่าย / บริษัท <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.vendName}
                                onChange={(e) => {
                                    setFormData((prev) => ({ ...prev, vendName: e.target.value }));
                                    if (alertMessage) setAlertMessage(null);
                                }}
                                placeholder="เช่น บริษัท สยาม ซัพพลาย จำกัด..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Contact Name */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                ผู้ติดต่อ (Contact Person)
                            </label>
                            <input
                                type="text"
                                value={formData.contactName}
                                onChange={(e) => setFormData((prev) => ({ ...prev, contactName: e.target.value }))}
                                placeholder="เช่น คุณสมชาย จัดซื้อ..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Telephone */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                เบอร์โทรศัพท์ (Telephone)
                            </label>
                            <input
                                type="text"
                                value={formData.tel}
                                onChange={(e) => setFormData((prev) => ({ ...prev, tel: e.target.value }))}
                                placeholder="เช่น 02-123-4567, 081-xxx-xxxx..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                            ที่อยู่ (Address)
                        </label>
                        <textarea
                            rows={2}
                            value={formData.address}
                            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                            placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Remark */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                            หมายเหตุ (Remark)
                        </label>
                        <input
                            type="text"
                            value={formData.remark}
                            onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                            placeholder="หมายเหตุเพิ่มเติม..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Is Active */}
                    <div className="pt-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                                className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700"
                            />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                เปิดใช้งานผู้จำหน่ายนี้ (Active)
                            </span>
                        </label>
                    </div>
                </div>

                <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                        className="rounded-xl px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        ยกเลิก
                    </Button>
                    {!isEditMode && (
                        <Button
                            type="button"
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="rounded-xl px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {saving ? 'กำลังบันทึก...' : 'บันทึกและเพิ่มอีก'}
                        </Button>
                    )}
                    <Button
                        type="button"
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="rounded-xl px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                        {saving ? 'กำลังบันทึก...' : isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

