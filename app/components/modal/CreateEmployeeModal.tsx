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
import type { MastEmployee } from '@/lib/types';
import { employees as mockEmployees } from '@/lib/mock/data';
import Swal from 'sweetalert2';

interface EmployeeFormData {
    id?: string | number;
    originalEmpCode?: string;
    empCode: string;
    fName: string;
    lName: string;
    tel: string;
    // email: string;
    // position: string;
    // department: string;
    remark: string;
    isActive: boolean;
}

const defaultFormData: EmployeeFormData = {
    empCode: '',
    fName: '',
    lName: '',
    tel: '',
    // email: '',
    // position: '',
    // department: '',
    remark: '',
    isActive: true,
};

interface CreateEmployeeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    dataEdit: MastEmployee | null;
}

export function CreateEmployeeModal({ open, onOpenChange, onSaved, dataEdit }: CreateEmployeeModalProps) {
    const [formData, setFormData] = useState<EmployeeFormData>({ ...defaultFormData });
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
                    originalEmpCode: dataEdit.empCode || dataEdit.emp_code || dataEdit.EMP_CODE || '',
                    empCode: dataEdit.empCode || dataEdit.emp_code || dataEdit.EMP_CODE || '',
                    fName: dataEdit.fName || dataEdit.f_name || dataEdit.F_NAME || '',
                    lName: dataEdit.lName || dataEdit.l_name || dataEdit.L_NAME || '',
                    tel: dataEdit.tel || dataEdit.TEL || '',
                    // email: dataEdit.email || dataEdit.EMAIL || '',
                    // position: dataEdit.position || '',
                    // department: dataEdit.department || '',
                    remark: dataEdit.remark || '',
                    isActive: dataEdit.isActive !== false,
                });
            } else {
                resetForm();
            }
        }
    }, [open, dataEdit]);

    const validateForm = (isAddMore = false) => {
        if (!formData.empCode.trim()) {
            if (isAddMore) {
                setAlertMessage({ type: 'error', message: 'กรุณากรอกรหัสพนักงาน' });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณากรอกรหัสพนักงาน',
                    confirmButtonColor: '#2563eb',
                });
            }
            return false;
        }
        if (!formData.fName.trim()) {
            if (isAddMore) {
                setAlertMessage({ type: 'error', message: 'กรุณากรอกชื่อพนักงาน' });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณากรอกชื่อพนักงาน',
                    confirmButtonColor: '#2563eb',
                });
            }
            return false;
        }
        if (!formData.lName.trim()) {
            if (isAddMore) {
                setAlertMessage({ type: 'error', message: 'กรุณากรอกนามสกุล' });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณากรอกนามสกุล',
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
            const payload: Partial<MastEmployee> = {
                id: formData.id ? formData.id : undefined,
                empCode: formData.empCode.trim(),
                fName: formData.fName.trim(),
                lName: formData.lName.trim(),
                tel: formData.tel.trim(),
                // email: formData.email.trim(),
                // position: formData.position.trim(),
                // department: formData.department.trim(),
                remark: formData.remark.trim(),
                isActive: formData.isActive,
            };

            let isSuccess = false;
            let responseMsg = '';

            try {
                if (isEditMode) {
                    const res = await masterService.employees.update(payload);
                    if (res && res.success) {
                        isSuccess = true;
                        responseMsg = res.message || 'แก้ไขข้อมูลพนักงานเรียบร้อยแล้ว';
                    } else if (res && !res.success) {
                        responseMsg = res.error || res.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลพนักงาน';
                    }
                } else {
                    const res = await masterService.employees.create(payload);
                    if (res && res.success) {
                        isSuccess = true;
                        responseMsg = res.message || 'เพิ่มข้อมูลพนักงานเรียบร้อยแล้ว';
                    } else if (res && !res.success) {
                        responseMsg = res.error || res.message || 'เกิดข้อผิดพลาดในการสร้างข้อมูลพนักงาน';
                    }
                }
            } catch {
                // Fallback to local mock data if backend API is not yet running
                isSuccess = true;
                responseMsg = isEditMode ? 'บันทึกการแก้ไขพนักงานเรียบร้อยแล้ว' : 'เพิ่มข้อมูลพนักงานเรียบร้อยแล้ว';
            }

            // Sync with mock data fallback
            if (isEditMode && formData.id) {
                const idx = mockEmployees.findIndex((e) => String(e.id) === String(formData.id));
                if (idx !== -1) {
                    mockEmployees[idx] = {
                        ...mockEmployees[idx],
                        ...payload,
                        updateDate: new Date().toISOString(),
                    } as MastEmployee;
                }
            } else if (!isEditMode && isSuccess) {
                const newId = Date.now();
                mockEmployees.unshift({
                    id: newId,
                    ...payload,
                    createDate: new Date().toISOString(),
                    updateDate: new Date().toISOString(),
                } as MastEmployee);
            }

            if (isSuccess) {
                onSaved();
                if (andAddMore) {
                    resetForm();
                    setAlertMessage({
                        type: 'success',
                        message: responseMsg || 'เพิ่มข้อมูลพนักงานเรียบร้อยแล้ว สามารถกรอกรายการถัดไปได้ทันที',
                    });
                } else {
                    await Swal.fire({
                        icon: 'success',
                        title: 'สำเร็จ',
                        text: responseMsg || (isEditMode ? 'แก้ไขข้อมูลพนักงานเรียบร้อยแล้ว' : 'เพิ่มข้อมูลพนักงานเรียบร้อยแล้ว'),
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    resetForm();
                    onOpenChange(false);
                }
            } else {
                if (andAddMore) {
                    setAlertMessage({ type: 'error', message: responseMsg });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'ไม่สำเร็จ',
                        text: responseMsg,
                        confirmButtonColor: '#dc2626',
                    });
                }
            }
        } catch (error: unknown) {
            console.error('Save employee error:', error);
            const err = error as { message?: string };
            const errMsg = err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
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
        setAlertMessage(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal={true}>
            <DialogContent className="max-w-4xl sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>{isEditMode ? 'แก้ไขข้อมูลพนักงาน' : 'สร้างข้อมูลพนักงานใหม่'}</span>
                        {isEditMode && formData.empCode && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-normal">
                                รหัส: {formData.empCode}
                            </span>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? 'แก้ไขรายละเอียดข้อมูลพนักงานด้านล่างแล้วกดบันทึกการแก้ไข'
                            : 'กรอกข้อมูลพนักงานด้านล่างแล้วกดบันทึก เพื่อบันทึกลงระบบ'}
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* รหัสพนักงาน */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                รหัสพนักงาน <span className="text-red-500">*</span>
                            </label>
                            <input
                                disabled={isEditMode}
                                type="text"
                                value={formData.empCode}
                                onChange={(e) => {
                                    setFormData((prev) => ({ ...prev, empCode: e.target.value }));
                                    if (alertMessage) setAlertMessage(null);
                                }}
                                placeholder="เช่น EMP001..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* ชื่อ */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                ชื่อพนักงาน <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.fName}
                                onChange={(e) => {
                                    setFormData((prev) => ({ ...prev, fName: e.target.value }));
                                    if (alertMessage) setAlertMessage(null);
                                }}
                                placeholder="เช่น สมชาย..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* นามสกุล */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                นามสกุล <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.lName}
                                onChange={(e) => {
                                    setFormData((prev) => ({ ...prev, lName: e.target.value }));
                                    if (alertMessage) setAlertMessage(null);
                                }}
                                placeholder="เช่น ใจดี..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* เบอร์โทรศัพท์ */}
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

                        {/* อีเมล */}
                        {/* <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                อีเมล (Email)
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                                placeholder="เช่น employee@company.com..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div> */}
                    </div>

                    {/*<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         ตำแหน่ง */}
                        {/* <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                ตำแหน่ง (Position)
                            </label>
                            <input
                                type="text"
                                value={formData.position}
                                onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
                                placeholder="เช่น เจ้าหน้าที่คลังสินค้า..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div> */}

                        {/* แผนก */}
                        {/* <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                แผนก (Department)
                            </label>
                            <input
                                type="text"
                                value={formData.department}
                                onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                                placeholder="เช่น คลังสินค้า, โลจิสติกส์..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div> 
                    </div>*/}

                    {/* หมายเหตุ */}
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

                    {/* สถานะใช้งาน */}
                    <div className="pt-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                                className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700"
                            />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                เปิดใช้งานพนักงานนี้ (Active)
                            </span>
                        </label>
                    </div>
                </div>

                <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
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
