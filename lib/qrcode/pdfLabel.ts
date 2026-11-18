import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
    encodeInventoryQr,
    encodeLocationQr,
    normalizeDateOnly,
    normalizeTrackValue,
} from './codec';
import {
    DEFAULT_ZEBRA_LABEL_SIZE,
    ZEBRA_LABEL_SIZES,
    type PrintableLabelItem,
    type ZebraLabelSizeConfig,
    type ZebraLabelSizeKey,
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

function getLabelConfig(sizeKey: ZebraLabelSizeKey): ZebraLabelSizeConfig {
    return (
        ZEBRA_LABEL_SIZES.find((s) => s.key === sizeKey) ||
        ZEBRA_LABEL_SIZES.find((s) => s.key === DEFAULT_ZEBRA_LABEL_SIZE)!
    );
}

/**
 * ตัดข้อความให้พอดีกับความกว้างที่กำหนด พร้อมเติม ...
 */
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

/**
 * แบ่งข้อความยาว (เช่น ชื่อสินค้า) เป็นไม่เกิน 2 บรรทัดให้พอดีกรอบสติกเกอร์
 */
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

    // พยายามตัดตรงช่องว่างถ้ามีใกล้เคียง
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
    cfg: ZebraLabelSizeConfig
): { dataUrl: string; qrBoxMm: QrBoxRectMm } {
    const canvas = document.createElement('canvas');
    const wPx = Math.round(cfg.widthMm * PX_PER_MM);
    const hPx = Math.round(cfg.heightMm * PX_PER_MM);
    canvas.width = wPx;
    canvas.height = hPx;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Cannot initialize 2D canvas context');
    }

    const mm = (val: number) => val * PX_PER_MM;
    const fontFamily = '"SarabunPrint", "Sarabun", "Noto Sans Thai", Arial, sans-serif';

    // พื้นหลังขาวล้วนเหมาะกับเครื่องพิมพ์ความร้อน Zebra
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, wPx, hPx);

    // คำนวณสัดส่วนตามขนาดสติกเกอร์
    const isSmall = cfg.widthMm <= 50;
    const isLarge = cfg.widthMm >= 100;
    const padMm = isSmall ? 2.0 : isLarge ? 3.5 : 2.5;
    const scale = isSmall ? 0.72 : isLarge ? 1.32 : 1.0;

    // กรอบเส้นดำบางรอบป้าย
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1.5, mm(0.25));
    ctx.strokeRect(mm(0.8), mm(0.8), wPx - mm(1.6), hPx - mm(1.6));

    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';

    // ─── กรณีป้ายตำแหน่งจัดเก็บ (Shelf Location Label) ─────────────────
    if (item.kind === 'LOC') {
        const qrSizeMm = Math.min(cfg.heightMm - padMm * 2 - 2, cfg.widthMm * 0.44);
        const qrBoxMm: QrBoxRectMm = {
            x: padMm + 0.5,
            y: (cfg.heightMm - qrSizeMm) / 2,
            size: qrSizeMm,
        };

        const textLeftMm = qrBoxMm.x + qrSizeMm + (isSmall ? 2.0 : 3.0);
        const textWidthPx = mm(cfg.widthMm - textLeftMm - padMm);

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

    // ─── กรณีป้ายสินค้า (Inventory / Goods Receive Label) ────────────
    const headerHeightMm = isSmall ? 8.0 : isLarge ? 16.5 : 12.0;
    const footerHeightMm = isSmall ? 4.2 : isLarge ? 7.5 : 5.5;

    // 1. ส่วนหัว: รหัสสินค้า + ชื่อสินค้า
    const headerWidthPx = wPx - mm(padMm * 2);
    ctx.font = `700 ${Math.round(mm(3.4 * scale))}px ${fontFamily}`;
    ctx.fillText(fitTextLine(ctx, item.itemCode || '-', headerWidthPx), mm(padMm), mm(padMm));

    ctx.font = `700 ${Math.round(mm(2.7 * scale))}px ${fontFamily}`;
    const [nameLine1, nameLine2] = wrapTwoLines(ctx, item.itemName || '-', headerWidthPx);
    ctx.fillText(nameLine1, mm(padMm), mm(padMm + 4.1 * scale));
    if (nameLine2 && !isSmall) {
        ctx.fillText(nameLine2, mm(padMm), mm(padMm + 7.2 * scale));
    }

    // เส้นคั่นส่วนหัว
    const dividerY = padMm + headerHeightMm;
    ctx.beginPath();
    ctx.moveTo(mm(padMm), mm(dividerY));
    ctx.lineTo(wPx - mm(padMm), mm(dividerY));
    ctx.lineWidth = Math.max(1.5, mm(0.25));
    ctx.stroke();

    // 2. กรอบ QR ด้านซ้าย
    const availableBodyH = cfg.heightMm - dividerY - footerHeightMm - 2;
    const qrSizeMm = Math.min(availableBodyH, isSmall ? 15.5 : isLarge ? 36 : 25);
    const qrBoxMm: QrBoxRectMm = {
        x: padMm + 0.5,
        y: dividerY + (availableBodyH - qrSizeMm) / 2 + 0.5,
        size: qrSizeMm,
    };

    // 3. ข้อมูลรายละเอียดด้านขวาของ QR
    const infoLeftMm = qrBoxMm.x + qrSizeMm + (isSmall ? 1.8 : 2.8);
    const infoWidthPx = wPx - mm(infoLeftMm + padMm);
    let cursorY = dividerY + 1.4;
    const lineGap = isSmall ? 3.1 : isLarge ? 5.8 : 4.2;

    // จำนวนและหน่วยนับ
    ctx.font = `700 ${Math.round(mm(3.1 * scale))}px ${fontFamily}`;
    const qtyText = `QTY: ${(Number(item.qty) || 1).toLocaleString()} ${item.uomName || 'ชิ้น'}`;
    ctx.fillText(fitTextLine(ctx, qtyText, infoWidthPx), mm(infoLeftMm), mm(cursorY));
    cursorY += lineGap + 0.5;

    // พิกัด & คลัง
    ctx.font = `400 ${Math.round(mm(2.45 * scale))}px ${fontFamily}`;
    const locText = normalizeTrackValue(item.locationName) || '-';
    ctx.fillText(fitTextLine(ctx, `LOC: ${locText}`, infoWidthPx), mm(infoLeftMm), mm(cursorY));
    cursorY += lineGap;

    if (!isSmall) {
        const whText = normalizeTrackValue(item.warehouseName) || '-';
        ctx.fillText(fitTextLine(ctx, `WH : ${whText}`, infoWidthPx), mm(infoLeftMm), mm(cursorY));
        cursorY += lineGap;
    }

    // Lot & Serial (รองรับกรณีไม่มีข้อมูล -> แสดง "-")
    const lotText = normalizeTrackValue(item.lotNo) || '-';
    const snText = normalizeTrackValue(item.serialNo) || '-';
    ctx.fillText(fitTextLine(ctx, `LOT: ${lotText}`, infoWidthPx), mm(infoLeftMm), mm(cursorY));
    cursorY += lineGap;

    if (snText !== '-' || !isSmall) {
        ctx.fillText(fitTextLine(ctx, `S/N: ${snText}`, infoWidthPx), mm(infoLeftMm), mm(cursorY));
        cursorY += lineGap;
    }

    // MFG / EXP (รองรับกรณีไม่มีข้อมูล -> แสดง "-")
    if (!isSmall) {
        const mfgText = normalizeDateOnly(item.mfgDate) || '-';
        const expText = normalizeDateOnly(item.expireDate) || '-';
        ctx.font = `700 ${Math.round(mm(2.3 * scale))}px ${fontFamily}`;
        ctx.fillText(fitTextLine(ctx, `MFG: ${mfgText}`, infoWidthPx), mm(infoLeftMm), mm(cursorY));
        cursorY += lineGap;
        ctx.fillText(fitTextLine(ctx, `EXP: ${expText}`, infoWidthPx), mm(infoLeftMm), mm(cursorY));
    }

    // 4. ส่วนท้าย: เอกสารอ้างอิง & วันที่พิมพ์
    const footerY = cfg.heightMm - footerHeightMm - 0.5;
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
 * วาด QRCode แบบ Vector Rectangles ลงบนหน้า PDF โดยตรง
 * เพื่อความคมชัด 100% เมื่อพิมพ์ผ่านหัวพิมพ์ความร้อน Zebra
 */
function drawVectorQrOnPdf(
    doc: jsPDF,
    qrString: string,
    box: QrBoxRectMm
): void {
    const qrData = QRCode.create(qrString, { errorCorrectionLevel: 'M' });
    const count = qrData.modules.size;
    const cellMm = box.size / count;

    // กลบพื้นขาวใต้ QR เพื่อความคอนทราสต์สูงสุด
    doc.setFillColor(255, 255, 255);
    doc.rect(box.x, box.y, box.size, box.size, 'F');

    doc.setFillColor(0, 0, 0);
    // เติม overlap เล็กน้อย (0.015 mm) ป้องกันเส้นร่องขาวระหว่างช่องในโปรแกรมดู PDF
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

export interface GeneratedPdfResult {
    blob: Blob;
    url: string;
    totalPages: number;
    fileName: string;
    sizeConfig: ZebraLabelSizeConfig;
}

/**
 * สร้างไฟล์ PDF สำหรับเครื่องพิมพ์ Zebra (1 หน้า PDF = 1 ดวงสติกเกอร์)
 * ค่าเริ่มต้น 70 x 50 mm
 */
export async function generateZebraLabelPdf(
    items: PrintableLabelItem[],
    sizeKey: ZebraLabelSizeKey = DEFAULT_ZEBRA_LABEL_SIZE
): Promise<GeneratedPdfResult> {
    await ensureSarabunFontLoaded();

    const cfg = getLabelConfig(sizeKey);
    const orientation = cfg.widthMm >= cfg.heightMm ? 'landscape' : 'portrait';
    const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: [cfg.widthMm, cfg.heightMm],
        compress: true,
    });

    const expandedItems: PrintableLabelItem[] = [];
    for (const item of items) {
        const copies = Math.max(1, Math.min(200, Number(item.copies) || 1));
        for (let i = 0; i < copies; i += 1) {
            expandedItems.push(item);
        }
    }

    if (expandedItems.length === 0) {
        throw new Error('กรุณาเลือกรายการอย่างน้อย 1 รายการเพื่อสร้าง PDF');
    }

    expandedItems.forEach((item, pageIndex) => {
        if (pageIndex > 0) {
            doc.addPage([cfg.widthMm, cfg.heightMm], orientation);
        }

        const { dataUrl, qrBoxMm } = renderLabelCanvas(item, cfg);
        doc.addImage(dataUrl, 'PNG', 0, 0, cfg.widthMm, cfg.heightMm);

        const qrString =
            item.kind === 'LOC'
                ? encodeLocationQr({
                      id: item.locationId || item.id,
                      code: item.itemCode,
                      warehouseId: item.warehouseId,
                  })
                : encodeInventoryQr(item);

        drawVectorQrOnPdf(doc, qrString, qrBoxMm);
    });

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `zebra-qr-${cfg.key}-${timestamp}.pdf`;

    return {
        blob,
        url,
        totalPages: expandedItems.length,
        fileName,
        sizeConfig: cfg,
    };
}
