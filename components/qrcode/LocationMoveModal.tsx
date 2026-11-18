'use client';

import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    Button,
    Label,
    SearchableSelect,
    type SearchableSelectOption,
} from '@/components/ui';
import { inventoryService } from '@/app/_services/inventory';
import { extractErrorMessage } from '@/lib/utils';
import type { InventoryView, MastLocation } from '@/lib/types';
import type { DecodedQrResult } from '@/lib/qrcode/types';
import { QrScannerModal } from './QrScannerModal';
import { MapPin, QrCode, ArrowRight, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

interface LocationMoveModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: InventoryView | null;
    locationList: MastLocation[];
    onMoved: () => void;
}

function LocationMoveBody({
    item,
    locationList,
    onClose,
    onMoved,
}: {
    item: InventoryView;
    locationList: MastLocation[];
    onClose: () => void;
    onMoved: () => void;
}) {
    const [newLocationId, setNewLocationId] = useState<string>('');
    const [moveQty, setMoveQty] = useState<string>(String(Math.max(1, Number(item.itemQty) || 1)));
    const [saving, setSaving] = useState<boolean>(false);
    const [scannerOpen, setScannerOpen] = useState<boolean>(false);

    const availableLocations = useMemo(() => {
        const whId = item.warehouseId ? String(item.warehouseId) : '';
        return locationList.filter(
            (loc) =>
                (!whId || String(loc.warehouseId || '') === whId) &&
                String(loc.id) !== String(item.locationId || '')
        );
    }, [locationList, item]);

    const locationOptions = useMemo<SearchableSelectOption[]>(
        () =>
            availableLocations.map((loc) => ({
                value: String(loc.id),
                label: `${loc.code ? `[${loc.code}] ` : ''}${loc.name || `ตำแหน่ง #${loc.id}`}`,
            })),
        [availableLocations]
    );

    const handleLocationQrScanned = (decoded: DecodedQrResult) => {
        const targetCodeOrId =
            decoded.kind === 'LOC'
                ? decoded.payload.id || decoded.payload.code
                : decoded.kind === 'RAW_TEXT'
                  ? decoded.text
                  : '';

        if (!targetCodeOrId) {
            Swal.fire({
                icon: 'warning',
                title: 'QRCode ไม่ใช่ป้ายพิกัด',
                text: 'กรุณาสแกน QRCode ของป้ายชั้นวาง (Location) หรือเลือกจากรายการ',
            });
            return;
        }

        const norm = targetCodeOrId.trim().toLowerCase();
        const found = locationList.find(
            (loc) =>
                String(loc.id || '').toLowerCase() === norm ||
                String(loc.code || '').toLowerCase() === norm ||
                String(loc.name || '').toLowerCase() === norm
        );

        if (!found) {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่พบพิกัดจัดเก็บในระบบ',
                text: `ไม่พบตำแหน่ง "${targetCodeOrId}" ในคลังสินค้า`,
            });
            return;
        }

        if (String(found.id) === String(item.locationId || '')) {
            Swal.fire({
                icon: 'info',
                title: 'ตำแหน่งเดิม',
                text: 'สินค้ากำลังอยู่ที่ตำแหน่งนี้แล้ว กรุณาเลือกพิกัดปลายทางใหม่',
            });
            return;
        }

        setNewLocationId(String(found.id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!item.id) return;

        const qtyNum = Number(moveQty) || 0;
        const maxQty = Number(item.itemQty) || 0;

        if (!newLocationId) {
            Swal.fire({ icon: 'warning', title: 'กรุณาเลือกพิกัดปลายทาง' });
            return;
        }
        if (qtyNum <= 0 || qtyNum > maxQty) {
            Swal.fire({
                icon: 'warning',
                title: 'จำนวนไม่ถูกต้อง',
                text: `กรุณาระบุจำนวนระหว่าง 1 ถึง ${maxQty.toLocaleString()}`,
            });
            return;
        }

        setSaving(true);
        try {
            await inventoryService.moveLocation({
                invId: String(item.id),
                oldLocationId: String(item.locationId || ''),
                newLocationId,
                itemQty: qtyNum,
            });

            await Swal.fire({
                icon: 'success',
                title: 'ย้ายตำแหน่งจัดเก็บสำเร็จ',
                timer: 1500,
                showConfirmButton: false,
            });
            onClose();
            onMoved();
        } catch (err) {
            const msg = extractErrorMessage(err, 'ไม่สามารถบันทึกการย้ายตำแหน่งได้');
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถย้ายตำแหน่งได้',
                text: `${msg} (ตรวจสอบว่า Backend เปิด API /api/inventory/move แล้ว)`,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3 space-y-1.5 text-xs">
                    <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {item.itemCode || '-'}
                    </div>
                    <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {item.itemName || '-'}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-zinc-500">
                        <span>Lot: {item.lotNo || '-'}</span>
                        <span>S/N: {item.serialNo || '-'}</span>
                        <span>
                            คงเหลือ: <strong>{(item.itemQty ?? 0).toLocaleString()}</strong> {item.uomName || 'ชิ้น'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1 text-purple-700 dark:text-purple-300 font-medium">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>พิกัดปัจจุบัน: {item.locationName || '-'}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-blue-600 dark:text-blue-400">
                            {locationOptions.find((o) => o.value === newLocationId)?.label || 'รอเลือกปลายทาง'}
                        </span>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            พิกัดปลายทาง (Target Location)
                        </Label>
                        <button
                            type="button"
                            onClick={() => setScannerOpen(true)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                        >
                            <QrCode className="w-3.5 h-3.5" />
                            สแกน QR ชั้นวาง
                        </button>
                    </div>
                    <SearchableSelect
                        options={locationOptions}
                        value={newLocationId}
                        onChange={setNewLocationId}
                        placeholder="เลือกตำแหน่งจัดเก็บใหม่..."
                        searchPlaceholder="พิมพ์รหัสหรือชื่อตำแหน่ง..."
                        emptyText="ไม่พบตำแหน่งอื่นในคลังนี้"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        จำนวนที่ต้องการย้าย ({item.uomName || 'ชิ้น'})
                    </Label>
                    <input
                        type="number"
                        min={1}
                        max={Math.max(1, Number(item.itemQty) || 1)}
                        value={moveQty}
                        onChange={(e) => setMoveQty(e.target.value)}
                        className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm font-mono"
                    />
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="w-full sm:w-auto justify-center rounded-xl"
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        type="submit"
                        disabled={saving || !newLocationId}
                        className="w-full sm:w-auto justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {saving ? 'กำลังบันทึก...' : 'ยืนยันย้ายตำแหน่ง'}
                    </Button>
                </DialogFooter>
            </form>

            <QrScannerModal
                open={scannerOpen}
                onOpenChange={setScannerOpen}
                onScan={handleLocationQrScanned}
                title="สแกน QRCode ป้ายชั้นวางปลายทาง"
                subtitle="ส่องกล้องไปที่ป้าย QRCode พิกัดชั้นวางที่ต้องการย้ายสินค้าไปเก็บ"
            />
        </>
    );
}

export function LocationMoveModal({
    open,
    onOpenChange,
    item,
    locationList,
    onMoved,
}: LocationMoveModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md w-[calc(100vw-1rem)] p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                        <RefreshCw className="w-5 h-5 text-blue-600 shrink-0" />
                        ย้ายตำแหน่งจัดเก็บสินค้า
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-zinc-500">
                        สแกน QR พิกัดชั้นวางปลายทาง หรือเลือกตำแหน่งใหม่จากรายการ
                    </DialogDescription>
                </DialogHeader>

                {open && item && (
                    <LocationMoveBody
                        key={String(item.id || item.itemId)}
                        item={item}
                        locationList={locationList}
                        onClose={() => onOpenChange(false)}
                        onMoved={onMoved}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
