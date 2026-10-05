'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
    Button,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/index';
import { masterService } from '@/app/_services/master';
import type { MastItem } from '@/lib/types';
import { useI18n } from '@/app/providers';

interface CreateItemFormData {
    itemCode: string;
    itemName: string;
    isLotNo: boolean;
    isSerialNo: boolean;
    isActive: boolean;
    uomId: number;
}

const defaultFormData: CreateItemFormData = {
    itemCode: '',
    itemName: '',
    isLotNo: false,
    isSerialNo: false,
    isActive: true,
    uomId: 1,
};

interface CreateItemModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    dataEdit: CreateItemFormData | null;
}

export function CreateItemModal({ open, onOpenChange, onSaved, dataEdit }: CreateItemModalProps) {
    const { t } = useI18n();

    const [formData, setFormData] = useState<CreateItemFormData>({ ...defaultFormData });
    const [saving, setSaving] = useState(false);

    const resetForm = () => {
        setFormData({ ...defaultFormData });
    };

    useEffect(() => {

        if (typeof dataEdit !== 'undefined' && dataEdit !== null) {
            setFormData({
                itemCode: dataEdit?.itemCode ?? '',
                itemName: dataEdit?.itemName ?? '',
                uomId: 1,
                isActive: true,
                isLotNo: false,
                isSerialNo: false
            })
        }
    }, [open])

    const buildPayload = (): Omit<MastItem, 'id' | 'createDate' | 'updateDate'> => ({
        itemCode: formData.itemCode,
        itemName: formData.itemName,
        isLotNo: formData.isLotNo,
        isSerialNo: formData.isSerialNo,
        isActive: formData.isActive,
        uomId: formData.uomId,
        brandId: 1,
        groupId: 1,
        minAlter: 0,
        maxAlter: 100,
        locationId: 1,
        buyPrice: 0,
        sellPrice: 0,
        isDelete: false,
        createBy: 'admin',
        updateBy: 'admin',
    });

    /** บันทึกแล้วปิด modal */
    const handleSave = async () => {
        setSaving(true);
        try {
            await masterService.items.create(buildPayload());
            onSaved();
            resetForm();
            onOpenChange(false);
        } catch (error) {
            console.error('Save failed:', error);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setSaving(false);
        }
    };

    /** บันทึกแล้วเคลียร์ฟอร์มเพื่อเพิ่มรายการถัดไป */
    const handleSaveAndAdd = async () => {
        setSaving(true);
        try {
            await masterService.items.create(buildPayload());
            onSaved();
            resetForm();
        } catch (error) {
            console.error('Save failed:', error);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setSaving(false);
        }
    };

    /** ปิด modal + reset form */
    const handleClose = () => {
        resetForm();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal={true}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>สร้างสินค้าใหม่</DialogTitle>
                    <DialogDescription>
                        กรอกข้อมูลสินค้าด้านล่างแล้วกดบันทึก
                    </DialogDescription>
                </DialogHeader>

                {/* ── Form Body ── */}
                <div className="space-y-4 py-2">
                    {/* รหัสสินค้า */}
                    <div className="space-y-1.5 grid grid-cols-2 gap-4">
                        <div className="col-span-1 space-y-1.5">
                            <label className="block text-sm font-medium">
                                {t.master.item.itemCode}
                            </label>
                            <input
                                type="text"
                                value={formData.itemCode}
                                onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-ring/50 outline-none"
                                placeholder="เช่น ITM-001"
                            />
                        </div>
                        <div className="col-span-1 space-y-1.5">
                            <label className="block text-sm font-medium">
                                {t.master.item.itemName}
                            </label>
                            <input
                                type="text"
                                value={formData.itemName}
                                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-ring/50 outline-none"
                                placeholder="เช่น ITM-NAME-001"
                            />
                        </div>
                    </div>

                    {/* ชื่อสินค้า */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium">
                            ชื่อสินค้า (Item Name)
                        </label>
                        {/* <input
                            type="text"
                            value={formData.itemName}
                            onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-ring/50 outline-none"
                            placeholder="ชื่อสินค้า"
                        /> */}
                        <Select>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="เลือกหน่วยนับ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">ชิ้น</SelectItem>
                                <SelectItem value="2">กล่อง</SelectItem>
                                <SelectItem value="3">แพ็ค</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Checkboxes */}
                    <div className="flex flex-wrap gap-6 pt-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isLotNo}
                                onChange={(e) => setFormData({ ...formData, isLotNo: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300"
                            />
                            ควบคุม Lot
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isSerialNo}
                                onChange={(e) => setFormData({ ...formData, isSerialNo: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300"
                            />
                            ควบคุม Serial
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300"
                            />
                            ใช้งาน
                        </label>
                    </div>
                </div>

                {/* ── Footer Buttons ── */}
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={handleClose} disabled={saving}>
                        ปิด
                    </Button>
                    <Button variant="secondary" onClick={handleSaveAndAdd} disabled={saving}>
                        {saving ? 'กำลังบันทึก...' : 'บันทึกและเพิ่ม'}
                    </Button>
                    <Button variant="default" onClick={handleSave} disabled={saving}>
                        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </Button>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    );
}
