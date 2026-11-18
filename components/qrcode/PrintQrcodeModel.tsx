'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    Button,
} from '@/components/ui';
import {
    DEFAULT_ZEBRA_LABEL_SIZE,
    ZEBRA_LABEL_SIZES,
    type PrintableLabelItem,
    type ZebraLabelSizeKey,
} from '@/lib/qrcode/types';
import { generateZebraLabelPdf, type GeneratedPdfResult } from '@/lib/qrcode/pdfLabel';
import { Printer, Download, ExternalLink, RefreshCw, CheckSquare, Square, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

interface PrintQrcodeModelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: PrintableLabelItem[];
    title?: string;
    subtitle?: string;
}

interface EditablePrintRow extends PrintableLabelItem {
    selected: boolean;
}

function PrintQrcodeModelBody({
    items,
    onClose,
}: {
    items: PrintableLabelItem[];
    onClose: () => void;
}) {
    const [sizeKey, setSizeKey] = useState<ZebraLabelSizeKey>(DEFAULT_ZEBRA_LABEL_SIZE);
    const [rows, setRows] = useState<EditablePrintRow[]>(() =>
        items.map((item) => ({
            ...item,
            copies: Math.max(1, Number(item.copies) || 1),
            qty: Number(item.qty) || 1,
            selected: true,
        }))
    );
    const [generating, setGenerating] = useState<boolean>(items.length > 0);
    const [pdfResult, setPdfResult] = useState<GeneratedPdfResult | null>(null);
    const activeBlobUrlRef = useRef<string | null>(null);

    const revokeActiveUrl = useCallback(() => {
        if (activeBlobUrlRef.current) {
            URL.revokeObjectURL(activeBlobUrlRef.current);
            activeBlobUrlRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            revokeActiveUrl();
        };
    }, [revokeActiveUrl]);

    const buildPdfPreview = useCallback(
        async (targetRows: EditablePrintRow[], targetSize: ZebraLabelSizeKey) => {
            const chosen = targetRows.filter((r) => r.selected);
            if (chosen.length === 0) {
                revokeActiveUrl();
                setPdfResult(null);
                setGenerating(false);
                return;
            }

            setGenerating(true);
            try {
                const res = await generateZebraLabelPdf(chosen, targetSize);
                revokeActiveUrl();
                activeBlobUrlRef.current = res.url;
                setPdfResult(res);
            } catch (err) {
                console.error('Failed to generate Zebra PDF:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'สร้าง PDF ไม่สำเร็จ',
                    text: err instanceof Error ? err.message : 'ไม่สามารถสร้างไฟล์ PDF ได้',
                });
            } finally {
                setGenerating(false);
            }
        },
        [revokeActiveUrl]
    );

    // สร้าง PDF Preview อัตโนมัติครั้งแรกที่เปิด Modal (เรียก setState เฉพาะใน async callback)
    useEffect(() => {
        let cancelled = false;
        const initialChosen = items.map((item) => ({
            ...item,
            copies: Math.max(1, Number(item.copies) || 1),
            qty: Number(item.qty) || 1,
            selected: true,
        }));
        if (initialChosen.length === 0) return;

        generateZebraLabelPdf(initialChosen, DEFAULT_ZEBRA_LABEL_SIZE)
            .then((res) => {
                if (cancelled) {
                    URL.revokeObjectURL(res.url);
                    return;
                }
                revokeActiveUrl();
                activeBlobUrlRef.current = res.url;
                setPdfResult(res);
            })
            .catch((err) => {
                if (!cancelled) console.error('Initial PDF generation error:', err);
            })
            .finally(() => {
                if (!cancelled) setGenerating(false);
            });

        return () => {
            cancelled = true;
        };
    }, [items, revokeActiveUrl]);

    const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);
    const totalStickers = useMemo(
        () => selectedRows.reduce((sum, r) => sum + Math.max(1, Number(r.copies) || 1), 0),
        [selectedRows]
    );

    const toggleRow = (id: string) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
    };

    const toggleAll = () => {
        const allSelected = rows.length > 0 && rows.every((r) => r.selected);
        setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
    };

    const updateRowField = (id: string, field: 'copies' | 'qty', rawVal: string) => {
        const parsed = Math.max(1, Number(rawVal) || 1);
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: parsed } : r)));
    };

    const handleRegenerate = () => {
        if (selectedRows.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาเลือกรายการ',
                text: 'เลือกสินค้าหรือตำแหน่งอย่างน้อย 1 รายการก่อนสร้าง PDF Preview',
            });
            return;
        }
        void buildPdfPreview(rows, sizeKey);
    };

    const handleSizeChange = (nextSize: ZebraLabelSizeKey) => {
        setSizeKey(nextSize);
        if (selectedRows.length > 0) {
            void buildPdfPreview(rows, nextSize);
        }
    };

    const handleOpenNewTab = () => {
        if (!pdfResult?.url) return;
        window.open(pdfResult.url, '_blank', 'noopener,noreferrer');
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                    <label
                        htmlFor="zebra-size-select"
                        className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                    >
                        ขนาดสติกเกอร์ Zebra:
                    </label>
                    <select
                        id="zebra-size-select"
                        data-compact="true"
                        value={sizeKey}
                        onChange={(e) => handleSizeChange(e.target.value as ZebraLabelSizeKey)}
                        className="h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-medium text-zinc-800 dark:text-zinc-100"
                    >
                        {ZEBRA_LABEL_SIZES.map((sz) => (
                            <option key={sz.key} value={sz.key}>
                                {sz.label} — {sz.description}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        รวมทั้งหมด <strong className="text-zinc-900 dark:text-zinc-100">{totalStickers}</strong> ดวง
                    </span>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleRegenerate}
                        disabled={generating || selectedRows.length === 0}
                        className="h-9 rounded-lg text-xs flex items-center gap-1.5"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                        อัปเดต PDF Preview
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 flex-1 overflow-y-auto pr-0.5">
                <div className="lg:col-span-5 flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-blue-600"
                        >
                            {rows.length > 0 && rows.every((r) => r.selected) ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                                <Square className="w-4 h-4 text-zinc-400" />
                            )}
                            เลือกรายการ ({selectedRows.length}/{rows.length})
                        </button>
                        <span className="text-[11px] text-zinc-400">ปรับจำนวนดวงแล้วกดอัปเดต</span>
                    </div>

                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[260px] lg:max-h-[400px] overflow-y-auto">
                        {rows.map((row) => (
                            <div
                                key={row.id}
                                className={`p-3 space-y-2 transition-colors ${
                                    row.selected
                                        ? 'bg-white dark:bg-zinc-900'
                                        : 'bg-zinc-50/70 dark:bg-zinc-950/40 opacity-60'
                                }`}
                            >
                                <div className="flex items-start gap-2.5">
                                    <input
                                        type="checkbox"
                                        checked={row.selected}
                                        onChange={() => toggleRow(row.id)}
                                        className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600"
                                        aria-label={`เลือก ${row.itemCode}`}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                            {row.itemCode}
                                        </div>
                                        <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                            {row.itemName}
                                        </div>
                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-zinc-500 mt-0.5">
                                            <span>Lot: {row.lotNo || '-'}</span>
                                            <span>SN: {row.serialNo || '-'}</span>
                                            {row.expireDate && <span>EXP: {row.expireDate.slice(0, 10)}</span>}
                                        </div>
                                    </div>
                                </div>

                                {row.selected && (
                                    <div className="grid grid-cols-2 gap-2 pl-6">
                                        {row.kind === 'INV' && (
                                            <div>
                                                <label className="block text-[10px] text-zinc-500 mb-0.5">
                                                    จำนวน/ป้าย ({row.uomName || 'ชิ้น'})
                                                </label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    data-compact="true"
                                                    value={row.qty}
                                                    onChange={(e) => updateRowField(row.id, 'qty', e.target.value)}
                                                    className="w-full h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 text-xs font-mono"
                                                />
                                            </div>
                                        )}
                                        <div className={row.kind === 'LOC' ? 'col-span-2' : ''}>
                                            <label className="block text-[10px] text-zinc-500 mb-0.5">
                                                จำนวนดวงที่พิมพ์
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={200}
                                                data-compact="true"
                                                value={row.copies}
                                                onChange={(e) => updateRowField(row.id, 'copies', e.target.value)}
                                                className="w-full h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 text-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-7 flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 min-h-[320px] lg:min-h-[420px]">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                            <FileText className="w-3.5 h-3.5 text-rose-500" />
                            ตัวอย่างไฟล์ PDF (
                            {pdfResult
                                ? `${pdfResult.sizeConfig.widthMm}×${pdfResult.sizeConfig.heightMm} mm • ${pdfResult.totalPages} หน้า`
                                : 'รอสร้าง'}
                            )
                        </span>
                        {pdfResult && (
                            <button
                                type="button"
                                onClick={handleOpenNewTab}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                เปิดแท็บเต็มจอ
                            </button>
                        )}
                    </div>

                    <div className="flex-1 flex items-center justify-center p-2">
                        {generating ? (
                            <div className="flex flex-col items-center gap-2 text-zinc-500">
                                <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs">กำลังสร้าง PDF สติกเกอร์ Zebra...</span>
                            </div>
                        ) : pdfResult?.url ? (
                            <iframe
                                src={pdfResult.url}
                                title="Zebra QR PDF Preview"
                                className="w-full h-[300px] sm:h-[380px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white"
                            />
                        ) : (
                            <div className="text-xs text-zinc-500 text-center px-4">
                                เลือกรายการและกดปุ่ม &ldquo;อัปเดต PDF Preview&rdquo; เพื่อดูตัวอย่างก่อนสั่งพิมพ์
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="w-full sm:w-auto justify-center rounded-xl"
                >
                    ปิดหน้าต่าง
                </Button>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {pdfResult?.url && (
                        <>
                            <a
                                href={pdfResult.url}
                                download={pdfResult.fileName}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            >
                                <Download className="w-4 h-4" />
                                ดาวน์โหลด PDF
                            </a>
                            <Button
                                type="button"
                                onClick={handleOpenNewTab}
                                className="w-full sm:w-auto justify-center px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                            >
                                <Printer className="w-4 h-4" />
                                เปิด PDF Preview เพื่อพิมพ์ Zebra
                            </Button>
                        </>
                    )}
                </div>
            </DialogFooter>
        </>
    );
}

export function PrintQrcodeModel({
    open,
    onOpenChange,
    items,
    title = 'พิมพ์สติกเกอร์ QRCode (Zebra PDF Preview)',
    subtitle = 'สร้างไฟล์ PDF ขนาดสติกเกอร์สำหรับสั่งพิมพ์ออกเครื่อง Zebra (ค่าเริ่มต้น 70 × 50 mm)',
}: PrintQrcodeModelProps) {
    const itemsKey = useMemo(() => items.map((i) => i.id).join('|'), [items]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl w-[calc(100vw-1rem)] max-h-[92dvh] flex flex-col gap-4 p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        <Printer className="w-5 h-5 text-blue-600 shrink-0" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                        {subtitle}
                    </DialogDescription>
                </DialogHeader>

                {open && (
                    <PrintQrcodeModelBody
                        key={itemsKey}
                        items={items}
                        onClose={() => onOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
