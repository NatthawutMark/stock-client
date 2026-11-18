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
} from '@/components/ui';
import {
    DEFAULT_LABEL_SIZE,
    LABEL_SIZES,
    type LabelPaperMode,
    type LabelSizeKey,
    type PrintableLabelItem,
} from '@/lib/qrcode/types';
import {
    A4_HEIGHT_MM,
    A4_WIDTH_MM,
    calculateA4Grid,
    chunkItemsForA4,
    expandPrintableItems,
    resolveLabelConfig,
} from '@/lib/qrcode/labelLayout';
import { generateLabelPdf } from '@/lib/qrcode/pdfLabel';
import { printQrLabels } from '@/lib/qrcode/printLabel';
import { QrLabelPreviewCard } from './QrLabelPreviewCard';
import { Printer, Download, CheckSquare, Square, FileText, StickyNote, Sheet } from 'lucide-react';
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

const MAX_PREVIEW_ROLL_CARDS = 24;
const MAX_PREVIEW_A4_PAGES = 6;

function PrintQrcodeModelBody({
    items,
    onClose,
}: {
    items: PrintableLabelItem[];
    onClose: () => void;
}) {
    const [paperMode, setPaperMode] = useState<LabelPaperMode>('roll');
    const [sizeKey, setSizeKey] = useState<LabelSizeKey>(DEFAULT_LABEL_SIZE);
    const [customWidth, setCustomWidth] = useState<number>(70);
    const [customHeight, setCustomHeight] = useState<number>(50);

    const [rows, setRows] = useState<EditablePrintRow[]>(() =>
        items.map((item) => ({
            ...item,
            copies: Math.max(1, Number(item.copies) || 1),
            qty: Number(item.qty) || 1,
            selected: true,
        }))
    );

    const [savingPdf, setSavingPdf] = useState<boolean>(false);
    const [printing, setPrinting] = useState<boolean>(false);

    const activeConfig = useMemo(
        () => resolveLabelConfig(sizeKey, { widthMm: customWidth, heightMm: customHeight }),
        [sizeKey, customWidth, customHeight]
    );

    const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);
    const expandedLabels = useMemo(() => expandPrintableItems(selectedRows), [selectedRows]);

    const a4Grid = useMemo(() => calculateA4Grid(activeConfig), [activeConfig]);
    const a4Pages = useMemo(
        () => (paperMode === 'a4' ? chunkItemsForA4(expandedLabels, a4Grid.perPage) : []),
        [paperMode, expandedLabels, a4Grid.perPage]
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

    const handleSavePdf = async () => {
        if (selectedRows.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาเลือกรายการ',
                text: 'เลือกสินค้าหรือตำแหน่งอย่างน้อย 1 รายการก่อนบันทึก PDF',
            });
            return;
        }

        setSavingPdf(true);
        try {
            const res = await generateLabelPdf(selectedRows, {
                paperMode,
                sizeKey,
                customSize: { widthMm: customWidth, heightMm: customHeight },
            });

            const link = document.createElement('a');
            link.href = res.url;
            link.download = res.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.setTimeout(() => URL.revokeObjectURL(res.url), 10000);
        } catch (err) {
            console.error('Failed to save QR PDF:', err);
            Swal.fire({
                icon: 'error',
                title: 'บันทึก PDF ไม่สำเร็จ',
                text: err instanceof Error ? err.message : 'ไม่สามารถสร้างไฟล์ PDF ได้',
            });
        } finally {
            setSavingPdf(false);
        }
    };

    const handlePrint = async () => {
        if (selectedRows.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาเลือกรายการ',
                text: 'เลือกสินค้าหรือตำแหน่งอย่างน้อย 1 รายการก่อนสั่งพิมพ์',
            });
            return;
        }

        setPrinting(true);
        try {
            await printQrLabels(selectedRows, {
                paperMode,
                sizeKey,
                customSize: { widthMm: customWidth, heightMm: customHeight },
            });
        } catch (err) {
            console.error('Failed to print QR labels:', err);
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถเปิดหน้าพิมพ์ได้',
                text: err instanceof Error ? err.message : 'กรุณาลองใหม่อีกครั้ง หรือใช้ปุ่มบันทึก PDF แทน',
            });
        } finally {
            setPrinting(false);
        }
    };

    const rollPxPerMm = useMemo(
        () => Math.min(4.4, Math.max(2.5, 290 / activeConfig.widthMm)),
        [activeConfig.widthMm]
    );
    const a4PreviewPxPerMm = 1.48;

    return (
        <>
            <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 p-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            รูปแบบกระดาษ:
                        </span>
                        <div
                            role="radiogroup"
                            aria-label="รูปแบบกระดาษสำหรับพิมพ์"
                            className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0.5"
                        >
                            <button
                                type="button"
                                role="radio"
                                aria-checked={paperMode === 'roll'}
                                onClick={() => setPaperMode('roll')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                    paperMode === 'roll'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <StickyNote className="w-3.5 h-3.5" />
                                สติกเกอร์ (1 ดวง/หน้า)
                            </button>
                            <button
                                type="button"
                                role="radio"
                                aria-checked={paperMode === 'a4'}
                                onClick={() => setPaperMode('a4')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                    paperMode === 'a4'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <Sheet className="w-3.5 h-3.5" />
                                กระดาษ A4 (หลายดวง/หน้า)
                            </button>
                        </div>
                    </div>

                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        รวมทั้งหมด <strong className="text-zinc-900 dark:text-zinc-100">{expandedLabels.length}</strong> ดวง
                        {paperMode === 'a4' && (
                            <span className="ml-1.5">
                                ({a4Pages.length} หน้า A4 • {a4Grid.cols}×{a4Grid.rows} ดวง/แผ่น)
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-800">
                    <label
                        htmlFor="label-size-select"
                        className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                    >
                        ขนาดป้าย:
                    </label>
                    <select
                        id="label-size-select"
                        data-compact="true"
                        value={sizeKey}
                        onChange={(e) => setSizeKey(e.target.value as LabelSizeKey)}
                        className="h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-medium text-zinc-800 dark:text-zinc-100"
                    >
                        {LABEL_SIZES.map((sz) => (
                            <option key={sz.key} value={sz.key}>
                                {sz.label} — {sz.description}
                            </option>
                        ))}
                    </select>

                    {sizeKey === 'custom' && (
                        <div className="flex items-center gap-1.5 text-xs">
                            <label htmlFor="custom-label-width" className="text-zinc-600 dark:text-zinc-400">
                                กว้าง (mm)
                            </label>
                            <input
                                id="custom-label-width"
                                type="number"
                                min={20}
                                max={200}
                                data-compact="true"
                                value={customWidth}
                                onChange={(e) => setCustomWidth(Math.max(20, Math.min(200, Number(e.target.value) || 20)))}
                                className="w-16 h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs font-mono text-center"
                            />
                            <span className="text-zinc-400">×</span>
                            <label htmlFor="custom-label-height" className="text-zinc-600 dark:text-zinc-400">
                                สูง (mm)
                            </label>
                            <input
                                id="custom-label-height"
                                type="number"
                                min={15}
                                max={280}
                                data-compact="true"
                                value={customHeight}
                                onChange={(e) => setCustomHeight(Math.max(15, Math.min(280, Number(e.target.value) || 15)))}
                                className="w-16 h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs font-mono text-center"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 flex-1 overflow-y-auto pr-0.5">
                <div className="lg:col-span-5 flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-blue-600 cursor-pointer"
                        >
                            {rows.length > 0 && rows.every((r) => r.selected) ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                                <Square className="w-4 h-4 text-zinc-400" />
                            )}
                            เลือกรายการ ({selectedRows.length}/{rows.length})
                        </button>
                        <span className="text-[11px] text-zinc-400">อัปเดต Preview อัตโนมัติ</span>
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
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            Print Preview (
                            {paperMode === 'a4'
                                ? `A4 • ${a4Pages.length} หน้า • ${expandedLabels.length} ดวง`
                                : `${activeConfig.widthMm}×${activeConfig.heightMm} mm • ${expandedLabels.length} ดวง`}
                            )
                        </span>
                        <span className="text-[11px] text-zinc-400">
                            ใช้ได้กับเครื่องพิมพ์ทุกรุ่น
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 max-h-[380px] lg:max-h-[420px]">
                        {expandedLabels.length === 0 ? (
                            <div className="h-full min-h-[240px] flex items-center justify-center text-xs text-zinc-500 text-center px-4">
                                กรุณาเลือกรายการอย่างน้อย 1 รายการเพื่อดูตัวอย่างก่อนพิมพ์หรือบันทึก PDF
                            </div>
                        ) : paperMode === 'a4' ? (
                            <div className="flex flex-col items-center gap-4">
                                {a4Pages.slice(0, MAX_PREVIEW_A4_PAGES).map((pageItems, pageIdx) => (
                                    <div key={pageIdx} className="space-y-1.5">
                                        <div className="text-[11px] font-medium text-zinc-500 text-center">
                                            หน้า A4 ที่ {pageIdx + 1} / {a4Pages.length}
                                        </div>
                                        <div
                                            style={{
                                                width: `${A4_WIDTH_MM * a4PreviewPxPerMm}px`,
                                                height: `${A4_HEIGHT_MM * a4PreviewPxPerMm}px`,
                                                padding: `${a4Grid.marginMm * a4PreviewPxPerMm}px ${a4Grid.startXMm * a4PreviewPxPerMm}px`,
                                            }}
                                            className="bg-white shadow-sm border border-zinc-300 overflow-hidden"
                                        >
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: `repeat(${a4Grid.cols}, ${a4Grid.cellWidthMm * a4PreviewPxPerMm}px)`,
                                                    gap: `${a4Grid.gapMm * a4PreviewPxPerMm}px`,
                                                }}
                                            >
                                                {pageItems.map((labelItem, slotIdx) => (
                                                    <QrLabelPreviewCard
                                                        key={`${labelItem.id}-${pageIdx}-${slotIdx}`}
                                                        item={labelItem}
                                                        dimensions={{
                                                            widthMm: a4Grid.cellWidthMm,
                                                            heightMm: a4Grid.cellHeightMm,
                                                        }}
                                                        pxPerMm={a4PreviewPxPerMm}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {a4Pages.length > MAX_PREVIEW_A4_PAGES && (
                                    <p className="text-[11px] text-zinc-500 text-center">
                                        แสดงตัวอย่าง {MAX_PREVIEW_A4_PAGES} หน้าแรก (พิมพ์ / Save PDF จะได้ครบทั้ง {a4Pages.length} หน้า)
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                {expandedLabels.slice(0, MAX_PREVIEW_ROLL_CARDS).map((labelItem, idx) => (
                                    <div key={`${labelItem.id}-${idx}`} className="space-y-1">
                                        <div className="text-[10px] font-mono text-zinc-400 text-center">
                                            ดวงที่ {idx + 1} / {expandedLabels.length}
                                        </div>
                                        <QrLabelPreviewCard
                                            item={labelItem}
                                            dimensions={activeConfig}
                                            pxPerMm={rollPxPerMm}
                                        />
                                    </div>
                                ))}
                                {expandedLabels.length > MAX_PREVIEW_ROLL_CARDS && (
                                    <p className="text-[11px] text-zinc-500 text-center">
                                        แสดงตัวอย่าง {MAX_PREVIEW_ROLL_CARDS} ดวงแรก (พิมพ์ / Save PDF จะได้ครบทั้ง {expandedLabels.length} ดวง)
                                    </p>
                                )}
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
                    <Button
                        type="button"
                        variant="outline"
                        disabled={savingPdf || selectedRows.length === 0}
                        onClick={() => void handleSavePdf()}
                        className="w-full sm:w-auto justify-center px-4 py-2 text-sm font-medium rounded-xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-1.5"
                    >
                        <Download className="w-4 h-4" />
                        {savingPdf ? 'กำลังสร้าง PDF...' : 'บันทึก PDF'}
                    </Button>
                    <Button
                        type="button"
                        disabled={printing || selectedRows.length === 0}
                        onClick={() => void handlePrint()}
                        className="w-full sm:w-auto justify-center px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                    >
                        <Printer className="w-4 h-4" />
                        {printing ? 'กำลังเตรียมพิมพ์...' : 'พิมพ์ (Print)'}
                    </Button>
                </div>
            </DialogFooter>
        </>
    );
}

export function PrintQrcodeModel({
    open,
    onOpenChange,
    items,
    title = 'พิมพ์สติกเกอร์ QRCode (Print Preview & Save PDF)',
    subtitle = 'รองรับทั้งเครื่องพิมพ์สติกเกอร์ทุกยี่ห้อ และกระดาษ A4 ทั่วไป',
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
