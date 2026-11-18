'use client';

import React, { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui';
import { Camera } from 'lucide-react';
import { QrScannerModal, type QrScannerModalProps } from './QrScannerModal';

export interface QrScanButtonProps
    extends Omit<QrScannerModalProps, 'open' | 'onOpenChange'> {
    label?: ReactNode;
    beforeOpen?: () => boolean | Promise<boolean>;
    disabled?: boolean;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
    size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
    className?: string;
    icon?: ReactNode;
    renderTrigger?: (props: { open: () => void; disabled?: boolean }) => ReactNode;
}

/**
 * ปุ่มสแกน QRCode กลางแบบจบในตัว (จัดการ state เปิด/ปิด Modal และตัวสแกนให้ครบ)
 */
export function QrScanButton({
    label = 'สแกน QRCode',
    beforeOpen,
    disabled = false,
    variant = 'outline',
    size = 'sm',
    className,
    icon,
    renderTrigger,
    ...modalProps
}: QrScanButtonProps) {
    const [open, setOpen] = useState(false);

    const handleOpen = async () => {
        if (disabled) return;
        if (beforeOpen) {
            const allowed = await beforeOpen();
            if (!allowed) return;
        }
        setOpen(true);
    };

    return (
        <>
            {renderTrigger ? (
                renderTrigger({ open: () => void handleOpen(), disabled })
            ) : (
                <Button
                    type="button"
                    variant={variant}
                    size={size}
                    disabled={disabled}
                    onClick={() => void handleOpen()}
                    className={className}
                >
                    {icon ?? <Camera className="w-3.5 h-3.5" />}
                    {label}
                </Button>
            )}

            <QrScannerModal
                open={open}
                onOpenChange={setOpen}
                {...modalProps}
            />
        </>
    );
}
