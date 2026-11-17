import Swal from 'sweetalert2';

export { cn } from 'cn';

const TOTAL_KEYS = [
    'total',
    'totalCount',
    'totalRecords',
    'total_count',
    'total_records',
    'count',
    'recordsTotal',
];

/**
 * ดึงค่าจาก Object ตามลำดับชื่อ key ที่ต้องการ (รองรับตัวพิมพ์เล็ก-ใหญ่ไม่ตรงกัน)
 */
export function getField<T = unknown>(
    item: Record<string, unknown> | null | undefined,
    ...keys: string[]
): T | undefined {
    if (!item || typeof item !== 'object') return undefined;

    for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null) {
            return item[key] as T;
        }
    }

    const itemKeys = Object.keys(item);
    for (const key of keys) {
        const foundKey = itemKeys.find((k) => k.toLowerCase() === key.toLowerCase());
        if (foundKey && item[foundKey] !== undefined && item[foundKey] !== null) {
            return item[foundKey] as T;
        }
    }

    return undefined;
}

/**
 * ดึงข้อมูล Array ออกจาก API Response อย่างปลอดภัย
 * รองรับโครงสร้างทั้ง res.results, res.data, หรือ res.results.{data|items|list}
 */
export function extractList<T>(res: unknown): T[] {
    if (!res || typeof res !== 'object') return [];
    const record = res as Record<string, unknown>;
    if (record.success === false) return [];

    if (Array.isArray(record.results)) return record.results as T[];
    if (Array.isArray(record.data)) return record.data as T[];

    if (record.results && typeof record.results === 'object') {
        const nested = record.results as Record<string, unknown>;
        for (const key of ['data', 'items', 'list']) {
            if (Array.isArray(nested[key])) return nested[key] as T[];
        }
    }

    return [];
}

/**
 * ดึงจำนวนรายการทั้งหมด (Total Count) สำหรับทำ Pagination จาก API Response
 */
export function extractTotal(res: unknown): number | undefined {
    if (!res || typeof res !== 'object') return undefined;
    const record = res as Record<string, unknown>;
    const nested =
        record.results && typeof record.results === 'object' && !Array.isArray(record.results)
            ? (record.results as Record<string, unknown>)
            : undefined;

    const value = getField(record, ...TOTAL_KEYS) ?? getField(nested, ...TOTAL_KEYS);
    const num = Number(value);
    return value !== undefined && !Number.isNaN(num) ? num : undefined;
}

/**
 * ดึงข้อความแจ้งเตือนข้อผิดพลาดจาก API Response หรือ Error Object
 */
export function extractErrorMessage(
    error: unknown,
    fallback = 'เกิดข้อผิดพลาดในการดำเนินการ'
): string {
    if (!error) return fallback;

    if (typeof error === 'object') {
        const errObj = error as {
            message?: string;
            error?: string;
            response?: { data?: { message?: string; error?: string } };
        };
        if (errObj.response?.data?.error) return errObj.response.data.error;
        if (errObj.response?.data?.message) return errObj.response.data.message;
        if (errObj.error) return errObj.error;
        if (errObj.message) return errObj.message;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}

/**
 * แสดงหน้าต่างยืนยันการลบข้อมูลด้วย SweetAlert2 และจัดการแจ้งเตือนผลลัพธ์อัตโนมัติ
 */
export async function confirmDelete({
    title = 'ยืนยันการลบข้อมูล?',
    text,
    confirmButtonText = 'ใช่, ลบเลย',
    cancelButtonText = 'ยกเลิก',
    successTitle = 'ลบสำเร็จ!',
    successText = 'ข้อมูลถูกลบออกจากระบบเรียบร้อยแล้ว',
    errorTitle = 'ลบไม่สำเร็จ',
    errorFallback = 'เกิดข้อผิดพลาดในการลบข้อมูล',
    onDelete,
    onSuccess,
}: {
    title?: string;
    text: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    successTitle?: string;
    successText?: string;
    errorTitle?: string;
    errorFallback?: string;
    onDelete: () => Promise<{ success?: boolean; message?: string; error?: string } | void>;
    onSuccess?: () => void | Promise<void>;
}): Promise<boolean> {
    const result = await Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText,
        cancelButtonText,
    });

    if (!result.isConfirmed) return false;

    try {
        const res = await onDelete();
        if (!res || res.success !== false) {
            await Swal.fire({
                title: successTitle,
                text: successText,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
            });
            await onSuccess?.();
            return true;
        } else {
            await Swal.fire({
                title: errorTitle,
                text: extractErrorMessage(res, errorFallback),
                icon: 'error',
            });
            return false;
        }
    } catch (err: unknown) {
        await Swal.fire({
            title: 'เกิดข้อผิดพลาด',
            text: extractErrorMessage(err, 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'),
            icon: 'error',
        });
        return false;
    }
}
