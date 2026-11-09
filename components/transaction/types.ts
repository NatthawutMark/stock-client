export interface TransactionItem {
    id: string | number;
    itemId: number | string;
    itemCode: string;
    itemName: string;
    uomId?: number | string;
    uomName?: string;
    itemQty: number;
    originalQty?: number; // จำนวนเดิมที่เคยบันทึกไว้ในเอกสาร (สำหรับคำนวณ dynamic ceiling ในโหมดแก้ไข)
    putawayQty?: number; // จำนวนที่รับเข้า (แสดงเมื่อเอกสารเป็นสถานะ confirm)
    pickingQty?: number; // จำนวนที่จ่ายออก (แสดงเมื่อเอกสารเป็นสถานะ confirm)
    availableQty?: number; // จำนวนคงเหลือในสต็อก (สำหรับกรณีดึงจาก Inventory)
    lotNo?: string;
    serialNo?: string;
    locationId?: number | string;
    locationName?: string;
    unitPrice?: number;
    itemPrice?: number;
    totalPrice?: number;
    remark?: string;
    isLotNo?: boolean;
    isSerialNo?: boolean;
    invId?: number | string; // รหัสอ้างอิงตาราง Inventory ใน DB
}

export interface MasterItemTableProps {
    items: TransactionItem[];
    onChange: (items: TransactionItem[]) => void;
    warehouseId?: number | string;
    readOnly?: boolean;
    showPrice?: boolean;
    showLotSerial?: boolean;
    showLocation?: boolean;
    showPutawayQty?: boolean;
    statusCode?: string;
    title?: string;
    subtitle?: string;
}

export interface IssueItemTableProps {
    items: TransactionItem[];
    onChange: (items: TransactionItem[]) => void;
    warehouseId?: number | string;
    readOnly?: boolean;
    showPrice?: boolean;
    showLotSerial?: boolean;
    showLocation?: boolean;
    showPutawayQty?: boolean;
    statusCode?: string;
    title?: string;
    subtitle?: string;
    docId?: string | number | null;
}

export interface InventoryItemTableProps {
    items: TransactionItem[];
    onChange: (items: TransactionItem[]) => void;
    warehouseId?: number | string;
    readOnly?: boolean;
    showPrice?: boolean;
    showLotSerial?: boolean;
    showLocation?: boolean;
    title?: string;
    subtitle?: string;
}

export interface TransactionItemTableProps extends Partial<MasterItemTableProps>, Partial<InventoryItemTableProps> {
    items: TransactionItem[];
    onChange: (items: TransactionItem[]) => void;
    source: 'master' | 'inventory';
    warehouseId?: number | string;
    readOnly?: boolean;
    showPrice?: boolean;
    showLotSerial?: boolean;
    showLocation?: boolean;
    showPutawayQty?: boolean;
    statusCode?: string;
    title?: string;
    subtitle?: string;
}

export type DocStage = 'create' | 'draft' | 'saved' | 'confirmed' | 'received';

export interface DocStageInfo {
    key: DocStage;
    step: number;
    title: string;
    subtitle: string;
    description: string;
}

export interface DocActionCardProps {
    /**
     * สถานะปัจจุบันของเอกสาร:
     * - 'create' (1): สร้างเอกสาร
     * - 'draft' (2): บันทึกร่าง (ยังไม่ได้เลข DocNo)
     * - 'saved' (3): บันทึกเอกสาร (มีเลข Doc)
     * - 'confirmed' (4): ยืนยันเอกสาร
     * - 'received' (5): รับเข้าคลัง
     */
    currentStage?: DocStage | number | string;

    /** เลขที่เอกสาร (ถ้ามี) */
    docNo?: string;

    /** วันที่เอกสาร (ถ้ามี) */
    docDate?: string;

    /** สถานะกำลังบันทึกข้อมูล */
    saving?: boolean;

    /** สถานะกำลังโหลดข้อมูล */
    loading?: boolean;

    /** ปิดการทำงานของปุ่มทั้งหมด */
    disabled?: boolean;

    /** โหมดอ่านอย่างเดียว */
    readOnly?: boolean;

    /** แสดง Stepper / Timeline ลำดับสถานะ 5 ขั้นตอนหรือไม่ (default: true) */
    showTimeline?: boolean;

    /** แสดงกล่องสรุปข้อมูลสถานะและจำนวนสินค้าหรือไม่ (default: true) */
    showSummary?: boolean;

    /** ข้อมูลสรุปเพิ่มเติม เช่น จำนวนรายการ หรือ ยอดรวม */
    summaryInfo?: {
        totalItems?: number;
        totalQty?: number;
        totalAmount?: number;
        customText?: string;
    };

    /** กำหนดข้อความปุ่มขั้นสุดท้าย (default: 'รับเข้าคลัง') เช่น 'ตัดจ่ายสินค้า' สำหรับหน้า Issue */
    finalStageLabel?: string;

    /** กำหนดข้อความของแต่ละปุ่มตามต้องการ (Custom Labels) */
    customLabels?: {
        cancel?: string;
        saveDraft?: string;
        saveDoc?: string;
        confirm?: string;
        receive?: string;
        print?: string;
        rollback?: string;
        deleteDraft?: string;
    };

    /** Action Callbacks */
    onCancel?: () => void;
    onSaveDraft?: () => void | Promise<void>;
    onSaveDoc?: () => void | Promise<void>;
    onConfirm?: () => void | Promise<void>;
    onReceive?: () => void | Promise<void>;
    onDeleteDraft?: () => void | Promise<void>;
    onPrint?: () => void;
    onRollback?: () => void | Promise<void>;

    /** อนุญาตให้คลิกเปลี่ยนสถานะบน Timeline เพื่อสลับดูได้หรือไม่ (ถ้ามี callback) */
    onStageClick?: (stage: DocStage) => void;

    /** ปุ่มเสริมเพิ่มเติม (แทรกด้านซ้ายหรือขวา) */
    extraButtons?: React.ReactNode;

    /** className เพิ่มเติมสำหรับ Card */
    className?: string;
}

