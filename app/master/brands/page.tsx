'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { SearchInput } from '@/app/components/ui/SearchInput';
import { useI18n, useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import type { MastBrand } from '@/lib/types';
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
import { CreateBrandModal } from '@/app/components/modal/CreateBrandModal';
import Swal from 'sweetalert2';

export default function BrandsPage() {
    const { t } = useI18n();
    const { pageTitle } = useLayout();

    // State
    const [brandList, setBrandList] = useState<MastBrand[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<MastBrand | null>(null);

    // Fetch brands from C# API (stock-api: /api/MastBrand/list)
    const fetchBrands = useCallback(async () => {
        setLoading(true);
        try {
            const res = await masterService.brands.list({ search });
            if (res && res.success) {
                const data = Array.isArray(res.results)
                    ? res.results
                    : Array.isArray(res.data)
                    ? res.data
                    : [];
                setBrandList(data);
            } else {
                setBrandList([]);
            }
        } catch (error) {
            console.error('Failed to fetch brands:', error);
            setBrandList([]);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchBrands();
    }, [fetchBrands]);

    const filteredBrands = useMemo(() => {
        if (!search.trim()) return brandList;
        const q = search.toLowerCase();
        return brandList.filter(
            (b) =>
                b.nameTh?.toLowerCase().includes(q) ||
                b.nameEn?.toLowerCase().includes(q)
        );
    }, [brandList, search]);

    // Pagination Calculations
    const totalPages = Math.max(1, Math.ceil(filteredBrands.length / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedBrands = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filteredBrands.slice(startIndex, startIndex + pageSize);
    }, [filteredBrands, safeCurrentPage, pageSize]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setCurrentPage(1);
    };

    const handleOpenCreate = () => {
        setEditingBrand(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (brand: MastBrand) => {
        setEditingBrand({ ...brand });
        setIsModalOpen(true);
    };

    const handleDelete = async (brand: MastBrand) => {
        const confirmResult = await Swal.fire({
            title: 'ยืนยันการลบข้อมูล',
            text: `คุณต้องการลบข้อมูลแบรนด์ "${brand.nameTh || brand.nameEn}" หรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ใช่, ต้องการลบ',
            cancelButtonText: 'ยกเลิก',
        });

        if (confirmResult.isConfirmed) {
            try {
                const targetId = brand.id;
                const res = await masterService.brands.remove(targetId);

                if (res.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'ลบข้อมูลสำเร็จ',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    fetchBrands();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'ลบข้อมูลไม่สำเร็จ',
                        text: res.error || res.message || 'เกิดข้อผิดพลาดในการลบข้อมูล',
                    });
                }
            } catch (error: unknown) {
                console.error('Delete brand error:', error);
                const err = error as { message?: string };
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: err.message || 'ไม่สามารถลบข้อมูลแบรนด์ได้',
                });
            }
        }
    };

    const columns = [
        { Name: 'ชื่อแบรนด์ (ไทย)', key: 'nameTh', width: '40%' },
        { Name: 'Brand Name (EN)', key: 'nameEn', width: '40%' },
        { Name: 'สถานะ', key: 'isActive', width: '120px' },
    ];

    return (
        <AppLayout>
            {/* Header Section */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'จัดการข้อมูลแบรนด์สินค้า'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        จัดการข้อมูลแบรนด์และยี่ห้อสินค้าทั้งหมดในระบบ (Brand Management)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <SearchInput
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="ค้นหาชื่อแบรนด์..."
                        className="w-64"
                    />
                    <Button
                        onClick={handleOpenCreate}
                        variant={'green'}
                        className="px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-emerald-600 hover:bg-emerald-700"
                    >
                        + เพิ่มแบรนด์ใหม่
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
                            {!loading && paginatedBrands && paginatedBrands.length > 0 ? (
                                paginatedBrands.map((brand, indexKey) => (
                                    <TableRow
                                        key={brand.id || indexKey}
                                        className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                                    >
                                        <TableCell className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {brand.nameTh || '-'}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                            {brand.nameEn || '-'}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm">
                                            {brand.isActive !== false ? (
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
                                                    onClick={() => handleOpenEdit(brand)}
                                                    className="h-8 px-2.5 text-xs rounded-lg border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                >
                                                    {t.common.edit}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={'destructive'}
                                                    onClick={() => handleDelete(brand)}
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
                                                <span className="text-sm">กำลังโหลดข้อมูลแบรนด์...</span>
                                            </div>
                                        ) : (
                                            <div className="py-6 text-zinc-400">
                                                {search ? 'ไม่พบข้อมูลแบรนด์ที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลแบรนด์ในระบบ'}
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
                    totalItems={brandList.length}
                    filteredCount={filteredBrands.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                    }}
                    loading={loading}
                />
            </Card>

            {/* Create / Edit Brand Modal */}
            <CreateBrandModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSaved={fetchBrands}
                dataEdit={editingBrand}
            />
        </AppLayout>
    );
}
