export interface TransactionItem {
    id: string | number;
    itemId: number | string;
    itemCode: string;
    itemName: string;
    uomId?: number | string;
    uomName?: string;
    itemQty: number;
    availableQty?: number; // จำนวนคงเหลือในสต็อก (สำหรับกรณีดึงจาก Inventory)
    lotNo?: string;
    serialNo?: string;
    locationId?: number | string;
    locationName?: string;
    unitPrice?: number;
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
    title?: string;
    subtitle?: string;
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
    title?: string;
    subtitle?: string;
}

