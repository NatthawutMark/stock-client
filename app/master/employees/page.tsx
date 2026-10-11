'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { SearchInput } from '@/app/components/ui/SearchInput';
import { useI18n, useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import type { MastEmployee } from '@/lib/types';
import { employees as mockEmployees } from '@/lib/mock/data';
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
import { CreateEmployeeModal } from '@/app/components/modal/CreateEmployeeModal';
import Swal from 'sweetalert2';

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

    // Fetch employees from C# API (stock-api: /api/MastEmployee/list) or mock fallback
    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const res = await masterService.employees.list({ search });
            if (res && res.success) {
                const data = Array.isArray(res.results)
                    ? res.results
                    : Array.isArray(res.data)
                    ? res.data
                    : [];
                if (data.length > 0) {
                    setEmployeeList(data);
                } else {
                    setEmployeeList(mockEmployees);
                }
            } else {
                setEmployeeList(mockEmployees);
            }
        } catch (error) {
            console.error('Failed to fetch employees:', error);
            setEmployeeList(mockEmployees);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchEmployees();
    }, [fetchEmployees]);

    // Client-side search filtering
    const filteredEmployees = useMemo(() => {
        if (!search.trim()) return employeeList;
        const q = search.toLowerCase();
        return employeeList.filter((e) => {
            const code = (e.empCode || e.emp_code || e.EMP_CODE || '').toLowerCase();
            const fName = (e.fName || e.f_name || e.F_NAME || '').toLowerCase();
            const lName = (e.lName || e.l_name || e.L_NAME || '').toLowerCase();
            const fullName = `${fName} ${lName}`.trim();
            const tel = (e.tel || e.TEL || '').toLowerCase();
            const pos = (e.position || '').toLowerCase();
            const dept = (e.department || '').toLowerCase();

            return (
                code.includes(q) ||
                fullName.includes(q) ||
                fName.includes(q) ||
                lName.includes(q) ||
                tel.includes(q) ||
                pos.includes(q) ||
                dept.includes(q)
            );
        });
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
        const code = emp.empCode || emp.emp_code || emp.EMP_CODE || '';
        const name = `${emp.fName || emp.f_name || emp.F_NAME || ''} ${emp.lName || emp.l_name || emp.L_NAME || ''}`.trim();

        const confirmResult = await Swal.fire({
            title: 'ยืนยันการลบข้อมูล',
            text: `คุณต้องการลบข้อมูลพนักงาน "${name} (${code})" หรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ใช่, ต้องการลบ',
            cancelButtonText: 'ยกเลิก',
        });

        if (confirmResult.isConfirmed) {
            try {
                const targetId = emp.id || code;
                let isDeleted = false;

                try {
                    const res = await masterService.employees.remove(targetId);
                    if (res && res.success) {
                        isDeleted = true;
                    }
                } catch {
                    // Fallback to local deletion
                    isDeleted = true;
                }

                // Remove from mock list
                const idx = mockEmployees.findIndex((e) => String(e.id) === String(emp.id) || e.empCode === code);
                if (idx !== -1) {
                    mockEmployees.splice(idx, 1);
                    isDeleted = true;
                }

                if (isDeleted) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'ลบข้อมูลสำเร็จ',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    fetchEmployees();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'ลบข้อมูลไม่สำเร็จ',
                        text: 'เกิดข้อผิดพลาดในการลบข้อมูลพนักงาน',
                    });
                }
            } catch (error: unknown) {
                console.error('Delete employee error:', error);
                const err = error as { message?: string };
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: err.message || 'ไม่สามารถลบข้อมูลพนักงานได้',
                });
            }
        }
    };

    const columns = [
        { Name: 'รหัสพนักงาน', key: 'empCode', width: '150px' },
        { Name: 'ชื่อพนักงาน', key: 'fName', width: '180px' },
        { Name: 'นามสกุล', key: 'lName', width: '180px' },
        { Name: 'เบอร์โทรศัพท์', key: 'tel', width: '150px' },
        { Name: 'ตำแหน่ง / แผนก', key: 'position', width: 'auto' },
        { Name: 'สถานะ', key: 'isActive', width: '110px' },
    ];

    return (
        <AppLayout>
            {/* Header Section */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'จัดการข้อมูลพนักงาน'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        จัดการข้อมูลพนักงานและเจ้าหน้าที่ทั้งหมดในระบบ (Employee Management)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <SearchInput
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="ค้นหารหัส, ชื่อพนักงาน..."
                        className="w-64"
                    />
                    <Button
                        onClick={handleOpenCreate}
                        variant={'green'}
                        className="px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-emerald-600 hover:bg-emerald-700"
                    >
                        + เพิ่มพนักงานใหม่
                    </Button>
                </div>
            </div>

            {/* Employee Table Card */}
            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <CardContent className="p-0 w-full overflow-x-auto">
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
                                paginatedEmployees.map((emp, indexKey) => {
                                    const code = emp.empCode || emp.emp_code || emp.EMP_CODE || '-';
                                    const fName = emp.fName || emp.f_name || emp.F_NAME || '-';
                                    const lName = emp.lName || emp.l_name || emp.L_NAME || '-';
                                    const tel = emp.tel || emp.TEL || '-';
                                    const pos = emp.position || '';
                                    const dept = emp.department || '';
                                    const posDept = [pos, dept].filter(Boolean).join(' - ') || '-';

                                    return (
                                        <TableRow
                                            key={emp.id || indexKey}
                                            className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                                        >
                                            <TableCell className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                                                {code}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                {fName}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                {lName}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                {tel}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                {posDept}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm">
                                                {emp.isActive !== false ? (
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
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length + 1} className="text-center py-12 text-zinc-500">
                                        {loading ? (
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                <span className="text-sm">กำลังโหลดข้อมูลพนักงาน...</span>
                                            </div>
                                        ) : (
                                            <div className="py-6 text-zinc-400">
                                                {search ? 'ไม่พบข้อมูลพนักงานที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลพนักงานในระบบ'}
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
