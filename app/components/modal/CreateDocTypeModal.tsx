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
import type { MastDocType, MastTransType } from '@/lib/types';
import Swal from 'sweetalert2';
import { SystemMenuService } from '@/app/_services/systemMenu';

interface DocTypeFormData {
    id?: string | number;
    transTypeId: string | number;
    name: string;
    isActive: boolean;
}

const defaultFormData: DocTypeFormData = {
    transTypeId: '',
    name: '',
    isActive: true,
};

interface CreateDocTypeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    dataEdit: MastDocType | null;
}

export function CreateDocTypeModal({ open, onOpenChange, onSaved, dataEdit }: CreateDocTypeModalProps) {
    const [formData, setFormData] = useState<DocTypeFormData>({ ...defaultFormData });
    const [transTypeList, setTransTypeList] = useState<{ id: number | string; name: string }[]>([]);
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

    // Load transaction types from API
    useEffect(() => {
        const fetchTransTypes = async () => {
            try {
                const res = await SystemMenuService.transactionList();
                if (res && res.success) {
                    const data = Array.isArray(res.results)
                        ? res.results
                        : Array.isArray(res.data)
                            ? res.data
                            : [];

                    console.log('Fetched transaction types:', data); // Debug log
                    if (data.length > 0) {
                        setTransTypeList(
                            data.map((item: MastTransType) => {
                                const id = item.menuId ?? item.transTypeId ?? item.id;
                                const name =
                                    item.menuName ??
                                    (item.nameTh && item.nameEn
                                        ? `${item.nameTh} (${item.nameEn})`
                                        : item.nameTh || item.name || item.transTypeName || `Type ${id}`);
                                return { id, name };
                            })
                        );
                    }
                }
            } catch (err) {
                console.error('Failed to load transaction types:', err);
                // Keep DEFAULT_TRANS_TYPES
            }
        };

        if (open) {
            fetchTransTypes();
        }
    }, [open]);

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAlertMessage(null);
            if (dataEdit) {
                const transId = dataEdit.menuId ?? dataEdit.transTypeId;
                setFormData({
                    id: dataEdit.id,
                    transTypeId: transId !== undefined && transId !== null ? String(transId) : '',
                    name: dataEdit.docTypeName || dataEdit.name || '',
                    isActive: dataEdit.isActive !== false,
                });
            } else {
                resetForm();
            }
        }
    }, [open, dataEdit]);

    const validateForm = (isAddMore = false) => {
        if (!formData.transTypeId) {
            const msg = 'กรุณาเลือกประเภทธุรกรรม';
            if (isAddMore) {
                setAlertMessage({ type: 'error', message: msg });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: msg,
                    confirmButtonColor: '#2563eb',
                });
            }
            return false;
        }

        if (!formData.name.trim()) {
            const msg = 'กรุณากรอกชื่อประเภทเอกสาร';
            if (isAddMore) {
                setAlertMessage({ type: 'error', message: msg });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: msg,
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
                    transTypeId: String(formData.transTypeId),
                    menuId: String(formData.transTypeId),
                    name: formData.name.trim(),
                    docTypeName: formData.name.trim(),
                    isActive: formData.isActive,
                };

                const res = await masterService.docTypes.update(payload);

                if (res && res.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'สำเร็จ',
                        text: res.message || 'แก้ไขข้อมูลประเภทเอกสารเรียบร้อยแล้ว',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    onSaved();
                    onOpenChange(false);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'แก้ไขไม่สำเร็จ',
                        text: res?.error || res?.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลประเภทเอกสาร',
                        confirmButtonColor: '#dc2626',
                    });
                }
            } else {
                const payload = {
                    transTypeId: String(formData.transTypeId),
                    menuId: String(formData.transTypeId),
                    name: formData.name.trim(),
                    docTypeName: formData.name.trim(),
                    isActive: formData.isActive,
                };

                const res = await masterService.docTypes.create(payload);

                if (res && res.success) {
                    onSaved();
                    if (andAddMore) {
                        resetForm();
                        setAlertMessage({
                            type: 'success',
                            message: res.message || 'เพิ่มประเภทเอกสารใหม่เรียบร้อยแล้ว สามารถกรอกรายการถัดไปได้ทันที',
                        });
                    } else {
                        await Swal.fire({
                            icon: 'success',
                            title: 'สำเร็จ',
                            text: res.message || 'เพิ่มประเภทเอกสารใหม่เรียบร้อยแล้ว',
                            timer: 1500,
                            showConfirmButton: false,
                        });
                        onOpenChange(false);
                    }
                } else {
                    const errMsg = res?.error || res?.message || 'เกิดข้อผิดพลาดในการเพิ่มประเภทเอกสาร';
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
            console.error('Save docType failed:', error);
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
                        {isEditMode ? 'แก้ไขประเภทเอกสาร' : 'เพิ่มประเภทเอกสารใหม่ (New Document Type)'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {isEditMode
                            ? 'ปรับปรุงรายละเอียดข้อมูลประเภทเอกสารและประเภทธุรกรรม'
                            : 'กรอกรายละเอียดเพื่อสร้างประเภทเอกสารใหม่ลงในระบบ'}
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
                    {/* Transaction Type */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                            ประเภทธุรกรรม (Transaction Type) <span className="text-red-500">*</span>
                        </label>
                        <select disabled={isEditMode}
                            value={formData.transTypeId}
                            onChange={(e) => {
                                setFormData((prev) => ({ ...prev, transTypeId: e.target.value }));
                                if (alertMessage) setAlertMessage(null);
                            }}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="">-- เลือกประเภทธุรกรรม --</option>
                            {transTypeList.map((tt) => (
                                <option key={tt.id} value={String(tt.id)}>
                                    {tt.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Document Type Name */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                            ชื่อประเภทเอกสาร (Document Type Name) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => {
                                setFormData((prev) => ({ ...prev, name: e.target.value }));
                                if (alertMessage) setAlertMessage(null);
                            }}
                            placeholder="เช่น ใบรับสินค้าปกติ, ใบรับคืน, ใบจ่ายสินค้า..."
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
                                เปิดใช้งานประเภทเอกสารนี้ (Active)
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

