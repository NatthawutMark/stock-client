import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
    A4_HEIGHT_MM,
    A4_WIDTH_MM,
    calculateA4Grid,
    chunkItemsForA4,
    encodePrintableItemQr,
    expandPrintableItems,
    resolveLabelConfig,
} from './labelLayout';
import { normalizeDateOnly, normalizeTrackValue } from './normalize';
import {
    DEFAULT_LABEL_SIZE,
    type LabelDimensions,
    type LabelPaperMode,
    type LabelSizeConfig,
    type LabelSizeKey,
    type PrintableLabelItem,
} from './types';

const DPI = 300;
const PX_PER_MM = DPI / 25.4;

let fontLoadPromise: Promise<void> | null = null;

/**
 * โหลดฟอนต์ Sarabun เข้า Document FontFace เพื่อให้ Canvas วาดภาษาไทยคมชัดแม้ไม่ได้ติดตั้งฟอนต์ในเครื่อง
 */
async function ensureSarabunFontLoaded(): Promise<void> {
    if (typeof window === 'undefined' || typeof FontFace === 'undefined') return;
    if (fontLoadPromise) return fontLoadPromise;

    fontLoadPromise = (async () => {
        try {
            const existing = Array.from(document.fonts).some(
                (f) => f.family === 'SarabunPrint' && f.status === 'loaded'
            );
            if (existing) return;

            const [regularFont, boldFont] = await Promise.all([
                new FontFace('SarabunPrint', 'url(/fonts/Sarabun-Regular.ttf)', { weight: '400' }).load(),
                new FontFace('SarabunPrint', 'url(/fonts/Sarabun-Bold.ttf)', { weight: '700' }).load(),
            ]);

            document.fonts.add(regularFont);
            document.fonts.add(boldFont);
        } catch {
            // ใช้ฟอนต์ระบบสำรองได้หากโหลดไฟล์ฟอนต์ไม่สำเร็จ
        }
    })();

    return fontLoadPromise;
}

function fitTextLine(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidthPx: number
): string {
    const clean = text.trim();
    if (!clean) return '-';
    if (ctx.measureText(clean).width <= maxWidthPx) return clean;

    let end = clean.length;
    while (end > 1 && ctx.measureText(`${clean.slice(0, end)}…`).width > maxWidthPx) {
        end -= 1;
    }
    return `${clean.slice(0, end)}…`;
}

function wrapTwoLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidthPx: number
): [string, string?] {
    const clean = text.trim() || '-';
    if (ctx.measureText(clean).width <= maxWidthPx) {
        return [clean];
    }

    let splitIdx = clean.length;
    while (splitIdx > 1 && ctx.measureText(clean.slice(0, splitIdx)).width > maxWidthPx) {
        splitIdx -= 1;
    }

    const spaceIdx = clean.lastIndexOf(' ', splitIdx);
    const firstEnd = spaceIdx > Math.floor(splitIdx * 0.5) ? spaceIdx : splitIdx;

    const line1 = clean.slice(0, firstEnd).trim();
    const rest = clean.slice(firstEnd).trim();
    const line2 = rest ? fitTextLine(ctx, rest, maxWidthPx) : undefined;
    return [line1, line2];
}

interface QrBoxRectMm {
    x: number;
    y: number;
    size: number;
}

/**
 * วาดข้อความและกรอบสติกเกอร์ลง Canvas ที่ความละเอียด 300 DPI
 * และคืนพิกัดกรอบสำหรับวาด Vector QRCode ทับลงใน PDF
 */
function renderLabelCanvas(
    item: PrintableLabelItem,
    dims: LabelDimensions
): { dataUrl: string; qrBoxMm: QrBoxRectMm } {
    const canvas = document.createElement('canvas');
    const wPx = Math.round(dims.widthMm * PX_PER_MM);
    const hPx = Math.round(dims.heightMm * PX_PER_MM);
    canvas.width = wPx;
    canvas.height = hPx;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Cannot initialize 2D canvas context');
    }

    const mm = (val: number) => val * PX_PER_MM;
    const fontFamily = '"SarabunPrint", "Sarabun", "Noto Sans Thai", Arial, sans-serif';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, wPx, hPx);

    const scale = Math.min(1.4, Math.max(0.62, Math.min(dims.widthMm / 70, dims.heightMm / 50)));
    const isSmall = dims.widthMm <= 50 || dims.heightMm <= 32;
    const isLarge = dims.widthMm >= 95 && dims.heightMm >= 65;
    const padMm = isSmall ? 2.0 : isLarge ? 3.5 : 2.5;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1.5, mm(0.25));
    ctx.strokeRect(mm(0.8), mm(0.8), wPx - mm(1.6), hPx - mm(1.6));

    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';

    if (item.kind === 'LOC') {
        const qrSizeMm = Math.min(dims.heightMm - padMm * 2 - 2, dims.widthMm * 0.44);
        const qrBoxMm: QrBoxRectMm = {
            x: padMm + 0.5,
            y: (dims.heightMm - qrSizeMm) / 2,
            size: qrSizeMm,
        };

        const textLeftMm = qrBoxMm.x + qrSizeMm + (isSmall ? 2.0 : 3.0);
        const textWidthPx = mm(dims.widthMm - textLeftMm - padMm);

        ctx.font = `700 ${Math.round(mm(2.4 * scale))}px ${fontFamily}`;
        ctx.fillText('LOCATION / พิกัดชั้นวาง', mm(textLeftMm), mm(padMm + 1));

        ctx.beginPath();
        ctx.moveTo(mm(textLeftMm), mm(padMm + 4.8 * scale));
        ctx.lineTo(wPx - mm(padMm), mm(padMm + 4.8 * scale));
        ctx.lineWidth = Math.max(1.5, mm(0.25));
        ctx.stroke();

        ctx.font = `700 ${Math.round(mm(5.4 * scale))}px ${fontFamily}`;
        const locCode = fitTextLine(ctx, item.itemCode || '-', textWidthPx);
        ctx.fillText(locCode, mm(textLeftMm), mm(padMm + 6.5 * scale));

        ctx.font = `400 ${Math.round(mm(2.8 * scale))}px ${fontFamily}`;
        const [n1, n2] = wrapTwoLines(ctx, item.itemName || '-', textWidthPx);
        ctx.fillText(n1, mm(textLeftMm), mm(padMm + 14.5 * scale));
        if (n2) {
            ctx.fillText(n2, mm(textLeftMm), mm(padMm + 18.2 * scale));
        }

        const whName = normalizeTrackValue(item.warehouseName);
        if (whName) {
            ctx.font = `700 ${Math.round(mm(2.5 * scale))}px ${fontFamily}`;
            ctx.fillText(
                fitTextLine(ctx, `คลัง: ${whName}`, textWidthPx),
                mm(textLeftMm),
                hPx - mm(padMm + 4.0 * scale)
            );
        }

        return { dataUrl: canvas.toDataURL('image/png'), qrBoxMm };
    }

    const headerHeightMm = (isSmall ? 8.0 : isLarge ? 16.5 : 12.0) * (dims.heightMm < 40 ? 0.85 : 1);
    const footerHeightMm = isSmall ? 4.2 : isLarge ? 7.5 : 5.5;

    const headerWidthPx = wPx - mm(padMm * 2);
    ctx.font = `700 ${Math.round(mm(3.4 * scale))}px ${fontFamily}`;
    ctx.fillText(fitTextLine(ctx, item.itemCode || '-', headerWidthPx), mm(padMm), mm(padMm));

    ctx.font = `700 ${Math.round(mm(2.7 * scale))}px ${fontFamily}`;
    const [nameLine1, nameLine2] = wrapTwoLines(ctx, item.itemName || '-', headerWidthPx);
    ctx.fillText(nameLine1, mm(padMm), mm(padMm + 4.1 * scale));
    if (nameLine2 && !isSmall) {
        ctx.fillText(nameLine2, mm(padMm), mm(padMm + 7.2 * scale));
    }

    const dividerY = padMm + headerHeightMm;
    ctx.beginPath();
    ctx.moveTo(mm(padMm), mm(dividerY));
    ctx.lineTo(wPx - mm(padMm), mm(dividerY));
    ctx.lineWidth = Math.max(1.5, mm(0.25));
    ctx.stroke();

    const availableBodyH = Math.max(8, dims.heightMm - dividerY - footerHeightMm - 2);
    const qrSizeMm = Math.min(availableBodyH, isSmall ? 15.5 : isLarge ? 36 : 25 * scale);
    const qrBoxMm: QrBoxRectMm = {
        x: padMm + 0.5,
        y: dividerY + (availableBodyH - qrSizeMm) / 2 + 0.5,
        size: qrSizeMm,
    };

    const infoLeftMm = qrBoxMm.x + qrSizeMm + (isSmall ? 1.8 : 2.8);
    const infoWidthPx = wPx - mm(infoLeftMm + padMm);
    let cursorY = dividerY + 1.4;
    const lineGap = (isSmall ? 3.1 : isLarge ? 5.8 : 4.2) * (scale < 0.9 ? 0.88 : 1);

    ctx.font = `700 ${Math.round(mm(3.1 * scale))}px ${fontFamily}`;
    const qtyText = `QTY: ${(Number(item.qty) || 1).toLocaleString()} ${item.uomName || 'ชิ้น'}`;
    ctx.fillText(fitTextLine(ctx, qtyText, infoWidthPx), mm(infoLeftMm), mm(cursorY));
    cursorY += lineGap + 0.4;

    ctx.font = `400 ${Math.round(mm(2.45 * scale))}px ${fontFamily}`;
    const locText = normalizeTrackValue(item.locationName) || '-';
    ctx.fillText(fitTextLine(ctx, `LOC: ${locText}`, infoWidthPx), mm(infoLeftMm), mm(cursorY));
    cursorY += lineGap;

    if (!isSmall) {
        const whText = normalizeTrackValue(item.warehouseName) || '-';
        ctx.fillText(fitTextLine(ctx, `WH : ${whText}`, infoWidthPx), mm(infoLeftMm), mm(cursorY));
        cursorY += lineGap;
    }

    const lotText = normalizeTrackValue(item.lotNo) || '-';
    const snText = normalizeTrackValue(item.serialNo) || '-';
    ctx.fillText(fitTextLine(ctx, `LOT: ${lotText}`, infoWidthPx), mm(infoLeftMm), mm(cursorY));
    cursorY += lineGap;

    if (snText !== '-' || !isSmall) {
        ctx.fillText(fitTextLine(ctx, `S/N: ${snText}`, infoWidthPx), mm(infoLeftMm), mm(cursorY));
        cursorY += lineGap;
    }

    if (!isSmall) {
        const mfgText = normalizeDateOnly(item.mfgDate) || '-';
        const expText = normalizeDateOnly(item.expireDate) || '-';
        ctx.font = `700 ${Math.round(mm(2.3 * scale))}px ${fontFamily}`;
        ctx.fillText(fitTextLine(ctx, `MFG: ${mfgText}`, infoWidthPx), mm(infoLeftMm), mm(cursorY));
        cursorY += lineGap;
        ctx.fillText(fitTextLine(ctx, `EXP: ${expText}`, infoWidthPx), mm(infoLeftMm), mm(cursorY));
    }

    const footerY = dims.heightMm - footerHeightMm - 0.5;
    ctx.beginPath();
    ctx.moveTo(mm(padMm), mm(footerY));
    ctx.lineTo(wPx - mm(padMm), mm(footerY));
    ctx.lineWidth = Math.max(1, mm(0.2));
    ctx.stroke();

    ctx.font = `400 ${Math.round(mm(2.1 * scale))}px ${fontFamily}`;
    const refText = normalizeTrackValue(item.refDoc)
        ? `REF: ${item.refDoc}`
        : `ID: ${normalizeTrackValue(item.invId).slice(0, 12) || item.itemCode}`;
    ctx.fillText(fitTextLine(ctx, refText, wPx - mm(padMm * 2)), mm(padMm), mm(footerY + 1.0));

    return { dataUrl: canvas.toDataURL('image/png'), qrBoxMm };
}

/**
 * วาด QRCode แบบ Vector Rectangles ลงบนหน้า PDF โดยตรงเพื่อความคมชัดบนเครื่องพิมพ์ทุกประเภท
 */
function drawVectorQrOnPdf(
    doc: jsPDF,
    qrString: string,
    box: QrBoxRectMm
): void {
    const qrData = QRCode.create(qrString, { errorCorrectionLevel: 'M' });
    const count = qrData.modules.size;
    const cellMm = box.size / count;

    doc.setFillColor(255, 255, 255);
    doc.rect(box.x, box.y, box.size, box.size, 'F');

    doc.setFillColor(0, 0, 0);
    const overlap = 0.015;
    for (let row = 0; row < count; row += 1) {
        for (let col = 0; col < count; col += 1) {
            if (qrData.modules.get(row, col)) {
                doc.rect(
                    box.x + col * cellMm,
                    box.y + row * cellMm,
                    cellMm + overlap,
                    cellMm + overlap,
                    'F'
                );
            }
        }
    }
}

export interface GenerateLabelPdfOptions {
    sizeKey?: LabelSizeKey;
    customSize?: Partial<LabelDimensions>;
    paperMode?: LabelPaperMode;
}

export interface GeneratedPdfResult {
    blob: Blob;
    url: string;
    totalPages: number;
    totalLabels: number;
    fileName: string;
    paperMode: LabelPaperMode;
    sizeConfig: LabelSizeConfig;
}

/**
 * สร้างไฟล์ PDF สติกเกอร์ QRCode รองรับทั้ง:
 * - paperMode = 'roll' (1 ดวงต่อหน้า สำหรับเครื่องพิมพ์สติกเกอร์ทุกยี่ห้อ)
 * - paperMode = 'a4' (หลายดวงต่อหน้า A4 สำหรับเครื่องพิมพ์ทั่วไป)
 */
export async function generateLabelPdf(
    items: PrintableLabelItem[],
    options: GenerateLabelPdfOptions = {}
): Promise<GeneratedPdfResult> {
    await ensureSarabunFontLoaded();

    const paperMode: LabelPaperMode = options.paperMode ?? 'roll';
    const cfg = resolveLabelConfig(options.sizeKey ?? DEFAULT_LABEL_SIZE, options.customSize);
    const expandedItems = expandPrintableItems(items);

    if (expandedItems.length === 0) {
        throw new Error('กรุณาเลือกรายการอย่างน้อย 1 รายการเพื่อสร้าง PDF');
    }

    const renderCache = new WeakMap<
        PrintableLabelItem,
        { dataUrl: string; qrBoxMm: QrBoxRectMm; qrString: string }
    >();

    const getRenderedItem = (item: PrintableLabelItem, dims: LabelDimensions) => {
        const cached = renderCache.get(item);
        if (cached) return cached;
        const { dataUrl, qrBoxMm } = renderLabelCanvas(item, dims);
        const qrString = encodePrintableItemQr(item);
        const entry = { dataUrl, qrBoxMm, qrString };
        renderCache.set(item, entry);
        return entry;
    };

    let doc: jsPDF;
    let totalPages = 0;

    if (paperMode === 'a4') {
        const grid = calculateA4Grid(cfg);
        const cellDims: LabelDimensions = {
            widthMm: grid.cellWidthMm,
            heightMm: grid.cellHeightMm,
        };
        const pages = chunkItemsForA4(expandedItems, grid.perPage);
        totalPages = pages.length;

        doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [A4_WIDTH_MM, A4_HEIGHT_MM],
            compress: true,
        });

        pages.forEach((pageItems, pageIdx) => {
            if (pageIdx > 0) {
                doc.addPage([A4_WIDTH_MM, A4_HEIGHT_MM], 'portrait');
            }

            pageItems.forEach((item, slotIdx) => {
                const col = slotIdx % grid.cols;
                const row = Math.floor(slotIdx / grid.cols);
                const offsetX = grid.startXMm + col * (grid.cellWidthMm + grid.gapMm);
                const offsetY = grid.startYMm + row * (grid.cellHeightMm + grid.gapMm);

                const { dataUrl, qrBoxMm, qrString } = getRenderedItem(item, cellDims);
                doc.addImage(dataUrl, 'PNG', offsetX, offsetY, cellDims.widthMm, cellDims.heightMm);
                drawVectorQrOnPdf(doc, qrString, {
                    x: offsetX + qrBoxMm.x,
                    y: offsetY + qrBoxMm.y,
                    size: qrBoxMm.size,
                });
            });
        });
    } else {
        const orientation = cfg.widthMm >= cfg.heightMm ? 'landscape' : 'portrait';
        totalPages = expandedItems.length;

        doc = new jsPDF({
            orientation,
            unit: 'mm',
            format: [cfg.widthMm, cfg.heightMm],
            compress: true,
        });

        expandedItems.forEach((item, pageIndex) => {
            if (pageIndex > 0) {
                doc.addPage([cfg.widthMm, cfg.heightMm], orientation);
            }

            const { dataUrl, qrBoxMm, qrString } = getRenderedItem(item, cfg);
            doc.addImage(dataUrl, 'PNG', 0, 0, cfg.widthMm, cfg.heightMm);
            drawVectorQrOnPdf(doc, qrString, qrBoxMm);
        });
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `qr-labels-${paperMode}-${cfg.widthMm}x${cfg.heightMm}-${timestamp}.pdf`;

    return {
        blob,
        url,
        totalPages,
        totalLabels: expandedItems.length,
        fileName,
        paperMode,
        sizeConfig: cfg,
    };
}
