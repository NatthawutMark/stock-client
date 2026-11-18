'use client';

import React, { type ReactNode } from 'react';
import { Button } from '@/components/ui';
import type {
    DecodedQrResult,
    QrFeedbackStatus,
    QrScanMode,
    QrScanOutcome,
} from '@/lib/qrcode/types';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Info,
    Keyboard,
    RefreshCw,
    RotateCcw,
    Upload,
    XCircle,
} from 'lucide-react';
import { useQrScanner } from './useQrScanner';

export interface QrScannerPanelProps {
    onScan: (result: DecodedQrResult) => QrScanOutcome | Promise<QrScanOutcome>;
    onRequestClose?: () => void;
    enabled?: boolean;
    mode?: QrScanMode;
    keepOpen?: boolean;
    cooldownMs?: number;
    autoFocusInput?: boolean;
    inputRef?: React.RefObject<HTMLInputElement | null>;
    inputPlaceholder?: string;
    extraContent?: ReactNode;
}

const FEEDBACK_STYLES: Record<
    QrFeedbackStatus,
    { container: string; icon: typeof CheckCircle2 }
> = {
    success: {
        container:
            'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
        icon: CheckCircle2,
    },
    warning: {
        container:
            'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300',
        icon: AlertTriangle,
    },
    error: {
        container:
            'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
        icon: XCircle,
    },
    info: {
        container:
            'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
        icon: Info,
    },
};

export function QrScannerPanel({
    onScan,
    onRequestClose,
    enabled = true,
    mode = 'all',
    keepOpen = false,
    cooldownMs = 1500,
    autoFocusInput = true,
    inputRef,
    inputPlaceholder = 'ยิง USB Scanner หรือวางข้อความ QR / รหัส...',
    extraContent,
}: QrScannerPanelProps) {
    const {
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
    } = useQrScanner({
        enabled,
        mode,
        keepOpen,
        cooldownMs,
        autoFocusInput,
        inputRef,
        onScan,
        onRequestClose,
    });

    const feedbackMeta = feedback ? FEEDBACK_STYLES[feedback.status] : null;
    const FeedbackIcon = feedbackMeta?.icon ?? CheckCircle2;

    return (
        <div className="flex flex-col gap-3">
            {extraContent}

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
                        onClick={refreshCamera}
                        className="h-9 px-3 rounded-lg text-xs"
                        aria-label="รีเฟรชกล้อง"
                        title="รีเฟรชกล้อง"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isStarting ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            )}

            <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 min-h-[240px] flex items-center justify-center">
                <div id={readerDomId} className="w-full" />
                <div id={fileDomId} className="hidden" />

                {isStarting && !errorAlert && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 text-white gap-2">
                        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">กำลังเปิดกล้อง...</span>
                    </div>
                )}

                {!isScanning && !isStarting && cameraError && !errorAlert && (
                    <div className="p-5 text-center space-y-2 text-zinc-200">
                        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="text-xs leading-relaxed text-zinc-300">{cameraError}</p>
                    </div>
                )}

                {errorAlert && (
                    <div
                        role="alert"
                        aria-live="assertive"
                        className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 sm:p-5 bg-zinc-950/90 backdrop-blur-xs text-center"
                    >
                        <div className="w-full max-w-sm rounded-2xl border border-rose-500/50 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-xl space-y-3">
                            <div className="w-11 h-11 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                                <XCircle className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm sm:text-base font-bold text-rose-700 dark:text-rose-400">
                                    {errorAlert.title}
                                </h4>
                                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed break-words">
                                    {errorAlert.message}
                                </p>
                            </div>
                            <Button
                                ref={rescanButtonRef}
                                type="button"
                                onClick={dismissErrorAlert}
                                className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5"
                            >
                                <RotateCcw className="w-4 h-4" />
                                สแกนใหม่
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {feedback && !errorAlert && feedbackMeta && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${feedbackMeta.container}`}
                >
                    <FeedbackIcon className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                        {feedback.title ? `${feedback.title} — ${feedback.message}` : feedback.message}
                    </span>
                </div>
            )}

            <form
                onSubmit={handleManualSubmit}
                className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800"
            >
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <label htmlFor={manualInputId} className="sr-only">
                            ช่องกรอกหรือยิงรหัส QRCode
                        </label>
                        <Keyboard className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            ref={manualInputRef}
                            id={manualInputId}
                            type="text"
                            autoFocus={autoFocusInput}
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            disabled={Boolean(errorAlert)}
                            placeholder={inputPlaceholder}
                            className="w-full h-10 pl-9 pr-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        />
                    </div>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={Boolean(errorAlert)}
                        className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                    >
                        ยืนยันรหัส
                    </Button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>ไม่มีกล้อง? เลือกรูปภาพ QRCode ได้</span>
                    <label className="inline-flex items-center gap-1 min-h-6 px-1 text-blue-600 hover:underline cursor-pointer font-medium">
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
        </div>
    );
}
