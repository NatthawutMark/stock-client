'use client';

import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    Button,
} from '@/components/ui';
import { decodeQrString } from '@/lib/qrcode/codec';
import type { DecodedQrResult } from '@/lib/qrcode/types';
import { Camera, Keyboard, Upload, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CameraOption {
    id: string;
    label: string;
}

interface QrScannerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScan: (result: DecodedQrResult) => void;
    title?: string;
    subtitle?: string;
    keepOpen?: boolean;
}

function QrScannerBody({
    onScan,
    onRequestClose,
    keepOpen,
}: {
    onScan: (result: DecodedQrResult) => void;
    onRequestClose: () => void;
    keepOpen: boolean;
}) {
    const readerDomId = `qr-reader-${useId().replace(/:/g, '')}`;

    const [cameras, setCameras] = useState<CameraOption[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>('');
    const [cameraError, setCameraError] = useState<string>('');
    const [isStarting, setIsStarting] = useState<boolean>(true);
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [manualCode, setManualCode] = useState<string>('');
    const [lastFeedback, setLastFeedback] = useState<string>('');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scannerRef = useRef<any>(null);
    const lastScannedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
    const onScanRef = useRef(onScan);
    const onRequestCloseRef = useRef(onRequestClose);

    useEffect(() => {
        onScanRef.current = onScan;
        onRequestCloseRef.current = onRequestClose;
    }, [onScan, onRequestClose]);

    const stopScannerSafely = useCallback(async () => {
        const instance = scannerRef.current;
        if (!instance) return;
        scannerRef.current = null;
        try {
            if (instance.isScanning) {
                await instance.stop();
            }
        } catch {
            // ข้าม error กรณีกล้องยังไม่เริ่มทำงาน
        }
        try {
            instance.clear();
        } catch {
            // ข้าม error กรณี DOM ถูก unmount ไปแล้ว
        }
        setIsScanning(false);
    }, []);

    const handleDecodedRawText = useCallback(
        (rawText: string) => {
            const clean = rawText.trim();
            if (!clean) return;

            const now = Date.now();
            if (lastScannedRef.current.text === clean && now - lastScannedRef.current.time < 1500) {
                return;
            }
            lastScannedRef.current = { text: clean, time: now };

            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(100);
            }

            const decoded = decodeQrString(clean);
            const displayLabel =
                decoded.kind === 'INV'
                    ? `สินค้า: ${decoded.payload.c}`
                    : decoded.kind === 'LOC'
                      ? `พิกัด: ${decoded.payload.code}`
                      : `รหัส: ${decoded.text}`;

            setLastFeedback(`สแกนสำเร็จ — ${displayLabel}`);
            onScanRef.current(decoded);

            if (!keepOpen) {
                void stopScannerSafely().then(() => onRequestCloseRef.current());
            }
        },
        [keepOpen, stopScannerSafely]
    );

    const startCameraWithId = useCallback(
        async (cameraIdOrConstraint: string | MediaTrackConstraints) => {
            await stopScannerSafely();
            setCameraError('');
            setIsStarting(true);

            try {
                if (typeof window !== 'undefined' && !window.isSecureContext) {
                    setCameraError(
                        'เบราว์เซอร์ไม่อนุญาตให้เปิดกล้องบน HTTP ทั่วไป (กรุณาใช้งานผ่าน HTTPS หรือ localhost หรือใช้เครื่องยิง USB/อัปโหลดรูปด้านล่างแทน)'
                    );
                    return;
                }

                const { Html5Qrcode } = await import('html5-qrcode');
                const targetEl = document.getElementById(readerDomId);
                if (!targetEl) return;

                const html5Qr = new Html5Qrcode(readerDomId, { verbose: false });
                scannerRef.current = html5Qr;

                await html5Qr.start(
                    cameraIdOrConstraint,
                    {
                        fps: 10,
                        qrbox: { width: 220, height: 220 },
                        aspectRatio: 1.333,
                    },
                    (decodedText) => {
                        handleDecodedRawText(decodedText);
                    },
                    () => {
                        // Ignore per-frame decode misses
                    }
                );

                setIsScanning(true);
            } catch (err) {
                console.error('Camera start error:', err);
                const msg = err instanceof Error ? err.message : '';
                if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
                    setCameraError('ไม่ได้รับสิทธิ์เข้าถึงกล้อง กรุณากดอนุญาตสิทธิ์การใช้กล้องในเบราว์เซอร์');
                } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
                    setCameraError('ไม่พบอุปกรณ์กล้องบนเครื่องนี้ (สามารถใช้เครื่องยิงบาร์โค้ด USB หรืออัปโหลดรูปแทนได้)');
                } else {
                    setCameraError('ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์กล้องหรือใช้ช่องกรอก/สแกนด้านล่าง');
                }
            } finally {
                setIsStarting(false);
            }
        },
        [handleDecodedRawText, readerDomId, stopScannerSafely]
    );

    useEffect(() => {
        let cancelled = false;

        const timer = window.setTimeout(async () => {
            if (typeof window !== 'undefined' && !window.isSecureContext) {
                if (!cancelled) {
                    setCameraError(
                        'เบราว์เซอร์บล็อกการเปิดกล้องเพราะไม่ได้เชื่อมต่อผ่าน HTTPS หรือ localhost (ใช้เครื่องยิง USB หรืออัปโหลดรูปด้านล่างได้)'
                    );
                    setIsStarting(false);
                }
                return;
            }

            try {
                const { Html5Qrcode } = await import('html5-qrcode');
                const devices = await Html5Qrcode.getCameras();
                if (cancelled) return;

                const mapped: CameraOption[] = devices.map((d, idx) => ({
                    id: d.id,
                    label: d.label || `กล้อง ${idx + 1}`,
                }));
                setCameras(mapped);

                if (mapped.length > 0) {
                    const rearCam = mapped.find((c) => /(back|rear|environment|หลัง)/i.test(c.label));
                    const initialCamId = rearCam ? rearCam.id : mapped[0].id;
                    setSelectedCameraId(initialCamId);
                    await startCameraWithId(initialCamId);
                } else {
                    await startCameraWithId({ facingMode: 'environment' });
                }
            } catch {
                if (!cancelled) {
                    await startCameraWithId({ facingMode: 'environment' });
                }
            }
        }, 120);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            void stopScannerSafely();
        };
    }, [startCameraWithId, stopScannerSafely]);

    const handleCameraSwitch = (camId: string) => {
        setSelectedCameraId(camId);
        void startCameraWithId(camId);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode.trim()) return;
        handleDecodedRawText(manualCode);
        setManualCode('');
    };

    const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const tempScanner = new Html5Qrcode(`${readerDomId}-file`, { verbose: false });
            const decodedText = await tempScanner.scanFile(file, false);
            tempScanner.clear();
            handleDecodedRawText(decodedText);
        } catch {
            setCameraError('ไม่พบ QRCode ในรูปภาพที่เลือก กรุณาลองรูปที่คมชัดขึ้น');
        } finally {
            e.target.value = '';
        }
    };

    return (
        <>
            {cameras.length > 0 && (
                <div className="flex items-center gap-2">
                    <select
                        data-compact="true"
                        aria-label="เลือกกล้อง"
                        value={selectedCameraId}
                        onChange={(e) => handleCameraSwitch(e.target.value)}
                        className="flex-1 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-zinc-800 dark:text-zinc-100"
                    >
                        {cameras.map((cam) => (
                            <option key={cam.id} value={cam.id}>
                                {cam.label}
                            </option>
                        ))}
                    </select>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            selectedCameraId
                                ? handleCameraSwitch(selectedCameraId)
                                : startCameraWithId({ facingMode: 'environment' })
                        }
                        className="h-9 px-3 rounded-lg text-xs"
                        title="รีเฟรชกล้อง"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isStarting ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            )}

            <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 min-h-[240px] flex items-center justify-center">
                <div id={readerDomId} className="w-full" />
                <div id={`${readerDomId}-file`} className="hidden" />

                {isStarting && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 text-white gap-2">
                        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">กำลังเปิดกล้อง...</span>
                    </div>
                )}

                {!isScanning && !isStarting && cameraError && (
                    <div className="p-5 text-center space-y-2 text-zinc-200">
                        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="text-xs leading-relaxed text-zinc-300">{cameraError}</p>
                    </div>
                )}
            </div>

            {lastFeedback && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{lastFeedback}</span>
                </div>
            )}

            <form
                onSubmit={handleManualSubmit}
                className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800"
            >
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <Keyboard className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            placeholder="ยิง USB Scanner หรือวางข้อความ QR / รหัสสินค้า..."
                            className="w-full h-10 pl-9 pr-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs sm:text-sm"
                        />
                    </div>
                    <Button
                        type="submit"
                        size="sm"
                        className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                    >
                        ยืนยันรหัส
                    </Button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>ไม่มีกล้อง? เลือกรูปภาพ QRCode ได้</span>
                    <label className="inline-flex items-center gap-1 text-blue-600 hover:underline cursor-pointer font-medium">
                        <Upload className="w-3.5 h-3.5" />
                        อัปโหลดรูป QR
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileUpload}
                            className="hidden"
                        />
                    </label>
                </div>
            </form>
        </>
    );
}

export function QrScannerModal({
    open,
    onOpenChange,
    onScan,
    title = 'สแกน QRCode (กล้องมือถือ / โน้ตบุ๊ค / USB Scanner)',
    subtitle = 'นำกล้องส่องไปที่สติกเกอร์ QRCode หรือใช้เครื่องยิงบาร์โค้ดสแกนในช่องด้านล่าง',
    keepOpen = false,
}: QrScannerModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg w-[calc(100vw-1rem)] max-h-[92dvh] flex flex-col gap-3 p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        <Camera className="w-5 h-5 text-blue-600 shrink-0" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                        {subtitle}
                    </DialogDescription>
                </DialogHeader>

                {open && (
                    <QrScannerBody
                        onScan={onScan}
                        onRequestClose={() => onOpenChange(false)}
                        keepOpen={keepOpen}
                    />
                )}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto justify-center rounded-xl"
                    >
                        ปิดหน้าต่างสแกน
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
