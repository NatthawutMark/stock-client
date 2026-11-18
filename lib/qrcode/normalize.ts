/**
 * ปรับค่าฟิลด์ติดตามสินค้า (LotNo, SerialNo) ให้เป็นมาตรฐานเดียวกัน
 * กรณีไม่มีข้อมูล (null, undefined, "", "-") จะคืนค่าเป็น ""
 */
export function normalizeTrackValue(value?: string | null): string {
    if (value == null) return '';
    const trimmed = String(value).trim();
    if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
        return '';
    }
    return trimmed;
}

/**
 * ปรับรูปแบบวันที่ให้เหลือ YYYY-MM-DD และตัดค่าวันที่ว่างหรือค่าเริ่มต้น 0001-01-01 ทิ้ง
 */
export function normalizeDateOnly(value?: string | null): string {
    const clean = normalizeTrackValue(value);
    if (!clean) return '';
    const datePart = clean.length >= 10 ? clean.slice(0, 10) : clean;
    if (datePart.startsWith('0001-') || datePart.startsWith('1900-01-01')) return '';
    return datePart;
}
