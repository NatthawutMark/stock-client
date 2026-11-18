import { encodeInventoryQr, encodeLocationQr } from './codec';
import {
    DEFAULT_LABEL_SIZE,
    LABEL_SIZES,
    type LabelDimensions,
    type LabelSizeConfig,
    type LabelSizeKey,
    type PrintableLabelItem,
} from './types';

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_MARGIN_MM = 8;
export const A4_GAP_MM = 4;

export interface A4GridLayout {
    cols: number;
    rows: number;
    perPage: number;
    marginMm: number;
    gapMm: number;
    startXMm: number;
    startYMm: number;
    cellWidthMm: number;
    cellHeightMm: number;
}

function clamp(val: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, val));
}

/**
 * คืนค่าขนาดสติกเกอร์ที่ใช้งานจริง (รองรับทั้ง Preset และ Custom mm)
 */
export function resolveLabelConfig(
    sizeKey: LabelSizeKey = DEFAULT_LABEL_SIZE,
    customSize?: Partial<LabelDimensions>
): LabelSizeConfig {
    const preset =
        LABEL_SIZES.find((s) => s.key === sizeKey) ||
        LABEL_SIZES.find((s) => s.key === DEFAULT_LABEL_SIZE)!;

    if (sizeKey !== 'custom') {
        return preset;
    }

    const widthMm = clamp(Math.round(Number(customSize?.widthMm) || preset.widthMm), 20, 200);
    const heightMm = clamp(Math.round(Number(customSize?.heightMm) || preset.heightMm), 15, 280);

    return {
        ...preset,
        widthMm,
        heightMm,
        label: `${widthMm} × ${heightMm} mm (กำหนดเอง)`,
    };
}

/**
 * คำนวณการจัดวางป้ายหลายดวงบนกระดาษ A4 (210 × 297 mm)
 */
export function calculateA4Grid(
    size: LabelDimensions,
    marginMm = A4_MARGIN_MM,
    gapMm = A4_GAP_MM
): A4GridLayout {
    const maxUsableW = A4_WIDTH_MM - marginMm * 2;
    const maxUsableH = A4_HEIGHT_MM - marginMm * 2;

    const cellWidthMm = Math.min(size.widthMm, maxUsableW);
    const cellHeightMm = Math.min(size.heightMm, maxUsableH);

    const cols = Math.max(1, Math.floor((maxUsableW + gapMm) / (cellWidthMm + gapMm)));
    const rows = Math.max(1, Math.floor((maxUsableH + gapMm) / (cellHeightMm + gapMm)));
    const totalGridW = cols * cellWidthMm + (cols - 1) * gapMm;
    const startXMm = Math.max(marginMm, (A4_WIDTH_MM - totalGridW) / 2);

    return {
        cols,
        rows,
        perPage: cols * rows,
        marginMm,
        gapMm,
        startXMm,
        startYMm: marginMm,
        cellWidthMm,
        cellHeightMm,
    };
}

/**
 * ขยายรายการตามจำนวนดวง (copies) ที่ต้องการพิมพ์ (จำกัด 1..200 ต่อรายการ)
 */
export function expandPrintableItems(items: PrintableLabelItem[]): PrintableLabelItem[] {
    const expanded: PrintableLabelItem[] = [];
    for (const item of items) {
        const copies = clamp(Math.round(Number(item.copies) || 1), 1, 200);
        for (let i = 0; i < copies; i += 1) {
            expanded.push(item);
        }
    }
    return expanded;
}

/**
 * แบ่งรายการออกเป็นหน้าสำหรับโหมด A4
 */
export function chunkItemsForA4(
    items: PrintableLabelItem[],
    perPage: number
): PrintableLabelItem[][] {
    const safePerPage = Math.max(1, perPage);
    const pages: PrintableLabelItem[][] = [];
    for (let i = 0; i < items.length; i += safePerPage) {
        pages.push(items.slice(i, i + safePerPage));
    }
    return pages;
}

/**
 * สร้างสตริง QR มาตรฐานจากรายการป้าย (INV / LOC)
 */
export function encodePrintableItemQr(item: PrintableLabelItem): string {
    if (item.kind === 'LOC') {
        return encodeLocationQr({
            id: item.locationId || item.id,
            code: item.itemCode,
            warehouseId: item.warehouseId,
        });
    }
    return encodeInventoryQr(item);
}
