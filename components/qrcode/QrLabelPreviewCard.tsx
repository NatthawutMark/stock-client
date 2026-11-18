'use client';

import React from 'react';
import { normalizeDateOnly, normalizeTrackValue } from '@/lib/qrcode/normalize';
import { encodePrintableItemQr } from '@/lib/qrcode/labelLayout';
import type { LabelDimensions, PrintableLabelItem } from '@/lib/qrcode/types';
import { QrCodeSvg } from './QrCodeSvg';

export interface QrLabelPreviewCardProps {
    item: PrintableLabelItem;
    dimensions: LabelDimensions;
    pxPerMm?: number;
}

/**
 * การ์ดแสดงตัวอย่างป้าย QRCode ตามสัดส่วนมิลลิเมตรจริง (รองรับทั้งป้ายสินค้าและป้ายพิกัด)
 */
export function QrLabelPreviewCard({
    item,
    dimensions,
    pxPerMm = 4,
}: QrLabelPreviewCardProps) {
    const scale = Math.min(
        1.4,
        Math.max(0.62, Math.min(dimensions.widthMm / 70, dimensions.heightMm / 50))
    );
    const isSmall = dimensions.widthMm <= 50 || dimensions.heightMm <= 32;
    const padPx = (isSmall ? 2 : 2.5) * pxPerMm;
    const wPx = dimensions.widthMm * pxPerMm;
    const hPx = dimensions.heightMm * pxPerMm;
    const qrValue = encodePrintableItemQr(item);

    if (item.kind === 'LOC') {
        const qrSizeMm = Math.min(dimensions.heightMm - (isSmall ? 4 : 5) - 2, dimensions.widthMm * 0.42);
        const qrSizePx = Math.max(18, Math.round(qrSizeMm * pxPerMm));
        const whName = normalizeTrackValue(item.warehouseName);

        return (
            <div
                style={{
                    width: `${wPx}px`,
                    height: `${hPx}px`,
                    padding: `${padPx}px`,
                    fontFamily: '"Sarabun", "Noto Sans Thai", Arial, sans-serif',
                }}
                className="bg-white text-black border border-black flex items-center gap-[2%] overflow-hidden select-none shadow-xs"
            >
                <div className="shrink-0 bg-white">
                    <QrCodeSvg value={qrValue} size={qrSizePx} />
                </div>
                <div className="flex-1 min-w-0 h-full flex flex-col">
                    <div
                        style={{ fontSize: `${2.3 * scale * pxPerMm}px` }}
                        className="font-bold border-b border-black pb-[2%] mb-[3%] truncate leading-tight"
                    >
                        LOCATION / พิกัดชั้นวาง
                    </div>
                    <div
                        style={{ fontSize: `${4.8 * scale * pxPerMm}px` }}
                        className="font-bold truncate leading-none"
                    >
                        {item.itemCode || '-'}
                    </div>
                    <div
                        style={{ fontSize: `${2.6 * scale * pxPerMm}px` }}
                        className="mt-[3%] line-clamp-2 leading-tight"
                    >
                        {item.itemName || '-'}
                    </div>
                    {whName && (
                        <div
                            style={{ fontSize: `${2.2 * scale * pxPerMm}px` }}
                            className="mt-auto font-bold truncate leading-tight"
                        >
                            คลัง: {whName}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const qrSizeMm = Math.min(dimensions.heightMm * 0.48, isSmall ? 15 : 24 * scale);
    const qrSizePx = Math.max(18, Math.round(qrSizeMm * pxPerMm));
    const lotText = normalizeTrackValue(item.lotNo) || '-';
    const snText = normalizeTrackValue(item.serialNo) || '-';
    const locText = normalizeTrackValue(item.locationName) || '-';
    const whText = normalizeTrackValue(item.warehouseName) || '-';
    const mfgText = normalizeDateOnly(item.mfgDate) || '-';
    const expText = normalizeDateOnly(item.expireDate) || '-';
    const refText = normalizeTrackValue(item.refDoc)
        ? `REF: ${item.refDoc}`
        : `ID: ${normalizeTrackValue(item.invId).slice(0, 12) || item.itemCode}`;

    return (
        <div
            style={{
                width: `${wPx}px`,
                height: `${hPx}px`,
                padding: `${padPx}px`,
                fontFamily: '"Sarabun", "Noto Sans Thai", Arial, sans-serif',
            }}
            className="bg-white text-black border border-black flex flex-col justify-between overflow-hidden select-none shadow-xs"
        >
            <div className="border-b border-black pb-[2%]">
                <div
                    style={{ fontSize: `${3.1 * scale * pxPerMm}px` }}
                    className="font-bold truncate leading-tight"
                >
                    {item.itemCode || '-'}
                </div>
                <div
                    style={{ fontSize: `${2.45 * scale * pxPerMm}px` }}
                    className="font-bold line-clamp-2 leading-tight"
                >
                    {item.itemName || '-'}
                </div>
            </div>

            <div className="flex items-center gap-[3%] flex-1 min-h-0 py-[2%]">
                <div className="shrink-0 bg-white">
                    <QrCodeSvg value={qrValue} size={qrSizePx} />
                </div>
                <div
                    style={{ fontSize: `${2.15 * scale * pxPerMm}px` }}
                    className="flex-1 min-w-0 leading-tight space-y-[1%]"
                >
                    <div
                        style={{ fontSize: `${2.7 * scale * pxPerMm}px` }}
                        className="font-bold truncate"
                    >
                        QTY: {(Number(item.qty) || 1).toLocaleString()} {item.uomName || 'ชิ้น'}
                    </div>
                    <div className="truncate">LOC: {locText}</div>
                    {!isSmall && <div className="truncate">WH : {whText}</div>}
                    <div className="truncate">LOT: {lotText}</div>
                    {(snText !== '-' || !isSmall) && <div className="truncate">S/N: {snText}</div>}
                    {!isSmall && (
                        <>
                            <div className="font-bold truncate">MFG: {mfgText}</div>
                            <div className="font-bold truncate">EXP: {expText}</div>
                        </>
                    )}
                </div>
            </div>

            <div
                style={{ fontSize: `${1.95 * scale * pxPerMm}px` }}
                className="border-t border-black pt-[1.5%] truncate leading-tight"
            >
                {refText}
            </div>
        </div>
    );
}
