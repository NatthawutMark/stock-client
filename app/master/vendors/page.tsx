'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { SearchInput } from '@/app/components/ui/SearchInput';
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
} from '@/components/ui';
import { CreateVendorModal } from '@/app/components/modal/CreateVendorModal';
import Swal from 'sweetalert2';

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
            const res = await masterService.vendors.list({ search });
            if (res && res.success) {
                const data = Array.isArray(res.results)
                    ? res.results
                    : Array.isArray(res.data)
                    ? res.data
                    : [];
                setVendorList(data);
            } else {
                setVendorList([]);
            }
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
            setVendorList([]);
        } finally {
            setLoading(false);
        }
    }, [search]);

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
                v.tel?.toLowerCase().includes(q)
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
        const confirmResult = await Swal.fire({
            title: 'ยืนยันการลบข้อมูล',
            text: `คุณต้องการลบข้อมูลผู้จำหน่าย "${v.vendName} (${v.vendCode})" หรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ใช่, ต้องการลบ',
            cancelButtonText: 'ยกเลิก',
        });

        if (confirmResult.isConfirmed) {
            try {
                const targetId = v.id;
                const res = await masterService.vendors.remove(targetId);

                if (res.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'ลบข้อมูลสำเร็จ',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    fetchVendors();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'ลบข้อมูลไม่สำเร็จ',
                        text: res.error || res.message || 'เกิดข้อผิดพลาดในการลบข้อมูล',
                    });
                }
            } catch (error: unknown) {
                console.error('Delete vendor error:', error);
                const err = error as { message?: string };
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: err.message || 'ไม่สามารถลบข้อมูลผู้จำหน่ายได้',
                });
            }
        }
    };

    const columns = [
        { Name: 'รหัสผู้จำหน่าย', key: 'vendCode', width: '150px' },
        { Name: 'ชื่อผู้จำหน่าย / บริษัท', key: 'vendName', width: '240px' },
        { Name: 'ชื่อผู้ติดต่อ', key: 'contactName', width: '180px' },
        { Name: 'เบอร์โทรศัพท์', key: 'tel', width: '140px' },
        { Name: 'ที่อยู่', key: 'address', width: 'auto' },
        { Name: 'สถานะ', key: 'isActive', width: '110px' },
    ];

    return (
        <AppLayout>
            {/* Header Section */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'จัดการข้อมูลผู้จำหน่าย'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        จัดการข้อมูลผู้จำหน่ายและคู่ค้าทั้งหมดในระบบ (Vendor / Supplier Management)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <SearchInput
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="ค้นหารหัส, ชื่อผู้จำหน่าย..."
                        className="w-64"
                    />
                    <Button
                        onClick={handleOpenCreate}
                        variant={'green'}
                        className="px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-emerald-600 hover:bg-emerald-700"
                    >
                        + เพิ่มผู้จำหน่ายใหม่
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
                                        <TableCell className="px-4 py-3 text-sm">
                                            {v.isActive !== false ? (
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
                                                <span className="text-sm">กำลังโหลดข้อมูลผู้จำหน่าย...</span>
                                            </div>
                                        ) : (
                                            <div className="py-6 text-zinc-400">
                                                {search ? 'ไม่พบข้อมูลผู้จำหน่ายที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลผู้จำหน่ายในระบบ'}
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
                onOpenChange={setIsModalOpen}
                onSaved={fetchVendors}
                dataEdit={editingVendor}
            />
        </AppLayout>
    );
}
