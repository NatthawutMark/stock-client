'use client';

/**
 * ============================================================================
 * TransactionItemTable: Backward-Compatible Router Component
 * ============================================================================
 * ทำหน้าที่เป็นตัวกลาง (Wrapper/Router) สำหรับสลับการทำงานระหว่าง:
 * - MasterItemTable (เมื่อ source = 'master')
 * - InventoryItemTable (เมื่อ source = 'inventory')
 *
 * ช่วยรักษาความเข้ากันได้ย้อนหลัง (Backward Compatibility) กับโค้ดเดิมทั้งหมด
 * และ Export types เพื่อให้เรียกใช้ง่าย
 * ============================================================================
 */

import React from 'react';
import { MasterItemTable } from './MasterItemTable';
import { InventoryItemTable } from './InventoryItemTable';
import type { TransactionItemTableProps } from './types';

export * from './types';
export * from './MasterItemTable';
export * from './InventoryItemTable';

export function TransactionItemTable({
    source = 'master',
    ...rest
}: TransactionItemTableProps) {
    if (source === 'inventory') {
        return <InventoryItemTable {...rest} />;
    }

    return <MasterItemTable {...rest} />;
}

export default TransactionItemTable;
