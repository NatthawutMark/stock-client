'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { SearchInput } from '@/app/components/ui/SearchInput';
import { useI18n, useLayout } from '@/app/providers';
import { masterService } from '@/app/_services/master';
import type { MastDocType, MastTransType } from '@/lib/types';
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
import { CreateDocTypeModal } from '@/app/components/modal/CreateDocTypeModal';
import Swal from 'sweetalert2';
import { Layers, Pencil, Trash2 } from 'lucide-react';
import { SystemMenuService } from '@/app/_services/systemMenu';


export default function MasterDocTypePage() {
    const { t } = useI18n();
    const { pageTitle } = useLayout();

    const columns = [
        { key: 'transType', label: `${t.master.docType.transType}`, width: 'w-[260px]' },
        { key: 'name', label: `${t.master.docType.name}` },
        { key: 'status', label: `${t.common.status}`, width: 'w-[120px]' },
        { key: 'actions', label: `${t.common.actions}`, width: 'w-[150px]', align: 'text-right' },
    ];

    // State
    const [docTypeList, setDocTypeList] = useState<MastDocType[]>([]);
    const [transTypeList, setTransTypeList] = useState<{ id: number | string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedMenu, setselectedMenu] = useState<string>('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDocType, setEditingDocType] = useState<MastDocType | null>(null);

    // Fetch trans types for filter dropdown
    useEffect(() => {
        const fetchTransTypes = async () => {
            try {
                const res = await SystemMenuService.transactionList();
                if (res && res.success) {
                    const data = Array.isArray(res.results)
                        ? res.results
                        : Array.isArray(res.data)
                            ? res.data
                            : [];
                    if (data.length > 0) {
                        setTransTypeList(
                            data.map((item: MastTransType) => {
                                const id = item.id;
                                const name = item.menuName ??
                                    (item.nameTh && item.nameEn ? `${item.nameTh} (${item.nameEn})`
                                        : item.nameTh || item.name || `Type ${id}`);
                                return { id: String(id), name };
                            })
                        );
                    }
                }
            } catch (err) {
                console.error('Failed to load transaction types for filter:', err);
            }
        };
        fetchTransTypes();
    }, []);

    // Fetch document types from C# API (stock-api: /api/MastDocType/list)
    const fetchDocTypes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await masterService.docTypes.list({
                search,
                menuId: selectedMenu || undefined
            });
            if (res && res.success) {
                console.log('Fetched docTypes:', res);
                const data = Array.isArray(res.results) ? res.results : Array.isArray(res.data)
                    ? res.data : [];
                setDocTypeList(data);
            } else {
                setDocTypeList([]);
            }
        } catch (error) {
            console.error('Failed to fetch docTypes:', error);
            setDocTypeList([]);
        } finally {
            setLoading(false);
        }
    }, [search, selectedMenu]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchDocTypes();
    }, [fetchDocTypes]);

    // Client-side filtering as fallback/enhancement
    const filteredDocTypes = useMemo(() => {
        return docTypeList.filter((dt) => {
            const q = search.trim().toLowerCase();
            const docName = dt.docTypeName || dt.DocTypeName || dt.name || '';
            const transName = dt.menuName || dt.transName || dt.transTypeName || '';
            const dtMenuId = dt.menuId ?? dt.menuID ?? dt.transTypeId;
            const matchedTrans = transTypeList.find((tt) => String(tt.id) === String(dtMenuId))?.name || '';

            const matchesSearch =
                !q ||
                docName.toLowerCase().includes(q) ||
                transName.toLowerCase().includes(q) ||
                matchedTrans.toLowerCase().includes(q);

            const matchesTransType =
                !selectedMenu || String(dtMenuId) === selectedMenu;

            return matchesSearch && matchesTransType;
        });
    }, [docTypeList, search, selectedMenu, transTypeList]);

    // Pagination Calculations
    const totalPages = Math.max(1, Math.ceil(filteredDocTypes.length / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedDocTypes = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filteredDocTypes.slice(startIndex, startIndex + pageSize);
    }, [filteredDocTypes, safeCurrentPage, pageSize]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setCurrentPage(1);
    };

    const handleTransTypeFilterChange = (val: string) => {
        setselectedMenu(val);
        setCurrentPage(1);
    };

    const handleOpenCreate = () => {
        setEditingDocType(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (docType: MastDocType) => {
        setEditingDocType({ ...docType });
        setIsModalOpen(true);
    };

    const handleDelete = async (docType: MastDocType) => {
        const confirmResult = await Swal.fire({
            title: 'ยืนยันการลบข้อมูล',
            text: `คุณต้องการลบประเภทเอกสาร "${docType.docTypeName}" หรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ใช่, ต้องการลบ',
            cancelButtonText: 'ยกเลิก',
        });

        if (confirmResult.isConfirmed) {
            try {
                const targetId = docType.id;
                const res = await masterService.docTypes.remove(targetId);

                if (res.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'ลบข้อมูลสำเร็จ',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    fetchDocTypes();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'ลบข้อมูลไม่สำเร็จ',
                        text: res.error || res.message || 'เกิดข้อผิดพลาดในการลบข้อมูลประเภทเอกสาร',
                    });
                }
            } catch (error: unknown) {
                console.error('Delete docType error:', error);
                const err = error as { message?: string };
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: err.message || 'ไม่สามารถลบข้อมูลประเภทเอกสารได้',
                });
            }
        }
    };

    const getTransTypeDisplay = (menuId?: number | string, fallbackName?: string) => {
        const idStr = menuId !== undefined && menuId !== null ? String(menuId) : '';
        const mapped = transTypeList.find((tt) => String(tt.id) === idStr);
        if (mapped) {
            return (
                <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                >
                    <Layers className="w-3 h-3" />
                    {mapped.name}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                <Layers className="w-3 h-3" />
                {fallbackName || (menuId ? `Type ${menuId}` : '-')}
            </span>
        );
    };

    return (
        <AppLayout>
            {/* Header Section */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || t.master.docType.title || 'จัดการประเภทเอกสาร'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        จัดการประเภทเอกสารและผูกกับประเภทธุรกรรมของระบบ (DocType Master Management)
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* TransType Filter Dropdown */}
                    <select
                        value={selectedMenu}
                        onChange={(e) => handleTransTypeFilterChange(e.target.value)}
                        className="h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                    >
                        <option value="">ทุกประเภทธุรกรรม</option>
                        {transTypeList.map((tt) => (
                            <option key={tt.id} value={String(tt.id)}>
                                {tt.name}
                            </option>
                        ))}
                    </select>

                    <SearchInput
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="ค้นหาชื่อประเภทเอกสาร..."
                        className="w-64"
                    />

                    <Button
                        onClick={handleOpenCreate}
                        variant={'green'}
                        className="px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-emerald-600 hover:bg-emerald-700"
                    >
                        + {t.master.docType.createDocType || 'เพิ่มประเภทเอกสาร'}
                    </Button>
                </div>
            </div>

            {/* Table Card */}
            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <CardContent className="p-0 w-full overflow-x-auto">
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
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            <span>กำลังโหลดข้อมูล...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedDocTypes.length === 0 ? (
                                <TableRow key="no-data">
                                    <TableCell colSpan={columns.length} className="h-40 text-center text-zinc-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <p className="text-zinc-500 dark:text-zinc-400">
                                                {search || selectedMenu
                                                    ? 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา'
                                                    : 'ยังไม่มีข้อมูลประเภทเอกสารในระบบ'}
                                            </p>
                                            {!search && !selectedMenu && (
                                                <Button
                                                    onClick={handleOpenCreate}
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-2 text-xs"
                                                >
                                                    + เพิ่มประเภทเอกสารแรก
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedDocTypes.map((dt) => (
                                    <TableRow
                                        key={dt.id}
                                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                                    >
                                        {/* Transaction Type */}
                                        <TableCell className="py-3 px-4">
                                            {getTransTypeDisplay(dt.menuId, dt.menuName)}
                                        </TableCell>

                                        {/* Doc Type Name */}
                                        <TableCell className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                                            {dt.docTypeName }
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell className="py-3 px-4">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${dt.isActive !== false
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                    : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                                                    }`}
                                            >
                                                {dt.isActive !== false
                                                    ? t.common.active || 'เปิดใช้งาน'
                                                    : t.common.inactive || 'ปิดใช้งาน'}
                                            </span>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleOpenEdit(dt)}
                                                    className="h-8 px-2.5 rounded-lg border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                                    title="แก้ไขข้อมูล"
                                                >
                                                    <Pencil className="w-3.5 h-3.5 mr-1" />
                                                    แก้ไข
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDelete(dt)}
                                                    className="h-8 px-2.5 rounded-lg border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                    title="ลบข้อมูล"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                    ลบ
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

                {/* Pagination Section (Shadcn UI) */}
                <TablePagination
                    currentPage={safeCurrentPage}
                    pageSize={pageSize}
                    totalItems={docTypeList.length}
                    filteredCount={filteredDocTypes.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                    }}
                    loading={loading}
                />
            </Card>

            {/* Create / Edit Modal */}
            <CreateDocTypeModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSaved={fetchDocTypes}
                dataEdit={editingDocType}
            />
        </AppLayout>
    );
}

