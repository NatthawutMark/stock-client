import { normalizeTrackValue } from './normalize';
import type {
    DecodedQrResult,
    InventoryQrPayload,
    QrMatchableInventoryRow,
    QrMatchableLocation,
} from './types';

export interface MatchInventoryOptions {
    /**
     * ให้ใช้ row.id เป็น fallback ของ invId หรือไม่ (default: true)
     * - InventoryView / IssueInventoryList: id คือ invId จึงใช้ true
     * - TransactionItem (เช่น รายการในใบเบิก): id คือ detailId ส่วน invId อยู่แยก จึงควรส่ง false
     */
    matchIdAsInvId?: boolean;
}

const toStr = (val?: string | number | null): string =>
    val === null || val === undefined ? '' : String(val);

/**
 * จับคู่รายการ Inventory จาก InventoryQrPayload
 * รองรับทั้งกรณีมี invId และกรณีพิมพ์ตอน CONFIRM (ยังไม่มี invId) รวมถึงกรณีไม่มี Lot/Serial/Dates
 */
export function matchInventoryRowsByQr<T extends QrMatchableInventoryRow>(
    qr: InventoryQrPayload,
    rows: T[],
    options?: MatchInventoryOptions
): T[] {
    if (!rows.length) return [];

    const matchIdAsInvId = options?.matchIdAsInvId ?? true;

    // 1. ค้นหาตรงจาก invId (แม่นยำที่สุด)
    const qrInvId = normalizeTrackValue(qr.invId);
    if (qrInvId) {
        const exactByInvId = rows.filter((row) => {
            const explicitInvId = normalizeTrackValue(toStr(row.invId));
            if (explicitInvId) return explicitInvId === qrInvId;
            if (!matchIdAsInvId) return false;
            return normalizeTrackValue(toStr(row.id)) === qrInvId;
        });
        if (exactByInvId.length > 0) return exactByInvId;
    }

    // 2. ค้นหาจาก itemId / itemCode + Lot + Serial (normalize ค่าว่างให้ "" === "")
    const qrCode = normalizeTrackValue(qr.c).toLowerCase();
    const qrItemId = normalizeTrackValue(qr.itemId);
    const qrLot = normalizeTrackValue(qr.lot).toLowerCase();
    const qrSn = normalizeTrackValue(qr.sn).toLowerCase();
    const qrWh = normalizeTrackValue(qr.wh);
    const qrLoc = normalizeTrackValue(qr.loc).toLowerCase();

    const itemMatches = rows.filter((row) => {
        const rowItemId = normalizeTrackValue(toStr(row.itemId));
        const rowCode = normalizeTrackValue(row.itemCode).toLowerCase();
        const isSameItem =
            (qrItemId && rowItemId === qrItemId) ||
            (qrCode && rowCode === qrCode);
        if (!isSameItem) return false;

        const rowLot = normalizeTrackValue(row.lotNo).toLowerCase();
        const rowSn = normalizeTrackValue(row.serialNo).toLowerCase();

        // กรณีไม่มี Lot/SN ค่า normalize จะเป็น "" ทั้งคู่และจับคู่กันได้อย่างถูกต้อง
        return rowLot === qrLot && rowSn === qrSn;
    });

    if (itemMatches.length <= 1) return itemMatches;

    // 3. หากมีหลายตำแหน่งในคลัง ให้คัดกรองตามคลังและตำแหน่งตั้งต้นก่อน
    const whFiltered = qrWh
        ? itemMatches.filter((row) => normalizeTrackValue(toStr(row.warehouseId)) === qrWh)
        : itemMatches;
    const pool = whFiltered.length > 0 ? whFiltered : itemMatches;

    if (qrLoc) {
        const locFiltered = pool.filter(
            (row) =>
                normalizeTrackValue(toStr(row.locationId)).toLowerCase() === qrLoc ||
                normalizeTrackValue(row.locationName).toLowerCase() === qrLoc
        );
        if (locFiltered.length > 0) return locFiltered;
    }

    return pool;
}

/**
 * จับคู่รายการสินค้าจาก DecodedQrResult (รองรับทั้ง INV payload และ RAW_TEXT / 1D barcode)
 */
export function matchRowsByDecodedQr<T extends QrMatchableInventoryRow>(
    decoded: DecodedQrResult,
    rows: T[],
    options?: MatchInventoryOptions
): T[] {
    if (!rows.length || decoded.kind === 'LOC') return [];

    if (decoded.kind === 'INV') {
        return matchInventoryRowsByQr(decoded.payload, rows, options);
    }

    const kw = normalizeTrackValue(decoded.text).toLowerCase();
    if (!kw) return [];

    const matchIdAsInvId = options?.matchIdAsInvId ?? true;

    return rows.filter((row) => {
        const code = normalizeTrackValue(row.itemCode).toLowerCase();
        const sn = normalizeTrackValue(row.serialNo).toLowerCase();
        const inv = normalizeTrackValue(
            toStr(row.invId !== undefined ? row.invId : matchIdAsInvId ? row.id : undefined)
        ).toLowerCase();
        return code === kw || sn === kw || (Boolean(inv) && inv === kw);
    });
}

/**
 * จับคู่พิกัดจัดเก็บ (Location) จาก DecodedQrResult (รองรับทั้ง LOC payload และ RAW_TEXT)
 */
export function matchLocationByQr<T extends QrMatchableLocation>(
    decoded: DecodedQrResult,
    locations: T[],
    preferredWarehouseId?: string
): T | undefined {
    if (!locations.length || decoded.kind === 'INV') return undefined;

    let targetId = '';
    let targetCode = '';
    let targetWh = normalizeTrackValue(preferredWarehouseId);

    if (decoded.kind === 'LOC') {
        targetId = normalizeTrackValue(decoded.payload.id).toLowerCase();
        targetCode = normalizeTrackValue(decoded.payload.code).toLowerCase();
        if (!targetWh) {
            targetWh = normalizeTrackValue(decoded.payload.wh);
        }
    } else {
        targetCode = normalizeTrackValue(decoded.text).toLowerCase();
    }

    if (!targetId && !targetCode) return undefined;

    const candidates = locations.filter((loc) => {
        const locId = normalizeTrackValue(toStr(loc.id)).toLowerCase();
        const locCode = normalizeTrackValue(loc.code).toLowerCase();
        const locName = normalizeTrackValue(loc.name).toLowerCase();

        if (targetId && locId === targetId) return true;
        if (targetCode && (locId === targetCode || locCode === targetCode || locName === targetCode)) {
            return true;
        }
        return false;
    });

    if (candidates.length === 0) return undefined;

    if (targetWh) {
        const inPreferredWh = candidates.find(
            (loc) => normalizeTrackValue(toStr(loc.warehouseId)) === targetWh
        );
        if (inPreferredWh) return inPreferredWh;
    }

    return candidates[0];
}

/**
 * สร้างข้อความสรุปสำหรับแสดงผลหลังถอดรหัส QR
 */
export function formatQrDisplayLabel(decoded: DecodedQrResult): string {
    if (decoded.kind === 'INV') {
        return `สินค้า: ${decoded.payload.c || decoded.payload.itemId || decoded.payload.invId || '-'}`;
    }
    if (decoded.kind === 'LOC') {
        return `พิกัด: ${decoded.payload.code || decoded.payload.id || '-'}`;
    }
    return `รหัส: ${decoded.text}`;
}
