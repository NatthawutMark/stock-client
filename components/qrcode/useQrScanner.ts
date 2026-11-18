'use client';

import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { decodeQrString, formatQrDisplayLabel } from '@/lib/qrcode/codec';
import type {
    DecodedQrResult,
    QrScanFeedback,
    QrScanMode,
    QrScanOutcome,
} from '@/lib/qrcode/types';

export interface CameraOption {
    id: string;
    label: string;
}

export interface QrErrorAlertState {
    title: string;
    message: string;
}

export interface UseQrScannerOptions {
    enabled?: boolean;
    mode?: QrScanMode;
    keepOpen?: boolean;
    cooldownMs?: number;
    autoFocusInput?: boolean;
    inputRef?: React.RefObject<HTMLInputElement | null>;
    onScan: (result: DecodedQrResult) => QrScanOutcome | Promise<QrScanOutcome>;
    onRequestClose?: () => void;
}

function validateQrMode(decoded: DecodedQrResult, mode: QrScanMode): QrScanFeedback | null {
    if (mode === 'inventory' && decoded.kind === 'LOC') {
        return {
            status: 'error',
            title: 'นี่คือ QRCode ป้ายชั้นวาง',
            message: `พิกัด ${decoded.payload.code || '-'} — กรุณาสแกน QRCode บนกล่องสินค้า`,
            requireAcknowledge: true,
        };
    }

    if (mode === 'location' && decoded.kind === 'INV') {
        return {
            status: 'error',
            title: 'QRCode ไม่ใช่ป้ายพิกัด',
            message: `พบ QR สินค้า (${decoded.payload.c || '-'}) — กรุณาสแกน QRCode ของป้ายชั้นวาง (Location)`,
            requireAcknowledge: true,
        };
    }

    return null;
}

export function useQrScanner({
    enabled = true,
    mode = 'all',
    keepOpen = false,
    cooldownMs = 1500,
    autoFocusInput = true,
    inputRef,
    onScan,
    onRequestClose,
}: UseQrScannerOptions) {
    const uniqueId = useId().replace(/:/g, '');
    const readerDomId = `qr-reader-${uniqueId}`;
    const fileDomId = `${readerDomId}-file`;
    const manualInputId = `${readerDomId}-manual-input`;

    const [cameras, setCameras] = useState<CameraOption[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>('');
    const [cameraError, setCameraError] = useState<string>('');
    const [isStarting, setIsStarting] = useState<boolean>(enabled);
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [manualCode, setManualCode] = useState<string>('');
    const [feedback, setFeedback] = useState<QrScanFeedback | null>(null);
    const [errorAlert, setErrorAlert] = useState<QrErrorAlertState | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scannerRef = useRef<any>(null);
    const sessionRef = useRef<number>(0);
    const lastScannedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
    const isPausedRef = useRef<boolean>(false);

    const internalInputRef = useRef<HTMLInputElement | null>(null);
    const manualInputRef = inputRef ?? internalInputRef;
    const rescanButtonRef = useRef<HTMLButtonElement | null>(null);

    const onScanRef = useRef(onScan);
    const onRequestCloseRef = useRef(onRequestClose);

    useEffect(() => {
        onScanRef.current = onScan;
        onRequestCloseRef.current = onRequestClose;
    }, [onScan, onRequestClose]);

    const focusManualInput = useCallback(() => {
        if (!autoFocusInput) return;
        const input = manualInputRef.current;
        if (!input || typeof document === 'undefined') return;
        if (document.activeElement !== input) {
            input.focus({ preventScroll: true });
        }
    }, [autoFocusInput, manualInputRef]);

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

    const triggerHaptic = useCallback((isError: boolean) => {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(isError ? [120, 60, 120] : 90);
        }
    }, []);

    const processDecodedText = useCallback(
        async (rawText: string, source: 'camera' | 'manual' | 'file') => {
            if (isPausedRef.current) return;

            const clean = rawText.trim();
            if (!clean) return;

            // ป้องกันการอ่านเฟรมซ้ำรัวๆ จากกล้องภายในช่วง cooldown
            if (source === 'camera') {
                const now = Date.now();
                if (
                    lastScannedRef.current.text === clean &&
                    now - lastScannedRef.current.time < cooldownMs
                ) {
                    return;
                }
                lastScannedRef.current = { text: clean, time: now };
            }

            const decoded = decodeQrString(clean);
            const modeError = validateQrMode(decoded, mode);
            if (modeError) {
                isPausedRef.current = true;
                triggerHaptic(true);
                setFeedback(modeError);
                setErrorAlert({
                    title: modeError.title || 'ประเภท QRCode ไม่ถูกต้อง',
                    message: modeError.message,
                });
                return;
            }

            isPausedRef.current = true;
            try {
                const outcome = await onScanRef.current(decoded);

                if (outcome && typeof outcome === 'object') {
                    const isBlockingError =
                        outcome.status === 'error' && (outcome.requireAcknowledge ?? true);

                    setFeedback(outcome);

                    if (isBlockingError) {
                        triggerHaptic(true);
                        setErrorAlert({
                            title: outcome.title || 'ข้อมูล QRCode ไม่ถูกต้อง',
                            message: outcome.message,
                        });
                        return;
                    }

                    triggerHaptic(outcome.status === 'warning');
                    isPausedRef.current = false;

                    if (!keepOpen && outcome.status !== 'warning') {
                        await stopScannerSafely();
                        onRequestCloseRef.current?.();
                    }
                    return;
                }

                if (outcome === false) {
                    const msg = `ไม่พบข้อมูลที่ตรงกันสำหรับ ${formatQrDisplayLabel(decoded)}`;
                    triggerHaptic(true);
                    setFeedback({ status: 'error', title: 'สแกนไม่สำเร็จ', message: msg });
                    setErrorAlert({ title: 'สแกนไม่สำเร็จ', message: msg });
                    return;
                }

                // กรณี callback คืนค่า void หรือ true
                triggerHaptic(false);
                setFeedback({
                    status: 'success',
                    message: `สแกนสำเร็จ — ${formatQrDisplayLabel(decoded)}`,
                });
                isPausedRef.current = false;

                if (!keepOpen) {
                    await stopScannerSafely();
                    onRequestCloseRef.current?.();
                }
            } catch (err) {
                const msg =
                    err instanceof Error && err.message
                        ? err.message
                        : 'เกิดข้อผิดพลาดระหว่างประมวลผล QRCode';
                triggerHaptic(true);
                setFeedback({ status: 'error', title: 'เกิดข้อผิดพลาด', message: msg });
                setErrorAlert({ title: 'เกิดข้อผิดพลาด', message: msg });
            }
        },
        [cooldownMs, keepOpen, mode, stopScannerSafely, triggerHaptic]
    );

    const dismissErrorAlert = useCallback(() => {
        setErrorAlert(null);
        isPausedRef.current = false;
        lastScannedRef.current = { text: '', time: 0 };
        setManualCode('');
        window.requestAnimationFrame(() => {
            focusManualInput();
        });
    }, [focusManualInput]);

    const startCameraWithId = useCallback(
        async (cameraIdOrConstraint: string | MediaTrackConstraints) => {
            const currentSession = ++sessionRef.current;
            await stopScannerSafely();
            if (sessionRef.current !== currentSession) return;

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
                if (sessionRef.current !== currentSession) return;

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
                        void processDecodedText(decodedText, 'camera');
                    },
                    () => {
                        // Ignore per-frame decode misses
                    }
                );

                if (sessionRef.current !== currentSession) {
                    await stopScannerSafely();
                    return;
                }

                setIsScanning(true);
            } catch (err) {
                if (sessionRef.current !== currentSession) return;
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
                if (sessionRef.current === currentSession) {
                    setIsStarting(false);
                }
            }
        },
        [processDecodedText, readerDomId, stopScannerSafely]
    );

    // จัดการเริ่ม/หยุดกล้องตามสถานะ enabled
    useEffect(() => {
        if (!enabled) {
            sessionRef.current += 1;
            isPausedRef.current = false;
            void stopScannerSafely();
            return;
        }

        let cancelled = false;
        const currentSession = ++sessionRef.current;

        const timer = window.setTimeout(async () => {
            if (cancelled || sessionRef.current !== currentSession) return;

            if (typeof window !== 'undefined' && !window.isSecureContext) {
                setCameraError(
                    'เบราว์เซอร์บล็อกการเปิดกล้องเพราะไม่ได้เชื่อมต่อผ่าน HTTPS หรือ localhost (ใช้เครื่องยิง USB หรืออัปโหลดรูปด้านล่างได้)'
                );
                setIsStarting(false);
                return;
            }

            try {
                const { Html5Qrcode } = await import('html5-qrcode');
                const devices = await Html5Qrcode.getCameras();
                if (cancelled || sessionRef.current !== currentSession) return;

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
                if (!cancelled && sessionRef.current === currentSession) {
                    await startCameraWithId({ facingMode: 'environment' });
                }
            }
        }, 120);

        return () => {
            cancelled = true;
            sessionRef.current += 1;
            window.clearTimeout(timer);
            void stopScannerSafely();
        };
    }, [enabled, startCameraWithId, stopScannerSafely]);

    // จัดการ Auto-focus ช่องกรอก/ยิง QR และปุ่ม "สแกนใหม่" เมื่อเกิด Error Alert
    useEffect(() => {
        if (!enabled) return;

        if (errorAlert) {
            const id = window.requestAnimationFrame(() => {
                rescanButtonRef.current?.focus({ preventScroll: true });
            });
            return () => window.cancelAnimationFrame(id);
        }

        if (!autoFocusInput) return;

        const rafId = window.requestAnimationFrame(() => {
            focusManualInput();
        });
        const fallbackTimer = window.setTimeout(() => {
            focusManualInput();
        }, 140);

        return () => {
            window.cancelAnimationFrame(rafId);
            window.clearTimeout(fallbackTimer);
        };
    }, [enabled, errorAlert, autoFocusInput, focusManualInput]);

    const handleCameraSwitch = useCallback(
        (camId: string) => {
            setSelectedCameraId(camId);
            void startCameraWithId(camId);
        },
        [startCameraWithId]
    );

    const refreshCamera = useCallback(() => {
        if (selectedCameraId) {
            void startCameraWithId(selectedCameraId);
        } else {
            void startCameraWithId({ facingMode: 'environment' });
        }
    }, [selectedCameraId, startCameraWithId]);

    const handleManualSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (isPausedRef.current) return;
            const code = manualCode.trim();
            if (!code) {
                focusManualInput();
                return;
            }
            setManualCode('');
            void processDecodedText(code, 'manual').finally(() => {
                if (keepOpen && !isPausedRef.current) {
                    window.requestAnimationFrame(() => {
                        focusManualInput();
                    });
                }
            });
        },
        [focusManualInput, keepOpen, manualCode, processDecodedText]
    );

    const handleImageFileUpload = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let tempScanner: any = null;
            try {
                const { Html5Qrcode } = await import('html5-qrcode');
                tempScanner = new Html5Qrcode(fileDomId, { verbose: false });
                const decodedText = await tempScanner.scanFile(file, false);
                await processDecodedText(decodedText, 'file');
            } catch {
                triggerHaptic(true);
                setFeedback({
                    status: 'error',
                    title: 'ไม่พบ QRCode ในรูปภาพ',
                    message: 'ไม่พบ QRCode ในรูปภาพที่เลือก กรุณาลองรูปที่คมชัดขึ้น',
                });
            } finally {
                try {
                    tempScanner?.clear();
                } catch {
                    // ข้าม error กรณี clear ไม่ได้
                }
                e.target.value = '';
            }
        },
        [fileDomId, processDecodedText, triggerHaptic]
    );

    return {
        readerDomId,
        fileDomId,
        manualInputId,
        manualInputRef,
        rescanButtonRef,
        cameras,
        selectedCameraId,
        cameraError,
        isStarting,
        isScanning,
        manualCode,
        setManualCode,
        feedback,
        errorAlert,
        dismissErrorAlert,
        handleCameraSwitch,
        refreshCamera,
        handleManualSubmit,
        handleImageFileUpload,
        focusManualInput,
        stopScannerSafely,
    };
}
