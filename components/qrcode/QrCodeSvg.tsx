'use client';

import React, { useMemo } from 'react';
import QRCode from 'qrcode';

interface QrCodeSvgProps {
    value: string;
    size?: number;
    className?: string;
}

/**
 * แสดงผล QRCode แบบ Vector SVG คมชัดทุกขนาดหน้าจอ
 */
export function QrCodeSvg({ value, size = 120, className }: QrCodeSvgProps) {
    const matrix = useMemo(() => {
        try {
            const qr = QRCode.create(value || '-', { errorCorrectionLevel: 'M' });
            const count = qr.modules.size;
            const rects: { x: number; y: number }[] = [];
            for (let r = 0; r < count; r += 1) {
                for (let c = 0; c < count; c += 1) {
                    if (qr.modules.get(r, c)) {
                        rects.push({ x: c, y: r });
                    }
                }
            }
            return { count, rects };
        } catch {
            return { count: 1, rects: [] };
        }
    }, [value]);

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${matrix.count} ${matrix.count}`}
            shapeRendering="crispEdges"
            className={className}
            role="img"
            aria-label="QR Code"
        >
            <rect width={matrix.count} height={matrix.count} fill="#ffffff" />
            {matrix.rects.map((pt, idx) => (
                <rect key={idx} x={pt.x} y={pt.y} width={1} height={1} fill="#000000" />
            ))}
        </svg>
    );
}
