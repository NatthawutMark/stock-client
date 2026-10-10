'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { SearchInput } from '@/app/components/ui/SearchInput';
import { useI18n, useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import type { MastItem } from '@/lib/types';
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
import { CreateItemModal } from '@/app/components/modal/CreateItemModal';
import Swal from 'sweetalert2';

export default function MasterItemPage() {
    const { t } = useI18n();
    const { pageTitle } = useLayout();

    // State
    const [listItems, setListItems] = useState<MastItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modal State
    const [editingItem, setEditingItem] = useState<MastItem | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await masterService.items.list({ search });
            if (res && res.success) {
                const data = Array.isArray(res.results) ? res.results : Array.isArray(res.data)
                    ? res.data : [];
                setListItems(data);
            } else {
                setListItems([]);
            }
        } catch (error) {
            console.error('Failed to fetch items:', error);
            setListItems([]);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchItems();
    }, [fetchItems]);

    const filteredItems = useMemo(() => {
        if (!search.trim()) return listItems;
        const q = search.toLowerCase();
        return listItems.filter(
            (i) =>
                i.itemCode?.toLowerCase().includes(q) ||
                i.itemName?.toLowerCase().includes(q) ||
                i.brandName?.toLowerCase().includes(q) ||
                i.uomName?.toLowerCase().includes(q) ||
                i.locationName?.toLowerCase().includes(q)
        );
    }, [listItems, search]);

    // Pagination Calculations
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedItems = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filteredItems.slice(startIndex, startIndex + pageSize);
    }, [filteredItems, safeCurrentPage, pageSize]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setCurrentPage(1);
    };

    const handleOpenCreate = () => {
        setEditingItem(null);
        setIsCreateModalOpen(true);
    };

    const handleOpenEdit = (item: MastItem) => {
        setEditingItem({ ...item });
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (item: MastItem) => {
        const confirmResult = await Swal.fire({
            title: 'ยืนยันการลบข้อมูล',
            text: `คุณต้องการลบสินค้า "${item.itemName} (${item.itemCode})" หรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ใช่, ต้องการลบ',
            cancelButtonText: 'ยกเลิก',
        });

        if (confirmResult.isConfirmed) {
            try {
                const res = await masterService.items.remove(item.id);

                if (res.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'ลบข้อมูลสำเร็จ',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    fetchItems();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'ลบข้อมูลไม่สำเร็จ',
                        text: res.error || res.message || 'เกิดข้อผิดพลาดในการลบข้อมูล',
                    });
                }
            } catch (error: unknown) {
                console.error('Delete item error:', error);
                const err = error as { message?: string };
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: err.message || 'ไม่สามารถลบข้อมูลสินค้าได้',
                });
            }
        }
    };

    const columns = [
        { Name: t.master.item.itemCode, key: 'itemCode', width: '130px' },
        { Name: t.master.item.itemName, key: 'itemName', width: '220px' },
        { Name: t.master.item.brand, key: 'brandName', width: '130px' },
        { Name: t.master.item.uom, key: 'uomName', width: '90px' },
        { Name: t.master.item.location, key: 'locationName', width: '120px' },
        { Name: t.master.item.buyPrice, key: 'buyPrice', width: '100px' },
        { Name: t.master.item.sellPrice, key: 'sellPrice', width: '100px' },
        { Name: 'Lot / Serial', key: 'lotSerial', width: '120px' },
        { Name: t.common.active, key: 'isActive', width: '90px' },
    ];

    return (
        <AppLayout>
            {/* Header Section */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'จัดการข้อมูลสินค้า'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        จัดการข้อมูลรหัสสินค้าทั้งหมดในระบบ (Item Master Management)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <SearchInput
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="ค้นหารหัส, ชื่อสินค้า, แบรนด์..."
                        className="w-64"
                    />
                    <Button
                        onClick={handleOpenCreate}
                        variant={'green'}
                        className="px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-emerald-600 hover:bg-emerald-700"
                    >
                        + สร้างสินค้าใหม่
                    </Button>
                </div>
            </div>

            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <CardContent className="p-0 w-full overflow-x-auto">
                    <Table className="w-full">
                        <TableHeader className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                            <TableRow>
                                {columns.map((item) => (
                                    <TableHead
                                        className="font-semibold text-zinc-700 dark:text-zinc-300 py-3.5 px-4"
                                        style={{ width: item.width ?? 'auto' }}
                                        key={item.key}
                                    >
                                        <Label className="cursor-pointer">{item.Name}</Label>
                                    </TableHead>
                                ))}
                                <TableHead key={'action'} className="w-[160px] text-right font-semibold text-zinc-700 dark:text-zinc-300 py-3.5 px-4">
                                    {t.common.actions}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {!loading && paginatedItems && paginatedItems.length > 0 ? (
                                paginatedItems.map((item, indexKey) => (
                                    <TableRow
                                        key={item.id || indexKey}
                                        className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                                    >
                                        <TableCell className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                                            {item.itemCode || '-'}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {item.itemName || '-'}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                            {item.brandName || '-'}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                            {item.uomName || '-'}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                            {item.locationName || '-'}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm font-mono text-zinc-700 dark:text-zinc-300">
                                            {Number(item.buyPrice || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                            {Number(item.sellPrice || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-xs">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {item.isLotno || item.isLotNo ? (
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium">
                                                        LOT
                                                    </span>
                                                ) : null}
                                                {item.isSerialNo ? (
                                                    <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-medium">
                                                        SN
                                                    </span>
                                                ) : null}
                                                {!item.isLotno && !item.isLotNo && !item.isSerialNo ? (
                                                    <span className="text-zinc-400">-</span>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm">
                                            {item.isActive !== false ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                    {t.common.active}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                                    {t.common.inactive}
                                                </span>
                                            )}
                                        </TableCell>

                                        <TableCell key={'action'} className="text-right px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant={'outline'}
                                                    onClick={() => handleOpenEdit(item)}
                                                    className="h-8 px-2.5 text-xs rounded-lg border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                >
                                                    {t.common.edit}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={'destructive'}
                                                    onClick={() => handleDelete(item)}
                                                    className="h-8 px-2.5 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white"
                                                >
                                                    {t.common.delete}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length + 1} className="text-center py-12 text-zinc-500">
                                        {loading ? (
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                <span className="text-sm">กำลังโหลดข้อมูลสินค้า...</span>
                                            </div>
                                        ) : (
                                            <div className="py-6 text-zinc-400">
                                                {search ? 'ไม่พบข้อมูลสินค้าที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลสินค้าในระบบ'}
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

                {/* Pagination Section (Shadcn UI) */}
                <TablePagination
                    currentPage={safeCurrentPage}
                    pageSize={pageSize}
                    totalItems={listItems.length}
                    filteredCount={filteredItems.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                    }}
                    loading={loading}
                />
            </Card>

            {/* Create Item Modal */}
            <CreateItemModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onSaved={fetchItems}
                dataEdit={editingItem}
            />
        </AppLayout>
    );
}
