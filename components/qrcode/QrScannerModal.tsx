'use client';

import React, { useRef, type ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    Button,
} from '@/components/ui';
import type { DecodedQrResult, QrScanMode, QrScanOutcome } from '@/lib/qrcode/types';
import { Camera } from 'lucide-react';
import { QrScannerPanel } from './QrScannerPanel';

export interface QrScannerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScan: (result: DecodedQrResult) => QrScanOutcome | Promise<QrScanOutcome>;
    mode?: QrScanMode;
    title?: string;
    subtitle?: string;
    keepOpen?: boolean;
    cooldownMs?: number;
    autoFocusInput?: boolean;
    inputPlaceholder?: string;
    headerExtra?: ReactNode;
    footerExtra?: ReactNode;
}

export function QrScannerModal({
    open,
    onOpenChange,
    onScan,
    mode = 'all',
    title = 'สแกน QRCode (กล้องมือถือ / โน้ตบุ๊ค / USB Scanner)',
    subtitle = 'นำกล้องส่องไปที่สติกเกอร์ QRCode หรือใช้เครื่องยิงบาร์โค้ดสแกนในช่องด้านล่าง',
    keepOpen = false,
    cooldownMs = 1500,
    autoFocusInput = true,
    inputPlaceholder,
    headerExtra,
    footerExtra,
}: QrScannerModalProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                initialFocus={autoFocusInput ? inputRef : true}
                className="sm:max-w-lg w-[calc(100vw-1rem)] max-h-[92dvh] flex flex-col gap-3 p-4 sm:p-6"
            >
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
                    <QrScannerPanel
                        enabled={open}
                        mode={mode}
                        keepOpen={keepOpen}
                        cooldownMs={cooldownMs}
                        autoFocusInput={autoFocusInput}
                        inputRef={inputRef}
                        inputPlaceholder={inputPlaceholder}
                        extraContent={headerExtra}
                        onScan={onScan}
                        onRequestClose={() => onOpenChange(false)}
                    />
                )}

                <DialogFooter className={footerExtra ? 'sm:items-center sm:justify-between gap-2' : undefined}>
                    {footerExtra ? <div className="flex-1 min-w-0">{footerExtra}</div> : null}
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
