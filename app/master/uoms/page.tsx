'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useI18n, useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import type { MastUom } from '@/lib/types';
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
import { CreateUomModal } from '@/components/modal/CreateUomModal';
import { extractList, confirmDelete } from '@/lib/utils';

export default function UomsPage() {
    const { t } = useI18n();
    const { pageTitle } = useLayout();

    // State
    const [uomList, setUomList] = useState<MastUom[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUom, setEditingUom] = useState<MastUom | null>(null);

    // Fetch UOMs from C# API (stock-api: /api/MastUom/list)
    const fetchUoms = useCallback(async () => {
        setLoading(true);
        try {
            const res = await masterService.uoms.list();
            setUomList(extractList<MastUom>(res));
        } catch (error) {
            console.error('Failed to fetch UOMs:', error);
            setUomList([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchUoms();
    }, [fetchUoms]);

    const filteredUoms = useMemo(() => {
        if (!search.trim()) return uomList;
        const q = search.toLowerCase();
        return uomList.filter((u) => u.name?.toLowerCase().includes(q));
    }, [uomList, search]);

    // Pagination Calculations
    const totalPages = Math.max(1, Math.ceil(filteredUoms.length / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedUoms = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filteredUoms.slice(startIndex, startIndex + pageSize);
    }, [filteredUoms, safeCurrentPage, pageSize]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setCurrentPage(1);
    };

    const handleOpenCreate = () => {
        setEditingUom(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (uom: MastUom) => {
        setEditingUom({ ...uom });
        setIsModalOpen(true);
    };

    const handleDelete = async (uom: MastUom) => {
        if (!uom.id) return;
        const uomId = uom.id;
        await confirmDelete({
            text: `คุณต้องการลบข้อมูลหน่วยนับ "${uom.name}" หรือไม่?`,
            onDelete: () => masterService.uoms.remove(uomId),
            onSuccess: fetchUoms,
            errorFallback: 'ไม่สามารถลบข้อมูลหน่วยนับได้',
        });
    };

    const columns = [
        { Name: 'ชื่อหน่วยนับ (Unit of Measure)', key: 'name', width: 'auto' },
        { Name: 'สถานะ', key: 'isActive', width: '120px' },
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

    const renderActionButtons = (uom: MastUom) => (
        <>
            <Button
                size="sm"
                variant={'outline'}
                onClick={() => handleOpenEdit(uom)}
                className="h-8 px-2.5 text-xs rounded-lg border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
                {t.common.edit}
            </Button>
            <Button
                size="sm"
                variant={'destructive'}
                onClick={() => handleDelete(uom)}
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
                <span className="text-sm">กำลังโหลดข้อมูลหน่วยนับ...</span>
            </div>
        ) : (
            <div className="py-6 text-zinc-400">
                {search ? 'ไม่พบข้อมูลหน่วยนับที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลหน่วยนับในระบบ'}
            </div>
        );

    return (
        <AppLayout>
            {/* Header Section */}
            <div className="mb-4 sm:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'จัดการข้อมูลหน่วยนับ'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        จัดการข้อมูลหน่วยนับสินค้าทั้งหมดในระบบ (Unit of Measure Management)
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
                    <SearchInput
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="ค้นหาชื่อหน่วยนับ..."
                        className="w-full sm:w-64"
                    />
                    <Button
                        onClick={handleOpenCreate}
                        variant={'green'}
                        className="w-full sm:w-auto justify-center px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-emerald-600 hover:bg-emerald-700"
                    >
                        + เพิ่มหน่วยนับใหม่
                    </Button>
                </div>
            </div>

            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <CardContent className="p-0 w-full">
                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                        {!loading && paginatedUoms && paginatedUoms.length > 0 ? (
                            paginatedUoms.map((uom, indexKey) => (
                                <div key={uom.id || indexKey} className="p-4 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs text-zinc-400 dark:text-zinc-500">
                                                ชื่อหน่วยนับ
                                            </div>
                                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 break-words mt-0.5">
                                                {uom.name || '-'}
                                            </div>
                                        </div>
                                        <div className="shrink-0">{renderStatusBadge(uom.isActive)}</div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2.5 mt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                                        {renderActionButtons(uom)}
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
                                {!loading && paginatedUoms && paginatedUoms.length > 0 ? (
                                    paginatedUoms.map((uom, indexKey) => (
                                        <TableRow
                                            key={uom.id || indexKey}
                                            className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                                        >
                                            <TableCell className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                {uom.name || '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm">
                                                {renderStatusBadge(uom.isActive)}
                                            </TableCell>

                                            <TableCell key={'action'} className="text-right px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {renderActionButtons(uom)}
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
                    totalItems={uomList.length}
                    filteredCount={filteredUoms.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                    }}
                    loading={loading}
                />
            </Card>

            {/* Create / Edit UOM Modal */}
            <CreateUomModal
                open={isModalOpen}
                onOpenChange={(open) => {
                    setIsModalOpen(open);
                    if (!open) setEditingUom(null);
                }}
                onSaved={fetchUoms}
                dataEdit={editingUom}
            />
        </AppLayout>
    );
}
