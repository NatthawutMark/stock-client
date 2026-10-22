'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertCircle, FileText, Save } from 'lucide-react';

export type StatusCategory = 'completed' | 'pending' | 'cancelled' | 'draft' | 'saved' | 'save' | 'CONFIRM';

export interface DocStatusBadgeProps {
    status: StatusCategory | unknown;
    label?: string;
    className?: string;
}

/**
 * วิเคราะห์ค่าสถานะเอกสาร (statusCode, statusName, docStatus ฯลฯ)
 * ออกมาเป็น Category หลัก: completed | pending | cancelled | draft | saved
 */
export function getStatusCategory(statusValue: unknown): StatusCategory {
    const val = String(statusValue ?? '').trim().toLowerCase();

    if (
        val === 'completed' ||
        val === 'approved' ||
        val === 'success' ||
        val === '5' ||
        val === 'รับแล้ว' ||
        val === 'สำเร็จ' ||
        val === 'รับเข้าคลัง' ||
        val === 'อนุมัติ' ||
        val === 'เสร็จสิ้น'
    ) {
        return 'completed';
    }

    if (
        val === 'Save' ||
        val === 'save' ||
        val === 'saved' ||
        val === 'บันทึก' ||
        val === 'บันทึกแล้ว' ||
        val === 'บันทึกเอกสาร'
    ) {
        return 'saved';
    }

    if (
        val === 'pending' ||
        val === 'waiting' ||
        val === 'in progress' ||
        val === '2' ||
        val === 'รอรับ' ||
        val === 'รอตรวจนับ' ||
        val === 'รอดำเนินการ' ||
        val === 'กำลังดำเนินการ' ||
        val === 'confirmed' ||
        val === 'ยืนยัน' ||
        val === 'confirm'
    ) {
        return 'pending';
    }

    if (
        val === 'cancelled' ||
        val === 'canceled' ||
        val === 'rejected' ||
        val === '4' ||
        val === 'ยกเลิก' ||
        val === 'ปฏิเสธ'
    ) {
        return 'cancelled';
    }

    return 'draft';
}

/**
 * Component แสดง Badge สถานะเอกสาร (DocStatusBadge)
 * รองรับทั้งการเรียกใช้แบบ <DocStatusBadge status={...} />
 * หรือผ่านฟังก์ชัน renderStatusBadge(...)
 */
export function DocStatusBadge({ status, label, className = '' }: DocStatusBadgeProps) {
    const category = getStatusCategory(status);
    const val = String(status ?? '').trim().toLowerCase();

    if (category === 'completed') {
        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 ${className}`}
            >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {label || 'Completed'}
            </span>
        );
    }

    if (category === 'pending' || category === 'CONFIRM') {
        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#9033FF]/10 text-[#9033FF] border border-[#9033FF]/25 dark:bg-[#9033FF]/20 dark:text-[#B072FF] dark:border-[#9033FF]/40 ${className}`}
            >
                <Clock className="w-3.5 h-3.5 text-[#9033FF] dark:text-[#B072FF]" />
                {label || 'pending'}
            </span>
        );
    }

    if (category === 'saved' || category === 'save') {
        const defaultLabel = val === 'saved' ? 'Saved' : 'SAVE';
        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 ${className}`}
            >
                <Save className="w-3.5 h-3.5  text-blue-600 dark:text-blue-400" />
                {label || defaultLabel}
            </span>
        );
    }

    if (category === 'cancelled') {
        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 ${className}`}
            >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                {label || 'Cancelled'}
            </span>
        );
    }

    // Default / Draft
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 ${className}`}
        >
            <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            {label || 'Draft'}
        </span>
    );
}

/**
 * Helper function สำหรับเรียกใช้ในหน้าต่าง ๆ เช่น {renderStatusBadge(docStatus)}
 */
export function renderStatusBadge(statusValue: unknown, className?: string): React.ReactElement {
    return <DocStatusBadge status={statusValue} className={className} />;
}

export default DocStatusBadge;

