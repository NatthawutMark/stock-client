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
import { CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import { masterService } from '@/app/_services/master';
import type { MastLocation, MastWarehouse } from '@/lib/types';
import Swal from 'sweetalert2';

interface LocationFormData {
    id?: string | number;
    warehouseId: string | number;
    code: string;
    name: string;
    isActive: boolean;
}

const defaultFormData: LocationFormData = {
    warehouseId: '',
    code: '',
    name: '',
    isActive: true,
};

interface CreateLocationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    dataEdit: MastLocation | null;
    defaultWarehouseId?: string;
    warehouseList?: MastWarehouse[];
}

export function CreateLocationModal({
    open,
    onOpenChange,
    onSaved,
    dataEdit,
    defaultWarehouseId = '',
    warehouseList: externalWarehouses,
}: CreateLocationModalProps) {
    const [formData, setFormData] = useState<LocationFormData>({ ...defaultFormData });
    const [fetchedWarehouses, setFetchedWarehouses] = useState<MastWarehouse[]>([]);
    const warehouseList = externalWarehouses && externalWarehouses.length > 0 ? externalWarehouses : fetchedWarehouses;
    const [saving, setSaving] = useState(false);
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const isEditMode = Boolean(dataEdit);

    const resetForm = () => {
        setFormData({
            ...defaultFormData,
            warehouseId: defaultWarehouseId || '',
        });
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

    // โหลดคลังสินค้าสำหรับเลือกในฟอร์ม (ถ้ายังไม่มีส่งเข้ามา)
    useEffect(() => {
        if (externalWarehouses && externalWarehouses.length > 0) return;

        const fetchWarehouses = async () => {
            try {
                const res = await masterService.warehouses.list();
                if (res && res.success) {
                    const data = Array.isArray(res.results)
                        ? res.results
                        : Array.isArray(res.data)
                            ? res.data
                            : [];
                    setFetchedWarehouses(data);
                }
            } catch (err) {
                console.error('Failed to load warehouses in CreateLocationModal:', err);
            }
        };

        if (open) {
            fetchWarehouses();
        }
    }, [open, externalWarehouses]);

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAlertMessage(null);
            if (dataEdit) {
                const whId = dataEdit.warehouseId ?? dataEdit.WarehouseId;
                setFormData({
                    id: dataEdit.id,
                    warehouseId: whId !== undefined && whId !== null ? String(whId) : '',
                    code: dataEdit.code || '',
                    name: dataEdit.name || '',
                    isActive: dataEdit.isActive !== false,
                });
            } else {
                resetForm();
            }
        }
    }, [open, dataEdit, defaultWarehouseId]); // eslint-disable-line react-hooks/exhaustive-deps

    const validateForm = (isAddMore = false) => {
        if (!formData.warehouseId) {
            const msg = 'กรุณาเลือกคลังสินค้า';
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

        if (!formData.code.trim()) {
            const msg = 'กรุณากรอกรหัสตำแหน่งจัดเก็บ';
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
            const msg = 'กรุณากรอกชื่อตำแหน่งจัดเก็บ';
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
            const payload: Partial<MastLocation> = {
                id: formData.id ? String(formData.id) : undefined,
                warehouseId: formData.warehouseId ? String(formData.warehouseId) : undefined,
                code: formData.code.trim(),
                name: formData.name.trim(),
                isActive: formData.isActive,
            };

            if (isEditMode) {
                const res = await masterService.locations.update(payload);

                if (res && res.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'สำเร็จ',
                        text: res.message || 'แก้ไขตำแหน่งจัดเก็บเรียบร้อยแล้ว',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    onSaved();
                    onOpenChange(false);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'แก้ไขไม่สำเร็จ',
                        text: res?.error || res?.message || 'เกิดข้อผิดพลาดในการแก้ไขตำแหน่งจัดเก็บ',
                        confirmButtonColor: '#dc2626',
                    });
                }
            } else {
                const res = await masterService.locations.create(payload);
                console.log('locationCreate: ', payload);

                if (res && res.success) {
                    onSaved();
                    if (andAddMore) {
                        // คงค่า warehouseId เดิมไว้ เพื่อให้เพิ่มรายการในคลังเดิมต่อได้ทันที
                        setFormData((prev) => ({
                            ...defaultFormData,
                            warehouseId: prev.warehouseId,
                        }));
                        setAlertMessage({
                            type: 'success',
                            message: res.message || 'เพิ่มตำแหน่งจัดเก็บใหม่เรียบร้อยแล้ว สามารถกรอกรายการถัดไปได้ทันที',
                        });
                    } else {
                        await Swal.fire({
                            icon: 'success',
                            title: 'สำเร็จ',
                            text: res.message || 'เพิ่มตำแหน่งจัดเก็บใหม่เรียบร้อยแล้ว',
                            timer: 1500,
                            showConfirmButton: false,
                        });
                        onOpenChange(false);
                    }
                } else {
                    const errMsg = res?.error || res?.message || 'เกิดข้อผิดพลาดในการเพิ่มตำแหน่งจัดเก็บ';
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
            console.error('Save location failed:', error);
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
                    <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        {isEditMode ? 'แก้ไขข้อมูลตำแหน่งจัดเก็บ' : 'เพิ่มตำแหน่งจัดเก็บใหม่ (New Location)'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {isEditMode
                            ? 'ปรับปรุงรายละเอียดตำแหน่งจัดเก็บและคลังสินค้าที่สังกัด'
                            : 'เลือกคลังสินค้าและกำหนดรหัส/ชื่อตำแหน่งจัดเก็บ (Location/Bin/Rack)'}
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
                    {/* Warehouse Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                            คลังสินค้า (Warehouse) <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.warehouseId}
                            onChange={(e) => {
                                setFormData((prev) => ({ ...prev, warehouseId: e.target.value }));
                                if (alertMessage) setAlertMessage(null);
                            }}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="">-- เลือกคลังสินค้า (Warehouse) --</option>
                            {warehouseList.map((wh) => (
                                <option key={wh.id} value={String(wh.id)}>
                                    {wh.warehouseName} {wh.code ? `(${wh.code})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Location Code */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                            รหัสตำแหน่ง (Location Code) <span className="text-red-500">*</span>
                        </label>
                        <input
                            disabled={isEditMode}
                            type="text"
                            value={formData.code}
                            onChange={(e) => {
                                setFormData((prev) => ({ ...prev, code: e.target.value }));
                                if (alertMessage) setAlertMessage(null);
                            }}
                            placeholder="เช่น A-01-01, BIN-01..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Location Name */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                            ชื่อตำแหน่งจัดเก็บ (Location Name) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => {
                                setFormData((prev) => ({ ...prev, name: e.target.value }));
                                if (alertMessage) setAlertMessage(null);
                            }}
                            placeholder="เช่น โซน A ชั้น 1 ล็อค 1..."
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
                                เปิดใช้งานตำแหน่งนี้ (Active)
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

export default CreateLocationModal;
