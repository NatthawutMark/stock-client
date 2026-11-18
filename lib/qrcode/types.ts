export type QrPayloadType = 'INV' | 'LOC';

export type QrScanMode = 'all' | 'inventory' | 'location';

export type QrFeedbackStatus = 'success' | 'warning' | 'error' | 'info';

export interface QrScanFeedback {
    status: QrFeedbackStatus;
    title?: string;
    message: string;
    /** true = หยุดสแกนชั่วคราวและแสดงกล่องแจ้งเตือน Error จนกว่าผู้ใช้จะกด "สแกนใหม่" */
    requireAcknowledge?: boolean;
}

/** ผลลัพธ์ที่ onScan handler ส่งกลับให้ตัวสแกนกลางควบคุม feedback / error overlay */
export type QrScanOutcome = void | boolean | QrScanFeedback;

export interface QrMatchableInventoryRow {
    id?: string | number;
    invId?: string | number;
    itemId?: string | number;
    itemCode?: string;
    lotNo?: string;
    serialNo?: string;
    warehouseId?: string | number;
    locationId?: string | number;
    locationName?: string;
}

export interface QrMatchableLocation {
    id?: string | number;
    code?: string;
    name?: string;
    warehouseId?: string | number;
}

export interface InventoryQrPayload {
    v: number;
    t: 'INV';
    c: string;
    qty: number;
    uom: string;
    invId?: string;
    recDetId?: string;
    refDoc?: string;
    itemId?: string;
    lot?: string;
    sn?: string;
    mfg?: string;
    exp?: string;
    wh?: string;
    loc?: string;
}

export interface LocationQrPayload {
    v: number;
    t: 'LOC';
    id?: string;
    code: string;
    wh?: string;
}

export type DecodedQrResult =
    | { kind: 'INV'; payload: InventoryQrPayload; raw: string }
    | { kind: 'LOC'; payload: LocationQrPayload; raw: string }
    | { kind: 'RAW_TEXT'; text: string; raw: string };

export type LabelPaperMode = 'roll' | 'a4';

export type LabelSizeKey = '70x50' | '100x75' | '60x40' | '50x30' | '40x25' | 'custom';

export interface LabelDimensions {
    widthMm: number;
    heightMm: number;
}

export interface LabelSizeConfig extends LabelDimensions {
    key: LabelSizeKey;
    label: string;
    description: string;
}

export const DEFAULT_LABEL_SIZE: LabelSizeKey = '70x50';

export const LABEL_SIZES: LabelSizeConfig[] = [
    {
        key: '70x50',
        label: '70 × 50 mm (ค่าเริ่มต้น)',
        description: 'ขนาดมาตรฐานติดกล่อง/ลังสินค้า',
        widthMm: 70,
        heightMm: 50,
    },
    {
        key: '100x75',
        label: '100 × 75 mm (4" × 3")',
        description: 'ป้ายขนาดใหญ่สำหรับติดพาเลท',
        widthMm: 100,
        heightMm: 75,
    },
    {
        key: '60x40',
        label: '60 × 40 mm',
        description: 'ขนาดมาตรฐานเครื่องพิมพ์สติกเกอร์ทั่วไป',
        widthMm: 60,
        heightMm: 40,
    },
    {
        key: '50x30',
        label: '50 × 30 mm',
        description: 'ป้ายขนาดกลางสำหรับสินค้า/ชั้นวาง',
        widthMm: 50,
        heightMm: 30,
    },
    {
        key: '40x25',
        label: '40 × 25 mm',
        description: 'ป้ายขนาดเล็กสำหรับชิ้นส่วน/Serial',
        widthMm: 40,
        heightMm: 25,
    },
    {
        key: 'custom',
        label: 'กำหนดขนาดเอง (Custom)',
        description: 'ระบุกว้าง × สูง (mm) ตามสติกเกอร์ที่ใช้',
        widthMm: 70,
        heightMm: 50,
    },
];

export interface PrintableLabelItem {
    id: string;
    kind: 'INV' | 'LOC';
    itemId?: string;
    itemCode: string;
    itemName: string;
    qty: number;
    uomName: string;
    copies: number;
    invId?: string;
    recDetId?: string;
    refDoc?: string;
    lotNo?: string;
    serialNo?: string;
    mfgDate?: string;
    expireDate?: string;
    warehouseId?: string;
    warehouseName?: string;
    locationId?: string;
    locationName?: string;
}
