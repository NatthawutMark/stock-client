'use client';

import { useEffect, useState, useCallback } from 'react';
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
import type { MastItem, MastBrand, MastLocation, MastUom } from '@/lib/types';
import Swal from 'sweetalert2';

interface ItemFormData {
    id?: string | number;
    originalItemCode?: string;
    itemCode: string;
    itemName: string;
    brandId: string;
    locationId: string;
    uomId: string;
    buyPrice: number | string;
    sellPrice: number | string;
    minAlert: number | string;
    maxAlert: number | string;
    isLotno: boolean;
    isSerialNo: boolean;
    isActive: boolean;
}

const defaultFormData: ItemFormData = {
    itemCode: '',
    itemName: '',
    brandId: '',
    locationId: '',
    uomId: '',
    buyPrice: 0,
    sellPrice: 0,
    minAlert: 0,
    maxAlert: 0,
    isLotno: false,
    isSerialNo: false,
    isActive: true,
};

interface CreateItemModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    dataEdit: MastItem | null;
}

export function CreateItemModal({ open, onOpenChange, onSaved, dataEdit }: CreateItemModalProps) {
    const [formData, setFormData] = useState<ItemFormData>({ ...defaultFormData });
    const [saving, setSaving] = useState(false);
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Options for dropdowns
    const [brands, setBrands] = useState<MastBrand[]>([]);
    const [locations, setLocations] = useState<MastLocation[]>([]);
    const [uoms, setUoms] = useState<MastUom[]>([]);

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

    const fetchDropdownOptions = useCallback(async () => {
        try {
            const [brandRes, locRes, uomRes] = await Promise.all([
                masterService.brands.list(),
                masterService.locations.list(),
                masterService.uoms.list(),
            ]);

            if (brandRes?.success && Array.isArray(brandRes.results)) {
                setBrands(brandRes.results);
            }
            if (locRes?.success && Array.isArray(locRes.results)) {
                setLocations(locRes.results);
            }
            if (uomRes?.success && Array.isArray(uomRes.results)) {
                setUoms(uomRes.results);
            }
        } catch (err) {
            console.error('Failed to load dropdown options:', err);
        }
    }, []);

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAlertMessage(null);
            fetchDropdownOptions();
            if (dataEdit) {
                setFormData({
                    id: dataEdit.id,
                    originalItemCode: dataEdit.itemCode || '',
                    itemCode: dataEdit.itemCode || '',
                    itemName: dataEdit.itemName || '',
                    brandId: dataEdit.brandId ? String(dataEdit.brandId) : '',
                    locationId: dataEdit.locationId ? String(dataEdit.locationId) : '',
                    uomId: dataEdit.uomId ? String(dataEdit.uomId) : '',
                    buyPrice: dataEdit.buyPrice ?? 0,
                    sellPrice: dataEdit.sellPrice ?? 0,
                    minAlert: dataEdit.minAlert ?? (dataEdit.minAlter ?? 0),
                    maxAlert: dataEdit.maxAlert ?? (dataEdit.maxAlter ?? 0),
                    isLotno: Boolean(dataEdit.isLotno ?? dataEdit.isLotNo),
                    isSerialNo: Boolean(dataEdit.isSerialNo),
                    isActive: dataEdit.isActive !== false,
                });
            } else {
                resetForm();
            }
        }
    }, [open, dataEdit, fetchDropdownOptions]);

    const validateForm = (isAddMore = false) => {
        if (!formData.itemCode.trim()) {
            if (isAddMore) {
                setAlertMessage({ type: 'error', message: 'กรุณากรอกรหัสสินค้า' });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณากรอกรหัสสินค้า',
                    confirmButtonColor: '#2563eb',
                });
            }
            return false;
        }
        if (!formData.itemName.trim()) {
            if (isAddMore) {
                setAlertMessage({ type: 'error', message: 'กรุณากรอกชื่อสินค้า' });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณากรอกชื่อสินค้า',
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
            const payload: Record<string, unknown> = {
                itemCode: formData.itemCode.trim(),
                itemName: formData.itemName.trim(),
                brandId: formData.brandId ? String(formData.brandId) : null,
                locationId: formData.locationId ? String(formData.locationId) : null,
                uomId: formData.uomId ? String(formData.uomId) : null,
                buyPrice: Number(formData.buyPrice) || 0,
                sellPrice: Number(formData.sellPrice) || 0,
                minAlert: Number(formData.minAlert) || 0,
                maxAlert: Number(formData.maxAlert) || 0,
                isLotno: formData.isLotno,
                isSerialNo: formData.isSerialNo,
                isActive: formData.isActive,
            };

            if (isEditMode) {
                payload.id = formData.id ? String(formData.id) : undefined;
                payload.originalItemCode = formData.originalItemCode;

                const res = await masterService.items.update(payload);

                if (res && res.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'สำเร็จ',
                        text: 'แก้ไขข้อมูลสินค้าเรียบร้อยแล้ว',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    onSaved();
                    onOpenChange(false);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'แก้ไขไม่สำเร็จ',
                        text: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลสินค้า',
                        confirmButtonColor: '#dc2626',
                    });
                }
            } else {
                const res = await masterService.items.create(payload);

                if (res && res.success) {
                    onSaved();
                    if (andAddMore) {
                        resetForm();
                        setAlertMessage({
                            type: 'success',
                            message: 'เพิ่มสินค้าใหม่เรียบร้อยแล้ว สามารถกรอกรายการถัดไปได้ทันที',
                        });
                    } else {
                        await Swal.fire({
                            icon: 'success',
                            title: 'สำเร็จ',
                            text: 'เพิ่มสินค้าใหม่เรียบร้อยแล้ว',
                            timer: 1500,
                            showConfirmButton: false,
                        });
                        onOpenChange(false);
                    }
                } else {
                    // const errMsg = res?.error || res?.message || 'เกิดข้อผิดพลาดในการเพิ่มสินค้า';
                    const errMsg = 'เกิดข้อผิดพลาดในการเพิ่มสินค้า';
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
            console.error('Save item failed:', error);
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
            <DialogContent className="max-w-4xl sm:max-w-4xl w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl p-6">
                <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                        {isEditMode ? 'แก้ไขข้อมูลสินค้า' : 'สร้างสินค้าใหม่ (New Item)'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {isEditMode
                            ? 'ปรับปรุงรายละเอียดข้อมูลสินค้ารายการนี้'
                            : 'กรอกรายละเอียดเพื่อสร้างข้อมูลสินค้าใหม่ลงในระบบ'}
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
                    {/* Row 1: Code and Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                รหัสสินค้า (Item Code) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.itemCode}
                                onChange={(e) => setFormData((prev) => ({ ...prev, itemCode: e.target.value }))}
                                placeholder="เช่น ITM-001..."
                                disabled={isEditMode}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                ชื่อสินค้า (Item Name) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.itemName}
                                onChange={(e) => setFormData((prev) => ({ ...prev, itemName: e.target.value }))}
                                placeholder="เช่น หน้ากากอนามัย, นมสด..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Row 2: Brand, UOM, Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                แบรนด์ (Brand)
                            </label>
                            <select
                                value={formData.brandId}
                                onChange={(e) => setFormData((prev) => ({ ...prev, brandId: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- ไม่ระบุแบรนด์ --</option>
                                {brands.map((b) => (
                                    <option key={b.id} value={String(b.id)}>
                                        {b.nameTh || b.nameEn}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                หน่วยนับ (UOM)
                            </label>
                            <select
                                value={formData.uomId}
                                onChange={(e) => setFormData((prev) => ({ ...prev, uomId: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- ไม่ระบุหน่วยนับ --</option>
                                {uoms.map((u) => (
                                    <option key={u.id} value={String(u.id)}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                ตำแหน่งจัดเก็บ (Location)
                            </label>
                            <select
                                value={formData.locationId}
                                onChange={(e) => setFormData((prev) => ({ ...prev, locationId: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- ไม่ระบุตำแหน่ง --</option>
                                {locations.map((l) => (
                                    <option key={l.id} value={String(l.id)}>
                                        {l.code} - {l.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Prices & Alerts */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                ราคาซื้อ (Buy Price)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.buyPrice}
                                onChange={(e) => setFormData((prev) => ({ ...prev, buyPrice: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                ราคาขาย (Sell Price)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.sellPrice}
                                onChange={(e) => setFormData((prev) => ({ ...prev, sellPrice: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                แจ้งเตือนขั้นต่ำ (Min Alert)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.minAlert}
                                onChange={(e) => setFormData((prev) => ({ ...prev, minAlert: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                แจ้งเตือนสูงสุด (Max Alert)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.maxAlert}
                                onChange={(e) => setFormData((prev) => ({ ...prev, maxAlert: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Row 4: Controls (Lot, Serial, Active) */}
                    <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isLotno}
                                onChange={(e) => setFormData((prev) => ({ ...prev, isLotno: e.target.checked }))}
                                className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700"
                            />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                ควบคุม Lot (Lot No.)
                            </span>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isSerialNo}
                                onChange={(e) => setFormData((prev) => ({ ...prev, isSerialNo: e.target.checked }))}
                                className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700"
                            />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                ควบคุม Serial (Serial No.)
                            </span>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                                className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700"
                            />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                เปิดใช้งานสินค้านี้ (Active)
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
