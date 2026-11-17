'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useI18n, useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import type { MastVendor } from '@/lib/types';
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
import { CreateVendorModal } from '@/components/modal/CreateVendorModal';
import { extractList, confirmDelete } from '@/lib/utils';

export default function VendorsPage() {
    const { t } = useI18n();
    const { pageTitle } = useLayout();

    // State
    const [vendorList, setVendorList] = useState<MastVendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<MastVendor | null>(null);

    // Fetch vendors from C# API (stock-api: /api/MastVendor/list)
    const fetchVendors = useCallback(async () => {
        setLoading(true);
        try {
            const res = await masterService.vendors.list();
            setVendorList(extractList<MastVendor>(res));
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
            setVendorList([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchVendors();
    }, [fetchVendors]);

    const filteredVendors = useMemo(() => {
        if (!search.trim()) return vendorList;
        const q = search.toLowerCase();
        return vendorList.filter(
            (v) =>
                v.vendCode?.toLowerCase().includes(q) ||
                v.vendName?.toLowerCase().includes(q) ||
                v.contactName?.toLowerCase().includes(q) ||
                v.tel?.toLowerCase().includes(q) ||
                v.address?.toLowerCase().includes(q) ||
                v.remark?.toLowerCase().includes(q)
        );
    }, [vendorList, search]);

    // Pagination Calculations
    const totalPages = Math.max(1, Math.ceil(filteredVendors.length / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedVendors = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filteredVendors.slice(startIndex, startIndex + pageSize);
    }, [filteredVendors, safeCurrentPage, pageSize]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setCurrentPage(1);
    };

    const handleOpenCreate = () => {
        setEditingVendor(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (v: MastVendor) => {
        setEditingVendor({ ...v });
        setIsModalOpen(true);
    };

    const handleDelete = async (v: MastVendor) => {
        if (!v.id) return;
        const vendId = v.id;
        await confirmDelete({
            text: `คุณต้องการลบข้อมูลผู้จำหน่าย "${v.vendName} (${v.vendCode})" หรือไม่?`,
            onDelete: () => masterService.vendors.remove(vendId),
            onSuccess: fetchVendors,
            errorFallback: 'ไม่สามารถลบข้อมูลผู้จำหน่ายได้',
        });
    };

    const columns = [
        { Name: 'รหัสผู้จำหน่าย', key: 'vendCode', width: '150px' },
        { Name: 'ชื่อผู้จำหน่าย / บริษัท', key: 'vendName', width: '240px' },
        { Name: 'ชื่อผู้ติดต่อ', key: 'contactName', width: '180px' },
        { Name: 'เบอร์โทรศัพท์', key: 'tel', width: '140px' },
        { Name: 'ที่อยู่', key: 'address', width: 'auto' },
        { Name: 'หมายเหตุ', key: 'remark', width: '160px' },
        { Name: 'สถานะ', key: 'isActive', width: '110px' },
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

    const renderActionButtons = (v: MastVendor) => (
        <>
            <Button
                size="sm"
                variant={'outline'}
                onClick={() => handleOpenEdit(v)}
                className="h-8 px-2.5 text-xs rounded-lg border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
                {t.common.edit}
            </Button>
            <Button
                size="sm"
                variant={'destructive'}
                onClick={() => handleDelete(v)}
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
                <span className="text-sm">กำลังโหลดข้อมูลผู้จำหน่าย...</span>
            </div>
        ) : (
            <div className="py-6 text-zinc-400">
                {search ? 'ไม่พบข้อมูลผู้จำหน่ายที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลผู้จำหน่ายในระบบ'}
            </div>
        );

    return (
        <AppLayout>
            {/* Header Section */}
            <div className="mb-4 sm:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'จัดการข้อมูลผู้จำหน่าย'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        จัดการข้อมูลผู้จำหน่ายและคู่ค้าทั้งหมดในระบบ (Vendor / Supplier Management)
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
                    <SearchInput
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="ค้นหารหัส, ชื่อผู้จำหน่าย..."
                        className="w-full sm:w-64"
                    />
                    <Button
                        onClick={handleOpenCreate}
                        variant={'green'}
                        className="w-full sm:w-auto justify-center px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-emerald-600 hover:bg-emerald-700"
                    >
                        + เพิ่มผู้จำหน่ายใหม่
                    </Button>
                </div>
            </div>

            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <CardContent className="p-0 w-full">
                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                        {!loading && paginatedVendors && paginatedVendors.length > 0 ? (
                            paginatedVendors.map((v, indexKey) => (
                                <div key={v.id || indexKey} className="p-4 space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400 break-all">
                                                {v.vendCode || '-'}
                                            </div>
                                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 break-words mt-0.5">
                                                {v.vendName || '-'}
                                            </div>
                                        </div>
                                        <div className="shrink-0">{renderStatusBadge(v.isActive)}</div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                                        <div className="min-w-0">
                                            <span className="text-zinc-400 dark:text-zinc-500">ชื่อผู้ติดต่อ: </span>
                                            <span className="break-words">{v.contactName || '-'}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-zinc-400 dark:text-zinc-500">เบอร์โทรศัพท์: </span>
                                            <span className="break-words">{v.tel || '-'}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-zinc-400 dark:text-zinc-500">ที่อยู่: </span>
                                            <span className="break-words">{v.address || '-'}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-zinc-400 dark:text-zinc-500">หมายเหตุ: </span>
                                            <span className="break-words">{v.remark || '-'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2.5 mt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                                        {renderActionButtons(v)}
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
                                {!loading && paginatedVendors && paginatedVendors.length > 0 ? (
                                    paginatedVendors.map((v, indexKey) => (
                                        <TableRow
                                            key={v.id || indexKey}
                                            className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                                        >
                                            <TableCell className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                                                {v.vendCode || '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                {v.vendName || '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                {v.contactName || '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                {v.tel || '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate" title={v.address}>
                                                {v.address || '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 max-w-[160px] truncate" title={v.remark}>
                                                {v.remark || '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm">
                                                {renderStatusBadge(v.isActive)}
                                            </TableCell>

                                            <TableCell key={'action'} className="text-right px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {renderActionButtons(v)}
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
                    totalItems={vendorList.length}
                    filteredCount={filteredVendors.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                    }}
                    loading={loading}
                />
            </Card>

            {/* Create / Edit Vendor Modal */}
            <CreateVendorModal
                open={isModalOpen}
                onOpenChange={(open) => {
                    setIsModalOpen(open);
                    if (!open) setEditingVendor(null);
                }}
                onSaved={fetchVendors}
                dataEdit={editingVendor}
            />
        </AppLayout>
    );
}
