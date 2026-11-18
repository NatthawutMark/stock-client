export type QrPayloadType = 'INV' | 'LOC';

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

export type ZebraLabelSizeKey = '70x50' | '100x75' | '50x30' | '40x25';

export interface ZebraLabelSizeConfig {
    key: ZebraLabelSizeKey;
    label: string;
    description: string;
    widthMm: number;
    heightMm: number;
}

export const DEFAULT_ZEBRA_LABEL_SIZE: ZebraLabelSizeKey = '70x50';

export const ZEBRA_LABEL_SIZES: ZebraLabelSizeConfig[] = [
    {
        key: '70x50',
        label: '70 × 50 mm (ค่าเริ่มต้น)',
        description: 'ขนาดมาตรฐานติดกล่อง/ลังสินค้า Zebra',
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
