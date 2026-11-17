'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import { extractList } from '@/lib/utils';
import type { BaseEntity } from '@/lib/types';
import { Card, CardContent, Button } from '@/components/ui';
import {
    Package,
    Tag,
    Warehouse,
    MapPin,
    Ruler,
    Truck,
    Users,
    UserCheck,
    FileText,
    RefreshCw,
    ArrowRight,
    Database,
    CheckCircle2,
    XCircle,
} from 'lucide-react';

interface ModuleStat {
    total: number;
    active: number;
    inactive: number;
}

type MasterKey =
    | 'items'
    | 'brands'
    | 'warehouses'
    | 'locations'
    | 'uoms'
    | 'vendors'
    | 'customers'
    | 'employees'
    | 'docTypes';

const INITIAL_STATS: Record<MasterKey, ModuleStat> = {
    items: { total: 0, active: 0, inactive: 0 },
    brands: { total: 0, active: 0, inactive: 0 },
    warehouses: { total: 0, active: 0, inactive: 0 },
    locations: { total: 0, active: 0, inactive: 0 },
    uoms: { total: 0, active: 0, inactive: 0 },
    vendors: { total: 0, active: 0, inactive: 0 },
    customers: { total: 0, active: 0, inactive: 0 },
    employees: { total: 0, active: 0, inactive: 0 },
    docTypes: { total: 0, active: 0, inactive: 0 },
};

const MASTER_MODULES: {
    key: MasterKey;
    titleTh: string;
    titleEn: string;
    description: string;
    href: string;
    icon: typeof Package;
    colorClass: string;
    bgClass: string;
}[] = [
    {
        key: 'items',
        titleTh: 'ข้อมูลสินค้า',
        titleEn: 'Items Master',
        description: 'จัดการรหัสสินค้า ชื่อสินค้า ราคาซื้อ-ขาย การควบคุม Lot/Serial และจุดแจ้งเตือนสต็อก',
        href: '/master/items',
        icon: Package,
        colorClass: 'text-blue-600 dark:text-blue-400',
        bgClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    },
    {
        key: 'brands',
        titleTh: 'แบรนด์สินค้า',
        titleEn: 'Brands',
        description: 'จัดการข้อมูลยี่ห้อและแบรนด์สินค้าทั้งภาษาไทยและภาษาอังกฤษ',
        href: '/master/brands',
        icon: Tag,
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        bgClass: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    },
    {
        key: 'warehouses',
        titleTh: 'คลังสินค้า',
        titleEn: 'Warehouses',
        description: 'กำหนดรหัสและชื่อคลังสินค้าสำหรับแยกพื้นที่จัดเก็บและควบคุมสต็อก',
        href: '/master/warehouses',
        icon: Warehouse,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    },
    {
        key: 'locations',
        titleTh: 'ตำแหน่งจัดเก็บ',
        titleEn: 'Storage Locations',
        description: 'จัดการตำแหน่งจัดเก็บย่อย (Zone / Rack / Bin) ภายในแต่ละคลังสินค้า',
        href: '/master/locations',
        icon: MapPin,
        colorClass: 'text-teal-600 dark:text-teal-400',
        bgClass: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    },
    {
        key: 'uoms',
        titleTh: 'หน่วยนับสินค้า',
        titleEn: 'Units of Measure (UOM)',
        description: 'กำหนดหน่วยนับมาตรฐานของสินค้า เช่น ชิ้น, กล่อง, ลัง, แพ็ค, กิโลกรัม',
        href: '/master/uoms',
        icon: Ruler,
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    },
    {
        key: 'vendors',
        titleTh: 'ผู้จัดจำหน่าย',
        titleEn: 'Vendors / Suppliers',
        description: 'จัดการรายชื่อซัพพลายเออร์และคู่ค้าสำหรับอ้างอิงในการรับสินค้าเข้าคลัง',
        href: '/master/vendors',
        icon: Truck,
        colorClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800',
    },
    {
        key: 'customers',
        titleTh: 'ข้อมูลลูกค้า',
        titleEn: 'Customers',
        description: 'จัดการรายชื่อลูกค้า ที่อยู่ และผู้ติดต่อสำหรับอ้างอิงในการเบิกจ่ายสินค้า',
        href: '/master/customers',
        icon: Users,
        colorClass: 'text-purple-600 dark:text-purple-400',
        bgClass: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    },
    {
        key: 'employees',
        titleTh: 'ข้อมูลพนักงาน',
        titleEn: 'Employees',
        description: 'จัดการรายชื่อพนักงานและเจ้าหน้าที่ผู้รับผิดชอบธุรกรรมคลังสินค้า',
        href: '/master/employees',
        icon: UserCheck,
        colorClass: 'text-pink-600 dark:text-pink-400',
        bgClass: 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800',
    },
    {
        key: 'docTypes',
        titleTh: 'ประเภทเอกสาร',
        titleEn: 'Document Types',
        description: 'กำหนดประเภทเอกสารย่อยและผูกกับประเภทธุรกรรมของระบบคลังสินค้า',
        href: '/master/doctypes',
        icon: FileText,
        colorClass: 'text-cyan-600 dark:text-cyan-400',
        bgClass: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800',
    },
];

function summarizeList<T extends BaseEntity>(list: T[]): ModuleStat {
    const total = list.length;
    const active = list.filter((item) => item.isActive !== false).length;
    return {
        total,
        active,
        inactive: total - active,
    };
}

export default function MasterDataDashboardPage() {
    const { setPageTitle } = useLayout();
    const [stats, setStats] = useState<Record<MasterKey, ModuleStat>>(INITIAL_STATS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setPageTitle('ข้อมูลหลัก (Master Data Dashboard)');
    }, [setPageTitle]);

    const fetchAllMasterCounts = useCallback(async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                masterService.items.list(),
                masterService.brands.list(),
                masterService.warehouses.list(),
                masterService.locations.list(),
                masterService.uoms.list(),
                masterService.vendors.list(),
                masterService.customers.list(),
                masterService.employees.list(),
                masterService.docTypes.list(),
            ]);

            const keys: MasterKey[] = [
                'items',
                'brands',
                'warehouses',
                'locations',
                'uoms',
                'vendors',
                'customers',
                'employees',
                'docTypes',
            ];

            const nextStats: Record<MasterKey, ModuleStat> = { ...INITIAL_STATS };

            results.forEach((result, index) => {
                const key = keys[index];
                if (result.status === 'fulfilled') {
                    const list = extractList<BaseEntity>(result.value);
                    nextStats[key] = summarizeList(list);
                }
            });

            setStats(nextStats);
        } catch (error) {
            console.error('Failed to fetch master data summary:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAllMasterCounts();
    }, [fetchAllMasterCounts]);

    const totalStorageUnits = stats.warehouses.total + stats.locations.total;
    const totalPartnersAndStaff =
        stats.vendors.total + stats.customers.total + stats.employees.total;

    return (
        <AppLayout>
            {/* Header Section */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        แดชบอร์ดข้อมูลหลัก (Master Data Dashboard)
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        ภาพรวมและจุดเข้าใช้งานข้อมูลพื้นฐานทั้งหมดของระบบคลังสินค้า (WMS Master Data Overview)
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        onClick={fetchAllMasterCounts}
                        disabled={loading}
                        className="w-full sm:w-auto justify-center rounded-xl px-4 py-2 text-sm flex items-center gap-2 border-zinc-200 dark:border-zinc-700"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        รีเฟรชข้อมูล
                    </Button>
                </div>
            </div>

            {/* Top Summary KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                รายการสินค้าทั้งหมด
                            </p>
                            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {loading ? '...' : stats.items.total.toLocaleString()}{' '}
                                <span className="text-sm font-normal text-zinc-500">รายการ</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Database className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                หมวดหมู่ข้อมูลหลักทั้งหมด
                            </p>
                            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {MASTER_MODULES.length} <span className="text-sm font-normal text-zinc-500">หมวด</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Warehouse className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                คลังและตำแหน่งจัดเก็บ
                            </p>
                            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {loading ? '...' : totalStorageUnits.toLocaleString()}{' '}
                                <span className="text-sm font-normal text-zinc-500">จุดจัดเก็บ</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                คู่ค้าและบุคลากร
                            </p>
                            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {loading ? '...' : totalPartnersAndStaff.toLocaleString()}{' '}
                                <span className="text-sm font-normal text-zinc-500">รายชื่อ</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 9 Master Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {MASTER_MODULES.map((mod) => {
                    const Icon = mod.icon;
                    const stat = stats[mod.key];

                    return (
                        <Link key={mod.key} href={mod.href} className="group block">
                            <Card className="h-full border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200">
                                <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3 sm:gap-4">
                                    <div>
                                        <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center shrink-0 ${mod.bgClass} ${mod.colorClass}`}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {mod.titleTh}
                                                    </h2>
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                                        {mod.titleEn}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 shrink-0">
                                                {loading ? '...' : `${stat.total.toLocaleString()} รายการ`}
                                            </span>
                                        </div>

                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-3 leading-relaxed">
                                            {mod.description}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                ใช้งาน: {loading ? '-' : stat.active.toLocaleString()}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
                                                <XCircle className="w-3.5 h-3.5" />
                                                ปิด: {loading ? '-' : stat.inactive.toLocaleString()}
                                            </span>
                                        </div>

                                        <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                                            จัดการข้อมูล
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>
        </AppLayout>
    );
}
