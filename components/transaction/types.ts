export interface TransactionItem {
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    uomId?: string;
    uomName?: string;
    itemQty: number;
    putawayQty?: number; // จำนวนที่รับเข้าคลังแล้ว (ใช้ในหน้า Goods Receive)
    pickingQty?: number; // จำนวนที่จ่ายออกคลังแล้ว (ใช้ในหน้า Goods Issue)
    availableQty?: number; // จำนวนคงเหลือในสต็อก (ใช้ในหน้า Goods Issue)
    lotNo?: string;
    serialNo?: string;
    mfgDate?: string;
    expireDate?: string;
    locationId?: string;
    locationName?: string;
    unitPrice?: number;
    itemPrice?: number;
    totalPrice?: number;
    remark?: string;
    isLotNo?: boolean;
    isSerialNo?: boolean;
    invId?: string; // รหัสอ้างอิงตาราง Inventory ในฐานข้อมูล
}

export interface MasterItemTableProps {
    items: TransactionItem[];
    onChange: (items: TransactionItem[]) => void;
    warehouseId?: string;
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
    warehouseId?: string;
    docId?: string | null;
    readOnly?: boolean;
    showPrice?: boolean;
    showLotSerial?: boolean;
    showLocation?: boolean;
    showPickingQty?: boolean;
    statusCode?: string;
    title?: string;
    subtitle?: string;
}
