'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useI18n, useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import type { MastEmployee } from '@/lib/types';
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
import { CreateEmployeeModal } from '@/components/modal/CreateEmployeeModal';
import { extractList, confirmDelete } from '@/lib/utils';

export default function EmployeesPage() {
    const { t } = useI18n();
    const { pageTitle, setPageTitle } = useLayout();

    // State
    const [employeeList, setEmployeeList] = useState<MastEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<MastEmployee | null>(null);

    // Set page title
    useEffect(() => {
        setPageTitle('จัดการข้อมูลพนักงาน');
    }, [setPageTitle]);

    // Fetch employees from C# API (stock-api: /api/MastEmployee/list)
    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const res = await masterService.employees.list();
            setEmployeeList(extractList<MastEmployee>(res));
        } catch (error) {
            console.error('Failed to fetch employees:', error);
            setEmployeeList([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchEmployees();
    }, [fetchEmployees]);

    // Client-side search filtering
    const filteredEmployees = useMemo(() => {
        if (!search.trim()) return employeeList;
        const q = search.toLowerCase();
        return employeeList.filter(
            (e) =>
                e.empCode?.toLowerCase().includes(q) ||
                `${e.fName || ''} ${e.lName || ''}`.toLowerCase().includes(q) ||
                e.tel?.toLowerCase().includes(q) ||
                e.remark?.toLowerCase().includes(q)
        );
    }, [employeeList, search]);

    // Pagination Calculations
    const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedEmployees = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filteredEmployees.slice(startIndex, startIndex + pageSize);
    }, [filteredEmployees, safeCurrentPage, pageSize]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setCurrentPage(1);
    };

    const handleOpenCreate = () => {
        setEditingEmployee(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (emp: MastEmployee) => {
        setEditingEmployee({ ...emp });
        setIsModalOpen(true);
    };

    const handleDelete = async (emp: MastEmployee) => {
        if (!emp.id) return;
        const empId = emp.id;
        const name = `${emp.fName || ''} ${emp.lName || ''}`.trim();
        await confirmDelete({
            text: `คุณต้องการลบข้อมูลพนักงาน "${name} (${emp.empCode || ''})" หรือไม่?`,
            onDelete: () => masterService.employees.remove(empId),
            onSuccess: fetchEmployees,
            errorFallback: 'ไม่สามารถลบข้อมูลพนักงานได้',
        });
    };

    const columns = [
        { Name: 'รหัสพนักงาน', key: 'empCode', width: '150px' },
        { Name: 'ชื่อพนักงาน', key: 'fName', width: '180px' },
        { Name: 'นามสกุล', key: 'lName', width: '180px' },
        { Name: 'เบอร์โทรศัพท์', key: 'tel', width: '150px' },
        { Name: 'หมายเหตุ', key: 'remark', width: 'auto' },
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

    const renderActionButtons = (emp: MastEmployee) => (
        <>
            <Button
                variant={'outline'}
                size="sm"
                onClick={() => handleOpenEdit(emp)}
                className="h-8 px-2.5 text-xs rounded-lg border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
                {t.common.edit}
            </Button>
            <Button
                variant={'destructive'}
                size="sm"
                onClick={() => handleDelete(emp)}
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
                <span className="text-sm">กำลังโหลดข้อมูลพนักงาน...</span>
            </div>
        ) : (
            <div className="py-6 text-zinc-400">
                {search ? 'ไม่พบข้อมูลพนักงานที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลพนักงานในระบบ'}
            </div>
        );

    return (
        <AppLayout>
            {/* Header Section */}
            <div className="mb-4 sm:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'จัดการข้อมูลพนักงาน'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        จัดการข้อมูลพนักงานและเจ้าหน้าที่ทั้งหมดในระบบ (Employee Management)
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
                    <SearchInput
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="ค้นหารหัส, ชื่อพนักงาน..."
                        className="w-full sm:w-64"
                    />
                    <Button
                        onClick={handleOpenCreate}
                        variant={'green'}
                        className="w-full sm:w-auto justify-center px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-emerald-600 hover:bg-emerald-700"
                    >
                        + เพิ่มพนักงานใหม่
                    </Button>
                </div>
            </div>

            {/* Employee Table Card */}
            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <CardContent className="p-0 w-full">
                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                        {!loading && paginatedEmployees && paginatedEmployees.length > 0 ? (
                            paginatedEmployees.map((emp, indexKey) => {
                                const fullName = `${emp.fName || ''} ${emp.lName || ''}`.trim() || '-';
                                return (
                                    <div key={emp.id || indexKey} className="p-4 space-y-2.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400 break-all">
                                                    {emp.empCode || '-'}
                                                </div>
                                                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 break-words mt-0.5">
                                                    {fullName}
                                                </div>
                                            </div>
                                            <div className="shrink-0">{renderStatusBadge(emp.isActive)}</div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                                            {(emp.position || emp.department) && (
                                                <div className="min-w-0">
                                                    <span className="text-zinc-400 dark:text-zinc-500">ตำแหน่ง / แผนก: </span>
                                                    <span className="break-words">
                                                        {[emp.position, emp.department].filter(Boolean).join(' • ')}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <span className="text-zinc-400 dark:text-zinc-500">เบอร์โทรศัพท์: </span>
                                                <span className="break-words">{emp.tel || '-'}</span>
                                            </div>
                                            {emp.email && (
                                                <div className="min-w-0">
                                                    <span className="text-zinc-400 dark:text-zinc-500">อีเมล: </span>
                                                    <span className="break-all">{emp.email}</span>
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <span className="text-zinc-400 dark:text-zinc-500">หมายเหตุ: </span>
                                                <span className="break-words">{emp.remark || '-'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end gap-2 pt-2.5 mt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                                            {renderActionButtons(emp)}
                                        </div>
                                    </div>
                                );
                            })
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
                                            key={item.key}
                                            className="font-semibold text-zinc-700 dark:text-zinc-300 py-3.5 px-4"
                                            style={{ width: item.width ?? 'auto' }}
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
                                {!loading && paginatedEmployees && paginatedEmployees.length > 0 ? (
                                    paginatedEmployees.map((emp, indexKey) => (
                                        <TableRow
                                            key={emp.id || indexKey}
                                            className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                                        >
                                            <TableCell className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                                                {emp.empCode || '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                {emp.fName || '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                {emp.lName || '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                {emp.tel || '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                {emp.remark || '-'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm">
                                                {renderStatusBadge(emp.isActive)}
                                            </TableCell>
                                            <TableCell key={'action'} className="text-right px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {renderActionButtons(emp)}
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
                    totalItems={employeeList.length}
                    filteredCount={filteredEmployees.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                    }}
                    loading={loading}
                />
            </Card>

            {/* Create / Edit Employee Modal */}
            <CreateEmployeeModal
                open={isModalOpen}
                onOpenChange={(open) => {
                    setIsModalOpen(open);
                    if (!open) {
                        setEditingEmployee(null);
                    }
                }}
                onSaved={fetchEmployees}
                dataEdit={editingEmployee}
            />
        </AppLayout>
    );
}
