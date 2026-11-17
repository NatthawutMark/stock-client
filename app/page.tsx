'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        const hasAuth = localStorage.getItem('wms-token') || localStorage.getItem('wms-user');
        router.replace(hasAuth ? '/dashboard' : '/login');
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center">
            <p className="text-sm text-zinc-500">กำลังตรวจสอบสิทธิ์...</p>
        </div>
    );
}
