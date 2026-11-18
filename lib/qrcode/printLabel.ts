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
    type LabelSizeKey,
    type PrintableLabelItem,
} from './types';

export interface PrintQrLabelsOptions {
    sizeKey?: LabelSizeKey;
    customSize?: Partial<LabelDimensions>;
    paperMode?: LabelPaperMode;
}

function escapeHtml(raw: string): string {
    return raw
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function buildLabelHtml(
    item: PrintableLabelItem,
    svgMarkup: string,
    dims: LabelDimensions
): string {
    const scale = Math.min(1.35, Math.max(0.65, Math.min(dims.widthMm / 70, dims.heightMm / 50)));
    const isSmall = dims.widthMm <= 50 || dims.heightMm <= 32;
    const padMm = isSmall ? 2 : 2.5;

    if (item.kind === 'LOC') {
        const qrSizeMm = Math.min(dims.heightMm - padMm * 2 - 2, dims.widthMm * 0.42);
        const whName = normalizeTrackValue(item.warehouseName);

        return `
            <div class="label-card" style="width:${dims.widthMm}mm;height:${dims.heightMm}mm;padding:${padMm}mm;">
                <div class="loc-wrap">
                    <div class="qr-box" style="width:${qrSizeMm}mm;height:${qrSizeMm}mm;">
                        ${svgMarkup}
                    </div>
                    <div class="loc-info">
                        <div class="loc-header" style="font-size:${(2.3 * scale).toFixed(2)}mm;">LOCATION / พิกัดชั้นวาง</div>
                        <div class="loc-code" style="font-size:${(5.0 * scale).toFixed(2)}mm;">${escapeHtml(item.itemCode || '-')}</div>
                        <div class="loc-name" style="font-size:${(2.7 * scale).toFixed(2)}mm;">${escapeHtml(item.itemName || '-')}</div>
                        ${whName ? `<div class="loc-wh" style="font-size:${(2.3 * scale).toFixed(2)}mm;">คลัง: ${escapeHtml(whName)}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    const qrSizeMm = Math.min(dims.heightMm * 0.48, isSmall ? 15 : 24 * scale);
    const lotText = normalizeTrackValue(item.lotNo) || '-';
    const snText = normalizeTrackValue(item.serialNo) || '-';
    const locText = normalizeTrackValue(item.locationName) || '-';
    const whText = normalizeTrackValue(item.warehouseName) || '-';
    const mfgText = normalizeDateOnly(item.mfgDate) || '-';
    const expText = normalizeDateOnly(item.expireDate) || '-';
    const refText = normalizeTrackValue(item.refDoc)
        ? `REF: ${item.refDoc}`
        : `ID: ${normalizeTrackValue(item.invId).slice(0, 12) || item.itemCode}`;

    return `
        <div class="label-card" style="width:${dims.widthMm}mm;height:${dims.heightMm}mm;padding:${padMm}mm;">
            <div class="inv-header">
                <div class="inv-code" style="font-size:${(3.2 * scale).toFixed(2)}mm;">${escapeHtml(item.itemCode || '-')}</div>
                <div class="inv-name" style="font-size:${(2.55 * scale).toFixed(2)}mm;">${escapeHtml(item.itemName || '-')}</div>
            </div>
            <div class="inv-body">
                <div class="qr-box" style="width:${qrSizeMm}mm;height:${qrSizeMm}mm;">
                    ${svgMarkup}
                </div>
                <div class="inv-meta" style="font-size:${(2.25 * scale).toFixed(2)}mm;">
                    <div class="inv-qty" style="font-size:${(2.85 * scale).toFixed(2)}mm;">
                        QTY: ${(Number(item.qty) || 1).toLocaleString()} ${escapeHtml(item.uomName || 'ชิ้น')}
                    </div>
                    <div>LOC: ${escapeHtml(locText)}</div>
                    ${!isSmall ? `<div>WH : ${escapeHtml(whText)}</div>` : ''}
                    <div>LOT: ${escapeHtml(lotText)}</div>
                    ${snText !== '-' || !isSmall ? `<div>S/N: ${escapeHtml(snText)}</div>` : ''}
                    ${!isSmall ? `<div class="bold">MFG: ${escapeHtml(mfgText)}</div><div class="bold">EXP: ${escapeHtml(expText)}</div>` : ''}
                </div>
            </div>
            <div class="inv-footer" style="font-size:${(2.0 * scale).toFixed(2)}mm;">
                ${escapeHtml(refText)}
            </div>
        </div>
    `;
}

/**
 * สั่งพิมพ์ป้าย QRCode ผ่านหน้าต่าง Print ของเบราว์เซอร์ (รองรับเครื่องพิมพ์ทุกยี่ห้อและทุกขนาด)
 */
export async function printQrLabels(
    items: PrintableLabelItem[],
    options: PrintQrLabelsOptions = {}
): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('ไม่สามารถสั่งพิมพ์ในสภาพแวดล้อมนี้ได้');
    }

    const paperMode: LabelPaperMode = options.paperMode ?? 'roll';
    const cfg = resolveLabelConfig(options.sizeKey ?? DEFAULT_LABEL_SIZE, options.customSize);
    const expandedItems = expandPrintableItems(items);

    if (expandedItems.length === 0) {
        throw new Error('กรุณาเลือกรายการอย่างน้อย 1 รายการก่อนสั่งพิมพ์');
    }

    const svgCache = new WeakMap<PrintableLabelItem, string>();
    const getSvg = async (item: PrintableLabelItem) => {
        const cached = svgCache.get(item);
        if (cached) return cached;
        const qrString = encodePrintableItemQr(item);
        const svg = await QRCode.toString(qrString, {
            type: 'svg',
            margin: 0,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' },
        });
        svgCache.set(item, svg);
        return svg;
    };

    const uniqueItems = Array.from(new Set(expandedItems));
    await Promise.all(uniqueItems.map((it) => getSvg(it)));

    let pagesHtml = '';
    let pageRule = '';

    if (paperMode === 'a4') {
        const grid = calculateA4Grid(cfg);
        const cellDims: LabelDimensions = {
            widthMm: grid.cellWidthMm,
            heightMm: grid.cellHeightMm,
        };
        const pages = chunkItemsForA4(expandedItems, grid.perPage);
        pageRule = `@page { size: A4 portrait; margin: 0; }`;

        pagesHtml = pages
            .map((pageItems) => {
                const cards = pageItems
                    .map((item) => buildLabelHtml(item, svgCache.get(item) || '', cellDims))
                    .join('');
                return `
                    <div class="a4-page" style="width:${A4_WIDTH_MM}mm;height:${A4_HEIGHT_MM}mm;padding:${grid.marginMm}mm ${grid.startXMm}mm;">
                        <div class="a4-grid" style="grid-template-columns:repeat(${grid.cols},${grid.cellWidthMm}mm);gap:${grid.gapMm}mm;">
                            ${cards}
                        </div>
                    </div>
                `;
            })
            .join('');
    } else {
        pageRule = `@page { size: ${cfg.widthMm}mm ${cfg.heightMm}mm; margin: 0; }`;
        pagesHtml = expandedItems
            .map((item) => {
                const card = buildLabelHtml(item, svgCache.get(item) || '', cfg);
                return `<div class="roll-page" style="width:${cfg.widthMm}mm;height:${cfg.heightMm}mm;">${card}</div>`;
            })
            .join('');
    }

    const origin = window.location.origin;
    const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<title>QR Labels Print</title>
<style>
    @font-face {
        font-family: 'SarabunPrint';
        src: url('${origin}/fonts/Sarabun-Regular.ttf') format('truetype');
        font-weight: 400;
        font-style: normal;
    }
    @font-face {
        font-family: 'SarabunPrint';
        src: url('${origin}/fonts/Sarabun-Bold.ttf') format('truetype');
        font-weight: 700;
        font-style: normal;
    }
    ${pageRule}
    * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #000000;
        font-family: 'SarabunPrint', 'Sarabun', 'Noto Sans Thai', Arial, sans-serif;
    }
    .roll-page, .a4-page {
        page-break-after: always;
        break-after: page;
        overflow: hidden;
    }
    .roll-page:last-child, .a4-page:last-child {
        page-break-after: auto;
        break-after: auto;
    }
    .a4-grid {
        display: grid;
        align-content: start;
    }
    .label-card {
        border: 0.3mm solid #000000;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
        background: #ffffff;
    }
    .qr-box {
        flex-shrink: 0;
        background: #ffffff;
    }
    .qr-box svg {
        width: 100%;
        height: 100%;
        display: block;
    }
    .loc-wrap {
        display: flex;
        align-items: center;
        gap: 2.5mm;
        height: 100%;
    }
    .loc-info {
        flex: 1;
        min-width: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    .loc-header {
        font-weight: 700;
        border-bottom: 0.25mm solid #000000;
        padding-bottom: 0.6mm;
        margin-bottom: 0.8mm;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .loc-code {
        font-weight: 700;
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .loc-name {
        margin-top: 0.6mm;
        line-height: 1.2;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
    }
    .loc-wh {
        margin-top: auto;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .inv-header {
        border-bottom: 0.25mm solid #000000;
        padding-bottom: 0.8mm;
    }
    .inv-code {
        font-weight: 700;
        line-height: 1.15;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .inv-name {
        font-weight: 700;
        line-height: 1.2;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
    }
    .inv-body {
        display: flex;
        align-items: center;
        gap: 2mm;
        flex: 1;
        min-height: 0;
        padding: 0.8mm 0;
    }
    .inv-meta {
        flex: 1;
        min-width: 0;
        line-height: 1.25;
    }
    .inv-meta > div {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .inv-qty, .bold {
        font-weight: 700;
    }
    .inv-footer {
        border-top: 0.2mm solid #000000;
        padding-top: 0.5mm;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
</head>
<body>
    ${pagesHtml}
</body>
</html>`;

    await new Promise<void>((resolve, reject) => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.setAttribute('aria-hidden', 'true');

        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            window.clearTimeout(safetyTimer);
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
        };

        const safetyTimer = window.setTimeout(cleanup, 60000);

        iframe.onload = async () => {
            try {
                const win = iframe.contentWindow;
                const doc = iframe.contentDocument;
                if (!win || !doc) {
                    cleanup();
                    reject(new Error('ไม่สามารถเปิดหน้าต่างพิมพ์ได้'));
                    return;
                }

                if (doc.fonts?.ready) {
                    await doc.fonts.ready.catch(() => undefined);
                }

                win.addEventListener('afterprint', cleanup, { once: true });
                win.focus();
                win.print();
                resolve();
            } catch (err) {
                cleanup();
                reject(err);
            }
        };

        iframe.srcdoc = html;
        document.body.appendChild(iframe);
    });
}
