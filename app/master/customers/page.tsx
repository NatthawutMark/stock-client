'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { SearchInput } from '@/app/components/ui/SearchInput';
import { useI18n, useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import type { MastCustomer } from '@/lib/types';
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
import { CreateCustomerModal } from '@/app/components/modal/CreateCustomerModal';
import Swal from 'sweetalert2';

export default function CustomersPage() {
    const { t } = useI18n();
    const { pageTitle } = useLayout();

    // State
    const [customerList, setCustomerList] = useState<MastCustomer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<MastCustomer | null>(null);

    // Fetch customers from C# API (stock-api: /api/MastCustomer/list)
    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await masterService.customers.list({ search });
            if (res && res.success) {
                const data = Array.isArray(res.results)
                    ? res.results
                    : Array.isArray(res.data)
                    ? res.data
                    : [];
                setCustomerList(data);
            } else {
                setCustomerList([]);
            }
        } catch (error) {
            console.error('Failed to fetch customers:', error);
            setCustomerList([]);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchCustomers();
    }, [fetchCustomers]);

    // Client-side search filtering
    const filteredCustomers = useMemo(() => {
        if (!search.trim()) return customerList;
        const q = search.toLowerCase();
        return customerList.filter(
            (c) =>
                c.custCode?.toLowerCase().includes(q) ||
                c.custName?.toLowerCase().includes(q) ||
                c.contactName?.toLowerCase().includes(q) ||
                c.tel?.toLowerCase().includes(q)
        );
    }, [customerList, search]);

    // Pagination Calculations
    const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedCustomers = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filteredCustomers.slice(startIndex, startIndex + pageSize);
    }, [filteredCustomers, safeCurrentPage, pageSize]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setCurrentPage(1);
    };

    const handleOpenCreate = () => {
        setEditingCustomer(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (customer: MastCustomer) => {
        setEditingCustomer({ ...customer });
        setIsModalOpen(true);
    };

    const handleDelete = async (customer: MastCustomer) => {
        const confirmResult = await Swal.fire({
            title: 'ยืนยันการลบข้อมูล',
            text: `คุณต้องการลบข้อมูลลูกค้า "${customer.custName} (${customer.custCode})" หรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ใช่, ต้องการลบ',
            cancelButtonText: 'ยกเลิก',
        });

        if (confirmResult.isConfirmed) {
            try {
                const targetId = customer.id || customer.custCode;
                const res = await masterService.customers.remove(targetId);

                if (res.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'ลบข้อมูลสำเร็จ',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    fetchCustomers();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'ลบข้อมูลไม่สำเร็จ',
                        text: res.error || res.message || 'เกิดข้อผิดพลาดในการลบข้อมูล',
                    });
                }
            } catch (error: unknown) {
                console.error('Delete customer error:', error);
                const err = error as { message?: string };
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: err.message || 'ไม่สามารถลบข้อมูลลูกค้าได้',
                });
            }
        }
    };

    const columns = [
        { Name: 'รหัสลูกค้า', key: 'custCode', width: '140px' },
        { Name: 'ชื่อลูกค้า / บริษัท', key: 'custName', width: '220px' },
        { Name: 'ผู้ติดต่อ', key: 'contactName', width: '160px' },
        { Name: 'เบอร์โทรศัพท์', key: 'tel', width: '140px' },
        { Name: 'ที่อยู่', key: 'address', width: 'auto' },
        { Name: 'หมายเหตุ', key: 'remark', width: '160px' },
        { Name: 'สถานะ', key: 'isActive', width: '110px' },
    ];

    return (
        <AppLayout>
            {/* Header Section */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'จัดการข้อมูลลูกค้า'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        จัดการข้อมูลลูกค้าทั้งหมดในระบบ (Customer Management)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <SearchInput
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="ค้นหารหัส, ชื่อ, ผู้ติดต่อ..."
                        className="w-64"
                    />
                    <Button
                        onClick={handleOpenCreate}
                        variant={'green'}
                        className="px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-emerald-600 hover:bg-emerald-700"
                    >
                        + สร้างลูกค้าใหม่
                    </Button>
                </div>
            </div>

            {/* Customer Table Card */}
            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <CardContent className="p-0 w-full overflow-x-auto">
                    <Table className="w-full">
                        <TableHeader className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead
                                        key={col.key}
                                        className="font-semibold text-zinc-700 dark:text-zinc-300 py-3.5 px-4"
                                        style={{ width: col.width }}
                                    >
                                        <Label className="cursor-pointer">{col.Name}</Label>
                                    </TableHead>
                                ))}
                                <TableHead key="actions" className="w-[160px] text-right font-semibold text-zinc-700 dark:text-zinc-300 py-3.5 px-4">
                                    {t.common.actions}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {!loading && paginatedCustomers && paginatedCustomers.length > 0 ? (
                                paginatedCustomers.map((customer, index) => (
                                    <TableRow
                                        key={customer.id ? String(customer.id) : index}
                                        className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                                    >
                                        <TableCell className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                                            {customer.custCode}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {customer.custName}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                            {customer.contactName || '-'}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                            {customer.tel || '-'}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 max-w-[240px] truncate" title={customer.address || ''}>
                                            {customer.address || '-'}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 max-w-[160px] truncate" title={customer.remark || ''}>
                                            {customer.remark || '-'}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm">
                                            {customer.isActive !== false ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                    {t.common.active}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                                    {t.common.inactive}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant={'outline'}
                                                    size="sm"
                                                    onClick={() => handleOpenEdit(customer)}
                                                    className="h-8 px-2.5 text-xs rounded-lg border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                >
                                                    {t.common.edit}
                                                </Button>
                                                <Button
                                                    variant={'destructive'}
                                                    size="sm"
                                                    onClick={() => handleDelete(customer)}
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
                                                <span className="text-sm">กำลังโหลดข้อมูลลูกค้า...</span>
                                            </div>
                                        ) : (
                                            <div className="py-6 text-zinc-400">
                                                {search ? 'ไม่พบข้อมูลลูกค้าที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลลูกค้าในระบบ'}
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
                    totalItems={customerList.length}
                    filteredCount={filteredCustomers.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                    }}
                    loading={loading}
                />
            </Card>

            {/* Add / Edit Customer Modal */}
            <CreateCustomerModal
                open={isModalOpen}
                onOpenChange={(open) => {
                    setIsModalOpen(open);
                    if (!open) {
                        setEditingCustomer(null);
                    }
                }}
                onSaved={fetchCustomers}
                dataEdit={editingCustomer}
            />
        </AppLayout>
    );
}
