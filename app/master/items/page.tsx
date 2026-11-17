'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
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
    SearchInput,
} from '@/components/ui';
import { CreateItemModal } from '@/components/modal/CreateItemModal';
import { extractList, confirmDelete } from '@/lib/utils';

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
            const res = await masterService.items.list();
            setListItems(extractList<MastItem>(res));
        } catch (error) {
            console.error('Failed to fetch items:', error);
            setListItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

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
        if (!item.id) return;
        const itemId = item.id;
        await confirmDelete({
            text: `คุณต้องการลบสินค้า "${item.itemName} (${item.itemCode})" หรือไม่?`,
            onDelete: () => masterService.items.remove(itemId),
            onSuccess: fetchItems,
            errorFallback: 'ไม่สามารถลบข้อมูลสินค้าได้',
        });
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

    const renderStatusBadge = (isActive?: boolean) =>
        isActive !== false ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {t.common.active}
            </span>
        ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                {t.common.inactive}
            </span>
        );

    const renderLotSerialBadges = (item: MastItem) => (
        <div className="flex items-center gap-1.5 flex-wrap">
            {item.isLotNo ? (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium">
                    LOT
                </span>
            ) : null}
            {item.isSerialNo ? (
                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-medium">
                    SN
                </span>
            ) : null}
            {!item.isLotNo && !item.isSerialNo ? (
                <span className="text-zinc-400">-</span>
            ) : null}
        </div>
    );

    const renderActionButtons = (item: MastItem) => (
        <>
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
        </>
    );

    const renderStatusState = () =>
        loading ? (
            <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">กำลังโหลดข้อมูลสินค้า...</span>
            </div>
        ) : (
            <div className="py-6 text-zinc-400">
                {search ? 'ไม่พบข้อมูลสินค้าที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลสินค้าในระบบ'}
            </div>
        );

    return (
        <AppLayout>
            {/* Header Section */}
            <div className="mb-4 sm:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'จัดการข้อมูลสินค้า'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        จัดการข้อมูลรหัสสินค้าทั้งหมดในระบบ (Item Master Management)
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
                    <SearchInput
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="ค้นหารหัส, ชื่อสินค้า, แบรนด์..."
                        className="w-full sm:w-64"
                    />
                    <Button
                        onClick={handleOpenCreate}
                        variant={'green'}
                        className="w-full sm:w-auto justify-center px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-emerald-600 hover:bg-emerald-700"
                    >
                        + สร้างสินค้าใหม่
                    </Button>
                </div>
            </div>

            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <CardContent className="p-0 w-full">
                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                        {!loading && paginatedItems && paginatedItems.length > 0 ? (
                            paginatedItems.map((item, indexKey) => (
                                <div key={item.id || indexKey} className="p-4 space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400 break-all">
                                                {item.itemCode || '-'}
                                            </div>
                                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 break-words mt-0.5">
                                                {item.itemName || '-'}
                                            </div>
                                        </div>
                                        <div className="shrink-0">{renderStatusBadge(item.isActive)}</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                                        <div className="min-w-0">
                                            <span className="text-zinc-400 dark:text-zinc-500">{t.master.item.brand}: </span>
                                            <span className="text-zinc-700 dark:text-zinc-300 break-words">{item.brandName || '-'}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-zinc-400 dark:text-zinc-500">{t.master.item.uom}: </span>
                                            <span className="text-zinc-700 dark:text-zinc-300 break-words">{item.uomName || '-'}</span>
                                        </div>
                                        <div className="col-span-2 min-w-0">
                                            <span className="text-zinc-400 dark:text-zinc-500">{t.master.item.location}: </span>
                                            <span className="text-zinc-700 dark:text-zinc-300 break-words">{item.locationName || '-'}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-zinc-400 dark:text-zinc-500">{t.master.item.buyPrice}: </span>
                                            <span className="font-mono text-zinc-700 dark:text-zinc-300">
                                                {Number(item.buyPrice || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-zinc-400 dark:text-zinc-500">{t.master.item.sellPrice}: </span>
                                            <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                                {Number(item.sellPrice || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                                            <span className="text-zinc-400 dark:text-zinc-500">Lot / Serial:</span>
                                            {renderLotSerialBadges(item)}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2.5 mt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                                        {renderActionButtons(item)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 px-4 text-zinc-500">
                                {renderStatusState()}
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block w-full">
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
                                                {renderLotSerialBadges(item)}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm">
                                                {renderStatusBadge(item.isActive)}
                                            </TableCell>

                                            <TableCell key={'action'} className="text-right px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {renderActionButtons(item)}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length + 1} className="text-center py-12 text-zinc-500">
                                            {renderStatusState()}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
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
                onOpenChange={(open) => {
                    setIsCreateModalOpen(open);
                    if (!open) setEditingItem(null);
                }}
                onSaved={fetchItems}
                dataEdit={editingItem}
            />
        </AppLayout>
    );
}
