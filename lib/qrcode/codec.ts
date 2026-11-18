import { normalizeDateOnly, normalizeTrackValue } from './normalize';
import type {
    DecodedQrResult,
    InventoryQrPayload,
    LocationQrPayload,
    PrintableLabelItem,
} from './types';

export { normalizeDateOnly, normalizeTrackValue } from './normalize';
export {
    matchInventoryRowsByQr,
    matchRowsByDecodedQr,
    matchLocationByQr,
    formatQrDisplayLabel,
    type MatchInventoryOptions,
} from './matcher';

/**
 * เข้ารหัสข้อมูลสินค้าเป็น JSON Payload แบบกระชับ
 * โดยตัดฟิลด์ที่ไม่มีข้อมูล (เช่น lot, sn, mfg, exp) ออกอัตโนมัติ เพื่อให้จุด QR ไม่แน่นและสแกนได้ไว
 */
export function encodeInventoryQr(item: Pick<
    PrintableLabelItem,
    | 'invId'
    | 'recDetId'
    | 'refDoc'
    | 'itemId'
    | 'itemCode'
    | 'qty'
    | 'uomName'
    | 'lotNo'
    | 'serialNo'
    | 'mfgDate'
    | 'expireDate'
    | 'warehouseId'
    | 'locationId'
    | 'locationName'
>): string {
    const payload: InventoryQrPayload = {
        v: 1,
        t: 'INV',
        c: normalizeTrackValue(item.itemCode),
        qty: Number(item.qty) || 1,
        uom: normalizeTrackValue(item.uomName) || 'ชิ้น',
    };

    const invId = normalizeTrackValue(item.invId);
    const recDetId = normalizeTrackValue(item.recDetId);
    const refDoc = normalizeTrackValue(item.refDoc);
    const itemId = normalizeTrackValue(item.itemId);
    const lot = normalizeTrackValue(item.lotNo);
    const sn = normalizeTrackValue(item.serialNo);
    const mfg = normalizeDateOnly(item.mfgDate);
    const exp = normalizeDateOnly(item.expireDate);
    const wh = normalizeTrackValue(item.warehouseId);
    const loc = normalizeTrackValue(item.locationId) || normalizeTrackValue(item.locationName);

    if (invId) payload.invId = invId;
    if (recDetId) payload.recDetId = recDetId;
    if (refDoc) payload.refDoc = refDoc;
    if (itemId) payload.itemId = itemId;
    if (lot) payload.lot = lot;
    if (sn) payload.sn = sn;
    if (mfg) payload.mfg = mfg;
    if (exp) payload.exp = exp;
    if (wh) payload.wh = wh;
    if (loc) payload.loc = loc;

    return JSON.stringify(payload);
}

/**
 * เข้ารหัสข้อมูลตำแหน่งจัดเก็บ (Location Rack QR)
 */
export function encodeLocationQr(loc: {
    id?: string;
    code: string;
    warehouseId?: string;
}): string {
    const payload: LocationQrPayload = {
        v: 1,
        t: 'LOC',
        code: normalizeTrackValue(loc.code),
    };
    const id = normalizeTrackValue(loc.id);
    const wh = normalizeTrackValue(loc.warehouseId);
    if (id) payload.id = id;
    if (wh) payload.wh = wh;

    return JSON.stringify(payload);
}

/**
 * ถอดรหัสข้อความที่สแกนได้จากกล้องหรือเครื่องยิงบาร์โค้ด
 * รองรับทั้ง JSON Payload (INV / LOC), รูปแบบ Prefix (LOC:), รูปแบบ Pipe (WMS|INV|...) และรหัสธรรมดา
 */
export function decodeQrString(raw: string): DecodedQrResult {
    const trimmed = String(raw || '').trim();
    if (!trimmed) {
        return { kind: 'RAW_TEXT', text: '', raw };
    }

    // 1. รูปแบบ JSON มาตรฐานของระบบ
    if (trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed) as Record<string, unknown>;
            const type = String(parsed.t || '').toUpperCase();

            if (type === 'INV') {
                const itemCode = normalizeTrackValue(parsed.c as string) || normalizeTrackValue(parsed.itemCode as string);
                const itemId = normalizeTrackValue(parsed.itemId as string);
                const invId = normalizeTrackValue(parsed.invId as string) || normalizeTrackValue(parsed.id as string);

                if (itemCode || itemId || invId) {
                    const payload: InventoryQrPayload = {
                        v: Number(parsed.v) || 1,
                        t: 'INV',
                        c: itemCode,
                        qty: Number(parsed.qty) || 1,
                        uom: normalizeTrackValue(parsed.uom as string) || 'ชิ้น',
                        invId: invId || undefined,
                        recDetId: normalizeTrackValue(parsed.recDetId as string) || undefined,
                        refDoc: normalizeTrackValue(parsed.refDoc as string) || undefined,
                        itemId: itemId || undefined,
                        lot: normalizeTrackValue(parsed.lot as string) || undefined,
                        sn: normalizeTrackValue(parsed.sn as string) || undefined,
                        mfg: normalizeDateOnly(parsed.mfg as string) || undefined,
                        exp: normalizeDateOnly(parsed.exp as string) || undefined,
                        wh: normalizeTrackValue(parsed.wh as string) || undefined,
                        loc: normalizeTrackValue(parsed.loc as string) || undefined,
                    };
                    return { kind: 'INV', payload, raw };
                }
            }

            if (type === 'LOC') {
                const code = normalizeTrackValue(parsed.code as string) || normalizeTrackValue(parsed.c as string);
                const id = normalizeTrackValue(parsed.id as string);
                if (code || id) {
                    const payload: LocationQrPayload = {
                        v: Number(parsed.v) || 1,
                        t: 'LOC',
                        id: id || undefined,
                        code: code || id,
                        wh: normalizeTrackValue(parsed.wh as string) || undefined,
                    };
                    return { kind: 'LOC', payload, raw };
                }
            }
        } catch {
            // หาก parse JSON ไม่ได้ ให้ตกไปตรวจสอบรูปแบบถัดไป
        }
    }

    // 2. รูปแบบ Prefix: LOC:A-01-02
    if (trimmed.toUpperCase().startsWith('LOC:')) {
        const code = trimmed.slice(4).trim();
        return {
            kind: 'LOC',
            payload: { v: 1, t: 'LOC', code },
            raw,
        };
    }

    // 3. รูปแบบ Pipe-delimited: WMS|INV|invId|itemCode|lot|sn|qty|uom|exp|wh|loc|refDoc
    if (trimmed.startsWith('WMS|INV|')) {
        const parts = trimmed.split('|');
        const payload: InventoryQrPayload = {
            v: 1,
            t: 'INV',
            invId: normalizeTrackValue(parts[2]) || undefined,
            c: normalizeTrackValue(parts[3]),
            lot: normalizeTrackValue(parts[4]) || undefined,
            sn: normalizeTrackValue(parts[5]) || undefined,
            qty: Number(parts[6]) || 1,
            uom: normalizeTrackValue(parts[7]) || 'ชิ้น',
            exp: normalizeDateOnly(parts[8]) || undefined,
            wh: normalizeTrackValue(parts[9]) || undefined,
            loc: normalizeTrackValue(parts[10]) || undefined,
            refDoc: normalizeTrackValue(parts[11]) || undefined,
        };
        return { kind: 'INV', payload, raw };
    }

    // 4. รหัสข้อความธรรมดา (เช่น บาร์โค้ด 1D รหัสสินค้าหรือรหัสพิกัด)
    return { kind: 'RAW_TEXT', text: trimmed, raw };
}
