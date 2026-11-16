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
import type { MastWarehouse } from '@/lib/types';
import Swal from 'sweetalert2';

interface WarehouseFormData {
    id?: string | number;
    originalCode?: string;
    code: string;
    warehouseName: string;
    description: string;
    isActive: boolean;
}

const defaultFormData: WarehouseFormData = {
    code: '',
    warehouseName: '',
    description: '',
    isActive: true,
};

interface CreateWarehouseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    dataEdit: MastWarehouse | null;
}

export function CreateWarehouseModal({ open, onOpenChange, onSaved, dataEdit }: CreateWarehouseModalProps) {
    const [formData, setFormData] = useState<WarehouseFormData>({ ...defaultFormData });
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
                    originalCode: dataEdit.code || '',
                    code: dataEdit.code || '',
                    warehouseName: dataEdit.warehouseName || '',
                    description: dataEdit.description || '',
                    isActive: dataEdit.isActive !== false,
                });
            } else {
                resetForm();
            }
        }
    }, [open, dataEdit]);

    const validateForm = (isAddMore = false) => {
        if (!formData.code.trim()) {
            if (isAddMore) {
                setAlertMessage({ type: 'error', message: 'กรุณากรอกรหัสคลังสินค้า' });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณากรอกรหัสคลังสินค้า',
                    confirmButtonColor: '#2563eb',
                });
            }
            return false;
        }
        if (!formData.warehouseName.trim()) {
            if (isAddMore) {
                setAlertMessage({ type: 'error', message: 'กรุณากรอกชื่อคลังสินค้า' });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณากรอกชื่อคลังสินค้า',
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
                    originalCode: formData.originalCode,
                    Code: formData.code.trim(),
                    WarehouseName: formData.warehouseName.trim(),
                    description: formData.description.trim(),
                    isActive: formData.isActive,
                };

                const res = await masterService.warehouses.update(payload);

                if (res && res.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'สำเร็จ',
                        text: res.message || 'แก้ไขข้อมูลคลังสินค้าเรียบร้อยแล้ว',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    onSaved();
                    onOpenChange(false);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'แก้ไขไม่สำเร็จ',
                        text: res?.error || res?.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลคลังสินค้า',
                        confirmButtonColor: '#dc2626',
                    });
                }
            } else {
                const payload = {
                    Code: formData.code.trim(),
                    WarehouseName: formData.warehouseName.trim(),
                    description: formData.description.trim(),
                    isActive: formData.isActive,
                };

                const res = await masterService.warehouses.create(payload);

                if (res && res.success) {
                    onSaved();
                    if (andAddMore) {
                        resetForm();
                        setAlertMessage({
                            type: 'success',
                            message: res.message || 'เพิ่มคลังสินค้าใหม่เรียบร้อยแล้ว สามารถกรอกรายการถัดไปได้ทันที',
                        });
                    } else {
                        await Swal.fire({
                            icon: 'success',
                            title: 'สำเร็จ',
                            text: res.message || 'เพิ่มคลังสินค้าใหม่เรียบร้อยแล้ว',
                            timer: 1500,
                            showConfirmButton: false,
                        });
                        onOpenChange(false);
                    }
                } else {
                    const errMsg = res?.error || res?.message || 'เกิดข้อผิดพลาดในการเพิ่มคลังสินค้า';
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
            console.error('Save warehouse failed:', error);
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
            <DialogContent className="max-w-lg sm:max-w-lg w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl p-6">
                <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                        {isEditMode ? 'แก้ไขข้อมูลคลังสินค้า' : 'เพิ่มคลังสินค้าใหม่ (New Warehouse)'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {isEditMode
                            ? 'ปรับปรุงรายละเอียดข้อมูลคลังสินค้า'
                            : 'กรอกรายละเอียดเพื่อสร้างข้อมูลคลังสินค้าใหม่ลงในระบบ'}
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
                    {/* Warehouse Code */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                            รหัสคลังสินค้า (Warehouse Code) <span className="text-red-500">*</span>
                        </label>
                        <input
                            disabled={isEditMode}
                            type="text"
                            value={formData.code}
                            onChange={(e) => {
                                setFormData((prev) => ({ ...prev, code: e.target.value }));
                                if (alertMessage) setAlertMessage(null);
                            }}
                            placeholder="เช่น WH01, MAIN..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Warehouse Name */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                            ชื่อคลังสินค้า (Warehouse Name) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.warehouseName}
                            onChange={(e) => {
                                setFormData((prev) => ({ ...prev, warehouseName: e.target.value }));
                                if (alertMessage) setAlertMessage(null);
                            }}
                            placeholder="เช่น คลังสินค้าหลัก, คลังสินค้าสาขา 1..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                            คำอธิบาย / รายละเอียด
                        </label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="ระบุคำอธิบายเพิ่มเติม เช่น ที่ตั้ง หรือประเภทสินค้าที่เก็บ..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                                เปิดใช้งานคลังสินค้านี้ (Active)
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

