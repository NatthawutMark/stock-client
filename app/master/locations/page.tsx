'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { SearchInput } from '@/app/components/ui/SearchInput';
import { useI18n, useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import type { MastLocation, MastWarehouse } from '@/lib/types';
import {
    Button,
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Card,
    CardContent,
    Label,
    TablePagination,
} from '@/components/ui';
import { CreateLocationModal } from '@/app/components/modal/CreateLocationModal';
import Swal from 'sweetalert2';
import { Building2, Pencil, Trash2 } from 'lucide-react';

export default function LocationsPage() {
    const { t } = useI18n();
    const { pageTitle } = useLayout();

    const columns = [
        { key: 'warehouse', label: 'คลังสินค้า (Warehouse)', width: 'w-[240px]' },
        { key: 'code', label: 'รหัสตำแหน่ง (Code)', width: 'w-[180px]' },
        { key: 'name', label: 'ชื่อตำแหน่งจัดเก็บ (Name)' },
        { key: 'status', label: `${t.common.status || 'สถานะ'}`, width: 'w-[120px]' },
        { key: 'actions', label: `${t.common.actions || 'จัดการ'}`, width: 'w-[150px]', align: 'text-right' },
    ];

    // State
    const [locationList, setLocationList] = useState<MastLocation[]>([]);
    const [warehouseList, setWarehouseList] = useState<MastWarehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<MastLocation | null>(null);

    // Fetch warehouses for filter dropdown
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const res = await masterService.warehouses.list();
                if (res && res.success) {
                    const data = Array.isArray(res.results)
                        ? res.results
                        : Array.isArray(res.data)
                        ? res.data
                        : [];
                    setWarehouseList(data);
                }
            } catch (err) {
                console.error('Failed to load warehouses for filter:', err);
            }
        };
        fetchWarehouses();
    }, []);

    // Fetch locations from C# API (stock-api: /api/MastLocation/list)
    const fetchLocations = useCallback(async () => {
        setLoading(true);
        try {
            const res = await masterService.locations.list({
                search,
                warehouseId: selectedWarehouse || undefined,
            });
            if (res && res.success) {
                const data = Array.isArray(res.results)
                    ? res.results
                    : Array.isArray(res.data)
                    ? res.data
                    : [];
                setLocationList(data);
            } else {
                setLocationList([]);
            }
        } catch (error) {
            console.error('Failed to fetch locations:', error);
            setLocationList([]);
        } finally {
            setLoading(false);
        }
    }, [search, selectedWarehouse]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchLocations();
    }, [fetchLocations]);

    // Client-side filtering as fallback/enhancement
    const filteredLocations = useMemo(() => {
        return locationList.filter((loc) => {
            const q = search.trim().toLowerCase();
            const code = loc.code || '';
            const name = loc.name || '';
            const whId = loc.warehouseId ?? loc.WarehouseId;
            const matchedWh = warehouseList.find((w) => String(w.id) === String(whId))?.warehouseName || '';

            const matchesSearch =
                !q ||
                code.toLowerCase().includes(q) ||
                name.toLowerCase().includes(q) ||
                matchedWh.toLowerCase().includes(q);

            const matchesWarehouse =
                !selectedWarehouse || String(whId) === selectedWarehouse;

            return matchesSearch && matchesWarehouse;
        });
    }, [locationList, search, selectedWarehouse, warehouseList]);

    // Pagination Calculations
    const totalPages = Math.max(1, Math.ceil(filteredLocations.length / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedLocations = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filteredLocations.slice(startIndex, startIndex + pageSize);
    }, [filteredLocations, safeCurrentPage, pageSize]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setCurrentPage(1);
    };

    const handleWarehouseFilterChange = (val: string) => {
        setSelectedWarehouse(val);
        setCurrentPage(1);
    };

    const handleOpenCreate = () => {
        setEditingLocation(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (loc: MastLocation) => {
        setEditingLocation({ ...loc });
        setIsModalOpen(true);
    };

    const handleDelete = async (loc: MastLocation) => {
        const confirmResult = await Swal.fire({
            title: 'ยืนยันการลบข้อมูล',
            text: `คุณต้องการลบข้อมูลตำแหน่งจัดเก็บ "${loc.name || loc.code}" หรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ใช่, ต้องการลบ',
            cancelButtonText: 'ยกเลิก',
        });

        if (confirmResult.isConfirmed) {
            try {
                const targetId = loc.id;
                if (targetId === undefined) return;
                const res = await masterService.locations.remove(targetId);

                if (res.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'ลบข้อมูลสำเร็จ',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    fetchLocations();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'ลบข้อมูลไม่สำเร็จ',
                        text: res.error || res.message || 'เกิดข้อผิดพลาดในการลบข้อมูลตำแหน่งจัดเก็บ',
                    });
                }
            } catch (error: unknown) {
                console.error('Delete location error:', error);
                const err = error as { message?: string };
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: err.message || 'ไม่สามารถลบข้อมูลตำแหน่งจัดเก็บได้',
                });
            }
        }
    };

    const getWarehouseDisplay = (whId?: number | string) => {
        const idStr = whId !== undefined && whId !== null ? String(whId) : '';
        const mapped = warehouseList.find((w) => String(w.id) === idStr);
        if (mapped) {
            return (
                <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                >
                    <Building2 className="w-3 h-3" />
                    {mapped.warehouseName} {mapped.code ? `(${mapped.code})` : ''}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                <Building2 className="w-3 h-3" />
                {whId ? `คลัง #${whId}` : '-'}
            </span>
        );
    };

    return (
        <AppLayout>
            {/* Header Section */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'จัดการข้อมูลตำแหน่งจัดเก็บ'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        จัดการข้อมูลตำแหน่งจัดเก็บสินค้าในคลัง (Location / Bin Management)
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Warehouse Filter Dropdown */}
                    <select
                        value={selectedWarehouse}
                        onChange={(e) => handleWarehouseFilterChange(e.target.value)}
                        className="h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                    >
                        <option value="">ทุกคลังสินค้า (All Warehouses)</option>
                        {warehouseList.map((wh) => (
                            <option key={wh.id} value={String(wh.id)}>
                                {wh.warehouseName} {wh.code ? `(${wh.code})` : ''}
                            </option>
                        ))}
                    </select>

                    <SearchInput
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="ค้นหารหัส หรือชื่อตำแหน่ง..."
                        className="w-64"
                    />

                    <Button
                        onClick={handleOpenCreate}
                        variant={'green'}
                        className="px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-emerald-600 hover:bg-emerald-700"
                    >
                        + เพิ่มตำแหน่งจัดเก็บ
                    </Button>
                </div>
            </div>

            {/* Table Card */}
            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <CardContent className="p-0 w-full overflow-x-auto">
                    <Table className="w-full">
                        <TableHeader className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead
                                        key={col.key}
                                        className={`${col.width || ''} ${col.align || 'text-left'} font-semibold text-zinc-700 dark:text-zinc-300 py-3.5 px-4`}
                                    >
                                        <Label className="cursor-pointer">{col.label}</Label>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {loading ? (
                                <TableRow key="loading">
                                    <TableCell colSpan={columns.length} className="h-40 text-center text-zinc-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            <span>กำลังโหลดข้อมูลตำแหน่งจัดเก็บ...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedLocations.length === 0 ? (
                                <TableRow key="no-data">
                                    <TableCell colSpan={columns.length} className="h-40 text-center text-zinc-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <p className="text-zinc-500 dark:text-zinc-400">
                                                {search || selectedWarehouse
                                                    ? 'ไม่พบข้อมูลตำแหน่งจัดเก็บที่ตรงกับเงื่อนไขการค้นหา'
                                                    : 'ยังไม่มีข้อมูลตำแหน่งจัดเก็บในระบบ'}
                                            </p>
                                            {!search && !selectedWarehouse && (
                                                <Button
                                                    onClick={handleOpenCreate}
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-2 text-xs"
                                                >
                                                    + เพิ่มตำแหน่งจัดเก็บแรก
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedLocations.map((loc) => {
                                    const whId = loc.warehouseId ?? loc.WarehouseId;
                                    return (
                                        <TableRow
                                            key={loc.id}
                                            className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                                        >
                                            {/* Warehouse */}
                                            <TableCell className="py-3 px-4">
                                                {getWarehouseDisplay(whId)}
                                            </TableCell>

                                            {/* Location Code */}
                                            <TableCell className="py-3 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                                                {loc.code || '-'}
                                            </TableCell>

                                            {/* Location Name */}
                                            <TableCell className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                                                {loc.name || '-'}
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell className="py-3 px-4">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                        loc.isActive !== false
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                                                    }`}
                                                >
                                                    {loc.isActive !== false
                                                        ? t.common.active || 'เปิดใช้งาน'
                                                        : t.common.inactive || 'ปิดใช้งาน'}
                                                </span>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleOpenEdit(loc)}
                                                        className="h-8 px-2.5 rounded-lg border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                                        title="แก้ไขข้อมูล"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5 mr-1" />
                                                        แก้ไข
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDelete(loc)}
                                                        className="h-8 px-2.5 rounded-lg border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                        title="ลบข้อมูล"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                        ลบ
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

                {/* Pagination Section (Shadcn UI) */}
                <TablePagination
                    currentPage={safeCurrentPage}
                    pageSize={pageSize}
                    totalItems={locationList.length}
                    filteredCount={filteredLocations.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                    }}
                    loading={loading}
                />
            </Card>

            {/* Create / Edit Modal */}
            <CreateLocationModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSaved={fetchLocations}
                dataEdit={editingLocation}
                defaultWarehouseId={selectedWarehouse}
                warehouseList={warehouseList}
            />
        </AppLayout>
    );
}
