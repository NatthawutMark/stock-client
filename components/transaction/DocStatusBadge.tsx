'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertCircle, FileText, Save } from 'lucide-react';

export type StatusCategory = 'completed' | 'pending' | 'cancelled' | 'draft' | 'saved';

export interface DocStatusBadgeProps {
    status: StatusCategory | unknown;
    label?: string;
    className?: string;
}

/**
 * วิเคราะห์ค่าสถานะเอกสาร (statusCode, statusName ฯลฯ)
 * ออกมาเป็นหมวดหมู่หลัก: completed | pending | cancelled | draft | saved
 */
export function getStatusCategory(statusValue: unknown): StatusCategory {
    const val = String(statusValue ?? '').trim().toLowerCase();

    if (
        [
            'completed',
            'complete',
            'approved',
            'success',
            '5',
            'รับแล้ว',
            'สำเร็จ',
            'รับเข้าคลัง',
            'อนุมัติ',
            'เสร็จสิ้น',
        ].includes(val)
    ) {
        return 'completed';
    }

    if (['save', 'saved', 'บันทึก', 'บันทึกแล้ว', 'บันทึกเอกสาร'].includes(val)) {
        return 'saved';
    }

    if (
        [
            'pending',
            'waiting',
            'in progress',
            '2',
            'รอรับ',
            'รอตรวจนับ',
            'รอดำเนินการ',
            'กำลังดำเนินการ',
            'confirmed',
            'ยืนยัน',
            'confirm',
        ].includes(val)
    ) {
        return 'pending';
    }

    if (['cancelled', 'canceled', 'cancel', 'rejected', '4', 'ยกเลิก', 'ปฏิเสธ'].includes(val)) {
        return 'cancelled';
    }

    return 'draft';
}

export function DocStatusBadge({ status, label, className = '' }: DocStatusBadgeProps) {
    const category = getStatusCategory(status);

    if (category === 'completed') {
        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 ${className}`}
            >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {label || 'เอกสารเสร็จสิ้น'}
            </span>
        );
    }

    if (category === 'pending') {
        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#9033FF]/10 text-[#9033FF] border border-[#9033FF]/25 dark:bg-[#9033FF]/20 dark:text-[#B072FF] dark:border-[#9033FF]/40 ${className}`}
            >
                <Clock className="w-3.5 h-3.5 text-[#9033FF] dark:text-[#B072FF]" />
                {label || 'กำลังดำเนินการ'}
            </span>
        );
    }

    if (category === 'saved') {
        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 ${className}`}
            >
                <Save className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                {label || 'บันทึกเอกสาร'}
            </span>
        );
    }

    if (category === 'cancelled') {
        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 ${className}`}
            >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                {label || 'ยกเลิกเอกสาร'}
            </span>
        );
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 ${className}`}
        >
            <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            {label || 'ฉบับร่าง'}
        </span>
    );
}

export function renderStatusBadge(statusValue: unknown, className?: string): React.ReactElement {
    return <DocStatusBadge status={statusValue} className={className} />;
}

export default DocStatusBadge;
