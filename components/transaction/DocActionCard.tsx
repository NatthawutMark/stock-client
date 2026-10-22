'use client';

import React from 'react';
import {
    FilePlus2,
    FileEdit,
    FileText,
    FileCheck,
    PackageCheck,
    Save,
    Printer,
    RotateCcw,
    Trash2,
    ArrowLeft,
    Check,
    Loader2,
    Hash,
    CheckCircle2,
    Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DocStage, DocActionCardProps, DocStageInfo } from './types';

/**
 * แปลงค่า stage หรือสถานะจาก Backend ให้เป็น 5 สถานะหลัก
 */
export function normalizeDocStage(stage?: DocStage | number | string, docNo?: string): DocStage {
    if (!stage) {
        return docNo ? 'saved' : 'create';
    }
    if (typeof stage === 'number') {
        switch (stage) {
            case 1:
                return 'create';
            case 2:
                return 'draft';
            case 3:
                return 'saved';
            case 4:
                return 'confirmed';
            case 5:
                return 'received';
            default:
                return 'create';
        }
    }
    const s = String(stage).trim().toLowerCase();
    if (s === '1' || s === 'create' || s === 'new' || s === 'สร้าง' || s === 'สร้างเอกสาร') {
        return 'create';
    }
    if (s === '2' || s === 'draft' || s === 'ร่าง' || s === 'บันทึกร่าง' || s === 'บันทึกร่าง (ยังไม่ได้เลข docno)') {
        return 'draft';
    }
    if (s === '3' || s === 'saved' || s === 'save' || s === 'open' || s === 'pending' || s === 'บันทึกเอกสาร' || s === 'บันทึกเอกสาร (มีเลข doc)') {
        return 'saved';
    }
    if (s === '4' || s === 'confirmed' || s === 'confirm' || s === 'approved' || s === 'approve' || s === 'ยืนยัน' || s === 'ยืนยันเอกสาร' || s === 'รอรับ' || s === 'รอรับเข้าคลัง') {
        return 'confirmed';
    }
    if (s === '5' || s === 'received' || s === 'receive' || s === 'completed' || s === 'complete' || s === 'รับเข้าคลัง' || s === 'สำเร็จ' || s === 'รับแล้ว') {
        return 'received';
    }
    return 'create';
}

export function DocActionCard({
    currentStage = 'create',
    docNo = '',
    docDate = '',
    saving = false,
    loading = false,
    disabled = false,
    readOnly = false,
    showTimeline = true,
    showSummary = true,
    summaryInfo,
    finalStageLabel = 'รับเข้าคลัง',
    customLabels,
    onCancel,
    onSaveDraft,
    onSaveDoc,
    onConfirm,
    onReceive,
    onDeleteDraft,
    onPrint,
    onRollback,
    onStageClick,
    extraButtons,
    className = '',
}: DocActionCardProps) {
    const activeStage = normalizeDocStage(currentStage, docNo);

    // กำหนดรายละเอียด 5 ขั้นตอนหลัก
    const STAGES: (DocStageInfo & { icon: React.ElementType })[] = [
        {
            key: 'create',
            step: 1,
            title: 'สร้างเอกสาร',
            subtitle: 'กำลังสร้างใหม่',
            description: 'สร้างเอกสารเริ่มต้น',
            icon: FilePlus2,
        },
        {
            key: 'draft',
            step: 2,
            title: 'บันทึกร่าง',
            subtitle: 'ยังไม่ได้เลข DocNo',
            description: 'บันทึกฉบับร่างไว้ ยังไม่มีเลขที่',
            icon: FileEdit,
        },
        {
            key: 'saved',
            step: 3,
            title: 'บันทึกเอกสาร',
            subtitle: docNo ? docNo : 'มีเลข Doc แล้ว',
            description: 'บันทึกและออกเลขที่เอกสาร',
            icon: FileText,
        },
        {
            key: 'confirmed',
            step: 4,
            title: 'ยืนยันเอกสาร',
            subtitle: 'รอตรวจรับเข้าคลัง',
            description: 'ตรวจสอบและยืนยันเอกสาร',
            icon: FileCheck,
        },
        {
            key: 'received',
            step: 5,
            title: finalStageLabel,
            subtitle: 'เสร็จสมบูรณ์',
            description: 'รับสินค้าเข้าสต็อกเรียบร้อย',
            icon: PackageCheck,
        },
    ];

    const currentStepIndex = STAGES.findIndex((s) => s.key === activeStage);
    const activeStepNumber = currentStepIndex !== -1 ? currentStepIndex + 1 : 1;
    const isBusy = saving || loading;

    // Helper แสดง Badge สถานะปัจจุบัน
    const renderActiveBadge = () => {
        switch (activeStage) {
            case 'create':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                        <FilePlus2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        กำลังสร้างเอกสารใหม่
                    </span>
                );
            case 'draft':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        บันทึกร่าง (ยังไม่ได้เลข DocNo)
                    </span>
                );
            case 'saved':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
                        <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        บันทึกเอกสารแล้ว {docNo && `(${docNo})`}
                    </span>
                );
            case 'confirmed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                        <FileCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        ยืนยันเอกสารแล้ว (รอรับเข้าคลัง)
                    </span>
                );
            case 'received':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        {finalStageLabel}เรียบร้อย (Completed)
                    </span>
                );
        }
    };

    return (
        <Card
            className={`border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-zinc-50/90 dark:bg-zinc-900/60 overflow-hidden transition-all ${className}`}
        >
            {/* ─────────────────────────────────────────────────────────────
                1. Timeline / Stepper แสดง 5 สถานะเอกสาร
               ───────────────────────────────────────────────────────────── */}
            {showTimeline && (
                <div className="px-5 pt-5 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40">
                    <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
                        {STAGES.map((st, index) => {
                            const isCompleted = st.step < activeStepNumber;
                            const isActive = st.step === activeStepNumber;
                            const IconComponent = st.icon;

                            return (
                                <React.Fragment key={st.key}>
                                    {/* Step Item */}
                                    <div
                                        onClick={() => onStageClick && onStageClick(st.key)}
                                        className={`flex items-center gap-2.5 min-w-[130px] sm:min-w-fit transition-all ${onStageClick ? 'cursor-pointer hover:opacity-80' : ''
                                            }`}
                                    >
                                        {/* Step Icon Badge */}
                                        <div
                                            className={`relative flex items-center justify-center w-8 h-8 rounded-full border text-xs font-bold transition-all shrink-0 ${isCompleted
                                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                                                    : isActive
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md ring-4 ring-blue-100 dark:ring-blue-950/60'
                                                        : 'bg-zinc-100 border-zinc-300 text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-500'
                                                }`}
                                        >
                                            {isCompleted ? (
                                                <Check className="w-4 h-4 stroke-[2.5]" />
                                            ) : (
                                                <IconComponent className="w-4 h-4" />
                                            )}

                                            {/* Pulse Dot สำหรับสถานะปัจจุบัน */}
                                            {isActive && (
                                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                                                </span>
                                            )}
                                        </div>

                                        {/* Step Label */}
                                        <div className="flex flex-col">
                                            <span
                                                className={`text-xs font-semibold leading-tight ${isActive
                                                        ? 'text-blue-600 dark:text-blue-400'
                                                        : isCompleted
                                                            ? 'text-zinc-800 dark:text-zinc-200'
                                                            : 'text-zinc-400 dark:text-zinc-500'
                                                    }`}
                                            >
                                                {st.title}
                                            </span>
                                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[110px]">
                                                {st.subtitle}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Connecting Line ระหว่างขั้นตอน */}
                                    {index < STAGES.length - 1 && (
                                        <div
                                            className={`flex-1 h-0.5 mx-2 min-w-[20px] rounded-full transition-colors ${isCompleted
                                                    ? 'bg-emerald-500'
                                                    : isActive
                                                        ? 'bg-gradient-to-r from-blue-500 to-zinc-200 dark:to-zinc-800'
                                                        : 'bg-zinc-200 dark:bg-zinc-800'
                                                }`}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                2. Summary Info & Action Buttons Bar
               ───────────────────────────────────────────────────────────── */}
            <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* ฝั่งซ้าย: ข้อมูลสถานะและสรุปข้อมูลเอกสาร */}
                {showSummary && (
                    <div className="flex flex-wrap items-center gap-3">
                        {renderActiveBadge()}

                        {docNo && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                                <Hash className="w-3.5 h-3.5 text-zinc-500" />
                                {docNo}
                            </span>
                        )}

                        {docDate && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                {docDate}
                            </span>
                        )}

                        {summaryInfo && (
                            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                <span>•</span>
                                {summaryInfo.totalItems !== undefined && (
                                    <span>
                                        รายการ:{' '}
                                        <strong className="text-zinc-800 dark:text-zinc-200">
                                            {summaryInfo.totalItems}
                                        </strong>
                                    </span>
                                )}
                                {summaryInfo.totalQty !== undefined && (
                                    <span>
                                        จำนวน:{' '}
                                        <strong className="text-zinc-800 dark:text-zinc-200">
                                            {summaryInfo.totalQty}
                                        </strong>{' '}
                                        ชิ้น
                                    </span>
                                )}
                                {summaryInfo.customText && <span>{summaryInfo.customText}</span>}
                            </div>
                        )}
                    </div>
                )}

                {/* ฝั่งขวา: กลุ่มปุ่ม Action ตามสถานะเอกสาร */}
                <div className="flex flex-wrap items-center justify-end gap-2.5">
                    {/* Extra Buttons เพิ่มเติม (ถ้ามี) */}
                    {extraButtons}

                    {/* 1. ปุ่มยกเลิก / ย้อนกลับ (มีทุกสถานะ) */}
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy || disabled}
                            onClick={onCancel}
                            className="px-4 py-2 text-sm rounded-xl border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {customLabels?.cancel || 'ย้อนกลับ'}
                        </Button>
                    )}

                    {/* 2. ปุ่มลบแบบร่าง (เฉพาะขั้นตอน draft) */}
                    {activeStage === 'draft' && onDeleteDraft && (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy || disabled || readOnly}
                            onClick={onDeleteDraft}
                            className="px-3.5 py-2 text-sm rounded-xl border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5"
                        >
                            <Trash2 className="w-4 h-4" />
                            {customLabels?.deleteDraft || 'ลบฉบับร่าง'}
                        </Button>
                    )}

                    {/* 3. ปุ่มพิมพ์เอกสาร (สำหรับสถานะ saved, confirmed, received) */}
                    {(activeStage === 'saved' || activeStage === 'confirmed' || activeStage === 'received') && onPrint && (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy || disabled}
                            onClick={onPrint}
                            className="px-3.5 py-2 text-sm rounded-xl border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5"
                        >
                            <Printer className="w-4 h-4" />
                            {customLabels?.print || 'พิมพ์เอกสาร'}
                        </Button>
                    )}

                    {/* 4. ปุ่มตีกลับ/ยกเลิกการยืนยัน (สำหรับสถานะ confirmed) */}
                    {activeStage === 'confirmed' && onRollback && (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy || disabled || readOnly}
                            onClick={onRollback}
                            className="px-3.5 py-2 text-sm rounded-xl border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1.5"
                        >
                            <RotateCcw className="w-4 h-4" />
                            {customLabels?.rollback || 'ตีกลับแก้ไข'}
                        </Button>
                    )}

                    {/* ─────────────────────────────────────────────────────────────
                        ปุ่มหลักตาม 5 สถานะที่ผู้ใช้ร้องขอ
                       ───────────────────────────────────────────────────────────── */}

                    {/* สถานะ 1: สร้างเอกสาร & สถานะ 2: บันทึกร่าง */}
                    {(activeStage === 'create' || activeStage === 'draft') && (
                        <>
                            {/* ปุ่ม บันทึกร่าง (ยังไม่ได้เลข DocNo) */}
                            {onSaveDraft && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isBusy || disabled || readOnly}
                                    onClick={onSaveDraft}
                                    className="px-4 py-2 text-sm rounded-xl border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 bg-amber-50/50 hover:bg-amber-100/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 flex items-center gap-1.5"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                                    ) : (
                                        <Save className="w-4 h-4 text-amber-600" />
                                    )}
                                    {customLabels?.saveDraft || 'บันทึกร่าง (ยังไม่ได้เลข DocNo)'}
                                </Button>
                            )}

                            {/* ปุ่ม บันทึกเอกสาร (มีเลข Doc) */}
                            {onSaveDoc && (
                                <Button
                                    type="button"
                                    disabled={isBusy || disabled || readOnly}
                                    onClick={onSaveDoc}
                                    className="px-5 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1.5"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <FileText className="w-4 h-4" />
                                    )}
                                    {customLabels?.saveDoc || 'บันทึกเอกสาร (มีเลข Doc)'}
                                </Button>
                            )}
                        </>
                    )}

                    {/* สถานะ 3: บันทึกเอกสาร (มีเลข Doc แล้ว) */}
                    {activeStage === 'saved' && (
                        <>
                            {/* ปุ่ม แก้ไข/บันทึกการแก้ไข */}
                            {onSaveDoc && !readOnly && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isBusy || disabled}
                                    onClick={onSaveDoc}
                                    className="px-4 py-2 text-sm rounded-xl border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-1.5"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    ) : (
                                        <Save className="w-4 h-4 text-blue-600" />
                                    )}
                                    {customLabels?.saveDoc || 'บันทึกการแก้ไข'}
                                </Button>
                            )}

                            {/* ปุ่ม ยืนยันเอกสาร */}
                            {onConfirm && (
                                <Button
                                    type="button"
                                    disabled={isBusy || disabled || readOnly}
                                    onClick={onConfirm}
                                    className="px-5 py-2 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center gap-1.5"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <FileCheck className="w-4 h-4" />
                                    )}
                                    {customLabels?.confirm || 'ยืนยันเอกสาร'}
                                </Button>
                            )}
                        </>
                    )}

                    {/* สถานะ 4: ยืนยันเอกสาร (รอรับเข้าคลัง) */}
                    {activeStage === 'confirmed' && (
                        <>
                            {/* ปุ่ม รับเข้าคลัง */}
                            {onReceive && (
                                <Button
                                    type="button"
                                    disabled={isBusy || disabled || readOnly}
                                    onClick={onReceive}
                                    className="px-5 py-2 text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center gap-1.5 ring-2 ring-emerald-500/20"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <PackageCheck className="w-4 h-4" />
                                    )}
                                    {customLabels?.receive || `${finalStageLabel} (Receive)`}
                                </Button>
                            )}
                        </>
                    )}

                    {/* สถานะ 5: รับเข้าคลังเรียบร้อย (Completed) */}
                    {activeStage === 'received' && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                เอกสารนี้รับเข้าคลังเรียบร้อยแล้ว
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}

export default DocActionCard;
