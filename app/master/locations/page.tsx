'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
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
    SearchInput,
} from '@/components/ui';
import { CreateLocationModal } from '@/components/modal/CreateLocationModal';
import { extractList, confirmDelete } from '@/lib/utils';
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
                setWarehouseList(extractList<MastWarehouse>(res));
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
                warehouseId: selectedWarehouse || undefined,
            });
            setLocationList(extractList<MastLocation>(res));
        } catch (error) {
            console.error('Failed to fetch locations:', error);
            setLocationList([]);
        } finally {
            setLoading(false);
        }
    }, [selectedWarehouse]);

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
            const whId = loc.warehouseId;
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
        if (!loc.id) return;
        const locId = loc.id;
        await confirmDelete({
            text: `คุณต้องการลบข้อมูลตำแหน่งจัดเก็บ "${loc.name || loc.code}" หรือไม่?`,
            onDelete: () => masterService.locations.remove(locId),
            onSuccess: fetchLocations,
            errorFallback: 'ไม่สามารถลบข้อมูลตำแหน่งจัดเก็บได้',
        });
    };

    const getWarehouseDisplay = (whId?: number | string) => {
        const idStr = whId !== undefined && whId !== null ? String(whId) : '';
        const mapped = warehouseList.find((w) => String(w.id) === idStr);
        if (mapped) {
            return (
                <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 max-w-full"
                >
                    <Building2 className="w-3 h-3 shrink-0" />
                    <span className="break-words">{mapped.warehouseName} {mapped.code ? `(${mapped.code})` : ''}</span>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 max-w-full">
                <Building2 className="w-3 h-3 shrink-0" />
                <span>{whId ? `คลัง #${whId}` : '-'}</span>
            </span>
        );
    };

    const renderStatusBadge = (isActive?: boolean) => (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                isActive !== false
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
        >
            {isActive !== false
                ? t.common.active || 'เปิดใช้งาน'
                : t.common.inactive || 'ปิดใช้งาน'}
        </span>
    );

    const renderActionButtons = (loc: MastLocation) => (
        <>
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
        </>
    );

    const renderLoadingState = () => (
        <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>กำลังโหลดข้อมูลตำแหน่งจัดเก็บ...</span>
        </div>
    );

    const renderEmptyState = () => (
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
    );

    return (
        <AppLayout>
            {/* Header Section */}
            <div className="mb-4 sm:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'จัดการข้อมูลตำแหน่งจัดเก็บ'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        จัดการข้อมูลตำแหน่งจัดเก็บสินค้าในคลัง (Location / Bin Management)
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
                    {/* Warehouse Filter Dropdown */}
                    <select
                        value={selectedWarehouse}
                        onChange={(e) => handleWarehouseFilterChange(e.target.value)}
                        className="w-full sm:w-auto h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
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
                        className="w-full sm:w-64"
                    />

                    <Button
                        onClick={handleOpenCreate}
                        variant={'green'}
                        className="w-full sm:w-auto justify-center px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-emerald-600 hover:bg-emerald-700"
                    >
                        + เพิ่มตำแหน่งจัดเก็บ
                    </Button>
                </div>
            </div>

            {/* Table Card */}
            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <CardContent className="p-0 w-full">
                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                        {loading ? (
                            <div className="py-12 px-4 text-center text-zinc-500">
                                {renderLoadingState()}
                            </div>
                        ) : paginatedLocations.length === 0 ? (
                            <div className="py-12 px-4 text-center text-zinc-500">
                                {renderEmptyState()}
                            </div>
                        ) : (
                            paginatedLocations.map((loc) => (
                                <div key={loc.id} className="p-4 space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400 break-all">
                                                {loc.code || '-'}
                                            </div>
                                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 break-words mt-0.5">
                                                {loc.name || '-'}
                                            </div>
                                        </div>
                                        <div className="shrink-0">{renderStatusBadge(loc.isActive)}</div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                        <span className="text-zinc-400 dark:text-zinc-500">คลังสินค้า:</span>
                                        {getWarehouseDisplay(loc.warehouseId)}
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2.5 mt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                                        {renderActionButtons(loc)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block w-full">
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
                                            {renderLoadingState()}
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedLocations.length === 0 ? (
                                    <TableRow key="no-data">
                                        <TableCell colSpan={columns.length} className="h-40 text-center text-zinc-500">
                                            {renderEmptyState()}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedLocations.map((loc) => (
                                        <TableRow
                                            key={loc.id}
                                            className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                                        >
                                            {/* Warehouse */}
                                            <TableCell className="py-3 px-4">
                                                {getWarehouseDisplay(loc.warehouseId)}
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
                                                {renderStatusBadge(loc.isActive)}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {renderActionButtons(loc)}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
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
                onOpenChange={(open) => {
                    setIsModalOpen(open);
                    if (!open) setEditingLocation(null);
                }}
                onSaved={fetchLocations}
                dataEdit={editingLocation}
                defaultWarehouseId={selectedWarehouse}
                warehouseList={warehouseList}
            />
        </AppLayout>
    );
}
