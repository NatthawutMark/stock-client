'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { transactionService } from '@/app/_services/transaction';
import { SystemMenuService } from '@/app/_services/systemMenu';
import { masterService } from '@/app/_services/master';
import { ServiceSystem } from '@/app/_services/ServiceSystem';
import {
    docReceives,
    docReceiveDetails,
    docIssues,
    docIssueDetails,
    docTransfers,
    docRequests,
    docDisposals,
} from '@/lib/mock/data';
import type {
    DocTrans,
    MastWarehouse,
    MastEmployee,
    MastDocType,
    SysMenu,
} from '@/lib/types';
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    renderStatusBadge,
} from '@/components/ui';
import {
    Search,
    RotateCcw,
    Plus,
    Eye,
    Layers,
    Calendar,
    FileText,
    Building2,
    Truck,
    ExternalLink,
} from 'lucide-react';

// Helper เพื่อดึงค่าฟิลด์แบบ non-case-sensitive และรองรับทั้ง camelCase, PascalCase, snake_case
function getField<T = unknown>(item: Record<string, unknown> | undefined, ...keys: string[]): T | undefined {
    if (!item) return undefined;
    for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null) {
            return item[key] as T;
        }
    }
    const itemKeys = Object.keys(item);
    for (const key of keys) {
        const foundKey = itemKeys.find((k) => k.toLowerCase() === key.toLowerCase());
        if (foundKey && item[foundKey] !== undefined && item[foundKey] !== null) {
            return item[foundKey] as T;
        }
    }
    return undefined;
}

export interface TransactionDocView extends Record<string, unknown> {
    id?: string | number;
    docNo?: string;
    docDate?: string;
    menuId?: string | number;
    menuName?: string;
    docTypeId?: string | number;
    docTypeName?: string;
    empId?: string | number;
    employeeId?: string | number;
    employeeName?: string;
    empName?: string;
    vendorId?: string | number;
    vendorName?: string;
    warehouseId?: string | number;
    warehouseName?: string;
    statusCode?: string;
    statusName?: string;
    statusId?: number | string;
    remark?: string;
    createDate?: string;
}

const COLUMNS = [
    { colName: 'ประเภทรายการ', key: 'menu', width: 140 },
    { colName: 'เลขที่เอกสาร', key: 'docno', width: 140 },
    { colName: 'ประเภทเอกสาร', key: 'docType', width: 140 },
    { colName: 'วันที่เอกสาร', key: 'docDate', width: 140 },
    { colName: 'พนักงาน', key: 'employee', width: 140 },
    { colName: 'คลังสินค้า', key: 'warehouse', width: 240 },
    { colName: 'สถานะ', key: 'status', width: 140 },
    { colName: 'หมายเหตุ', key: 'remark', width: 240 },
    { colName: 'Action', key: 'action', width: 140 },
];

function getDirectLink(item: Record<string, unknown>, rawMenuId?: unknown): string | null {
    const id = item.id;
    if (!id) return null;
    const menu = String(rawMenuId ?? item.menuName ?? item.menuId ?? '').toLowerCase();
    if (menu === '1' || menu.includes('receive')) return `/transaction/receive/${id}`;
    if (menu === '2' || menu.includes('issue')) return `/transaction/issue/${id}`;
    return null;
}

export default function TransactionPage() {
    const router = useRouter();
    const { setPageTitle } = useLayout();

    // ─────────────────────────────────────────────────────────────
    // Form Filter States
    // ─────────────────────────────────────────────────────────────
    const [docNoInput, setDocNoInput] = useState<string>('');
    const [docDateInput, setDocDateInput] = useState<string>('');
    const [menuSelect, setMenuSelect] = useState<string>('');

    // Master Dropdown Options
    const [menuOptions, setMenuOptions] = useState<{ id: string | number; name: string }[]>([
        { id: '1', name: 'Receive (รับสินค้าเข้า)' },
        { id: '2', name: 'Issue (จ่ายสินค้า)' },
        { id: '3', name: 'Transfer (โอนย้ายสินค้า)' },
        { id: '4', name: 'Request (ขอเบิกสินค้า)' },
        { id: '5', name: 'Disposal (ตัดจำหน่าย)' },
    ]);
    const [warehouses, setWarehouses] = useState<MastWarehouse[]>([]);
    const [employees, setEmployees] = useState<MastEmployee[]>([]);
    const [docTypes, setDocTypes] = useState<MastDocType[]>([]);

    // Document Data State
    const [docList, setDocList] = useState<TransactionDocView[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Pagination States
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Detail Modal State
    const [selectedDoc, setSelectedDoc] = useState<TransactionDocView | null>(null);
    const [selectedDocItems, setSelectedDocItems] = useState<{ id?: string | number; itemName?: string; itemQty?: number }[]>([]);
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

    // ─────────────────────────────────────────────────────────────
    // 0. ตั้งชื่อหัวข้อหน้า
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        setPageTitle('รายการธุรกรรม (Transactions)');
    }, [setPageTitle]);

    // ─────────────────────────────────────────────────────────────
    // 1. โหลดข้อมูล Master Helpers (Menu, Warehouses, Employees, DocTypes)
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadMasterHelpers = async () => {
            try {
                const [menuRes, whRes, empRes, docTypeRes] = await Promise.all([
                    SystemMenuService.transactionList().catch(() => null),
                    masterService.warehouses.list().catch(() => null),
                    masterService.employees.list().catch(() => null),
                    masterService.docTypes.list().catch(() => null),
                ]);

                // 1.1 เมนูประเภทรายการ
                if (menuRes && menuRes.success) {
                    const data = Array.isArray(menuRes.results)
                        ? menuRes.results
                        : Array.isArray(menuRes.data)
                            ? menuRes.data
                            : [];
                    if (data.length > 0) {
                        setMenuOptions(
                            data.map((item: SysMenu) => {
                                const id = item.id;
                                const raw = item as unknown as Record<string, unknown>;
                                const name =
                                    item.nameTh && item.nameEn
                                        ? `${item.nameTh} (${item.nameEn})`
                                        : item.nameTh || item.nameEn || String(raw.menuName || raw.name || `Menu ${id}`);
                                return { id: String(id), name };
                            })
                        );
                    }
                }

                // 1.2 คลังสินค้า
                if (whRes && whRes.success && Array.isArray(whRes.results)) {
                    setWarehouses(whRes.results);
                }

                // 1.3 พนักงาน
                const empData = empRes?.success
                    ? (Array.isArray(empRes.results) ? empRes.results : Array.isArray(empRes.data) ? empRes.data : [])
                    : [];
                if (empData.length > 0) {
                    setEmployees(empData);
                }

                // 1.4 ประเภทเอกสาร
                const dTypeData = docTypeRes?.success
                    ? (Array.isArray(docTypeRes.results) ? docTypeRes.results : Array.isArray(docTypeRes.data) ? docTypeRes.data : [])
                    : [];
                if (dTypeData.length > 0) {
                    setDocTypes(dTypeData);
                }
            } catch (err) {
                console.warn('Failed to load master helpers for transaction page:', err);
            }
        };

        loadMasterHelpers();
    }, []);

    // ─────────────────────────────────────────────────────────────
    // 2. ข้อมูล Mock Fallback ทุกประเภทธุรกรรม (ครอบคลุมครบตาม COLUMNS)
    // ─────────────────────────────────────────────────────────────
    const getFallbackTransactions = useCallback((): TransactionDocView[] => [
        ...docReceives.map((d) => ({
            ...d,
            menuId: d.menuId ?? 1,
            menuName: d.menuName || 'Receive (รับสินค้าเข้า)',
            docTypeName: d.docTypeId === 2 ? 'ใบรับคืน' : 'ใบรับสินค้าปกติ',
            employeeName: d.employeeName || d.empName || 'สมชาย ใจดี',
            warehouseName: d.warehouseName || 'คลังสินค้าหลัก (WH-MAIN)',
            statusCode: d.statusCode || 'Completed',
        })),
        ...docIssues.map((d) => ({
            ...d,
            menuId: 2,
            menuName: 'Issue (จ่ายสินค้าออก)',
            docTypeName: d.docTypeId === 4 ? 'ใบจ่ายสินค้าเสีย' : 'ใบจ่ายสินค้าปกติ',
            employeeName: 'สมหญิง รักงาน',
            warehouseName: 'คลังสินค้าหลัก (WH-MAIN)',
            statusCode: d.statusId === 6 ? 'Completed' : 'Draft',
        })),
        ...docTransfers.map((d) => ({
            ...d,
            menuId: 3,
            menuName: 'Transfer (โอนย้ายสินค้า)',
            docTypeName: 'ใบโอนย้ายสินค้า',
            employeeName: 'ประสิทธิ์ มุ่งมั่น',
            warehouseName: 'คลังสินค้าหลัก -> คลังสาขา 1',
            statusCode: d.statusId === 8 ? 'Completed' : 'Draft',
        })),
        ...docRequests.map((d) => ({
            ...d,
            menuId: 4,
            menuName: 'Request (ขอเบิกสินค้า)',
            docTypeName: 'ใบขอเบิกสินค้า',
            employeeName: 'สมชาย ใจดี',
            warehouseName: 'คลังสินค้าหลัก (WH-MAIN)',
            statusCode: d.statusId === 3 ? 'Completed' : 'Pending',
        })),
        ...docDisposals.map((d) => ({
            ...d,
            menuId: 5,
            menuName: 'Disposal (ตัดจำหน่าย)',
            docTypeName: 'ใบตัดจำหน่าย',
            employeeName: 'วิชัย การค้า',
            warehouseName: 'คลังสินค้าหลัก (WH-MAIN)',
            statusCode: d.statusId === 3 ? 'Completed' : 'Draft',
        })),
    ], []);

    // ─────────────────────────────────────────────────────────────
    // 3. โหลดข้อมูลรายการธุรกรรม (Fetch Transactions Data)
    // ─────────────────────────────────────────────────────────────
    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const payload: Record<string, unknown> = {};
            if (docNoInput.trim()) payload.docNo = docNoInput.trim();
            if (docDateInput.trim()) payload.docDate = docDateInput.trim();
            if (menuSelect) payload.menuId = menuSelect;

            const res = await transactionService.docTrans.list(payload as unknown as DocTrans);
            const listData = res?.success
                ? (Array.isArray(res.results) ? res.results : Array.isArray(res.data) ? res.data : [])
                : Array.isArray(res)
                    ? res
                    : [];

            if (listData && listData.length > 0) {
                setDocList(listData as TransactionDocView[]);
            } else {
                setDocList(getFallbackTransactions());
            }
        } catch (error) {
            console.warn('Fetch transaction list failed, loading fallback mock data:', error);
            setDocList(getFallbackTransactions());
        } finally {
            setLoading(false);
        }
    }, [docNoInput, docDateInput, menuSelect, getFallbackTransactions]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchDocuments();
    }, [fetchDocuments]);

    // ─────────────────────────────────────────────────────────────
    // 4. การกรองข้อมูลฝั่ง Client ตาม Docno, Docdate, Menu
    // ─────────────────────────────────────────────────────────────
    const filteredDocuments = useMemo(() => {
        return docList.filter((doc) => {
            const rec = doc as Record<string, unknown>;

            // Non-case-sensitive field resolution
            const rawDocNo = String(getField(rec, 'DOC_NO', 'doc_no', 'docNo', 'DocNo') || '').toLowerCase();
            const rawDocDate = String(getField(rec, 'DOC_DATE', 'doc_date', 'docDate', 'DocDate', 'createDate') || '');
            const rawMenuId = String(getField(rec, 'Menu_id', 'menu_id', 'menuId', 'transTypeId', 'docTypeId') || '');

            // 1. เงื่อนไข Docno
            if (docNoInput.trim()) {
                const searchDocNo = docNoInput.trim().toLowerCase();
                if (!rawDocNo.includes(searchDocNo)) {
                    return false;
                }
            }

            // 2. เงื่อนไข Docdate (YYYY-MM-DD)
            if (docDateInput) {
                const datePart = rawDocDate.slice(0, 10);
                if (datePart !== docDateInput) {
                    return false;
                }
            }

            // 3. เงื่อนไข Menu
            if (menuSelect) {
                if (rawMenuId !== menuSelect) {
                    return false;
                }
            }

            return true;
        });
    }, [docList, docNoInput, docDateInput, menuSelect]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedDocuments = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filteredDocuments.slice(startIndex, startIndex + pageSize);
    }, [filteredDocuments, safeCurrentPage, pageSize]);

    // ล้างค่าเงื่อนไขการค้นหา
    const handleResetFilter = () => {
        setDocNoInput('');
        setDocDateInput('');
        setMenuSelect('');
        setCurrentPage(1);
    };

    // เปิดดูรายละเอียดเอกสาร
    const handleViewDetail = (doc: TransactionDocView) => {
        setSelectedDoc(doc);
        setIsDetailOpen(true);

        // 1. ตรวจสอบว่ามีรายการสินค้าแนบมากับ doc หรือไม่
        const rawDetails = (doc.details || (doc as Record<string, unknown>).items) as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(rawDetails) && rawDetails.length > 0) {
            setSelectedDocItems(
                rawDetails.map((d, idx) => ({
                    id: (d.id as string | number | undefined) || idx,
                    itemName: String(d.itemName || d.item_name || `สินค้า #${d.itemId || idx + 1}`),
                    itemQty: Number(d.itemQty || d.item_qty || d.bookingQty || 1),
                }))
            );
            return;
        }

        // 2. ตรวจสอบใน mock data ตาม docId (รองรับทั้ง receive และ issue)
        const matchReceives = docReceiveDetails.filter((d) => String(d.docId) === String(doc.id));
        if (matchReceives.length > 0) {
            setSelectedDocItems(
                matchReceives.map((d, idx) => ({
                    id: d.id || idx,
                    itemName: d.itemName || 'สินค้าทั่วไป',
                    itemQty: Number(d.itemQty || 1),
                }))
            );
            return;
        }

        const matchIssues = docIssueDetails.filter((d) => String(d.docId) === String(doc.id));
        if (matchIssues.length > 0) {
            setSelectedDocItems(
                matchIssues.map((d, idx) => ({
                    id: d.id || idx,
                    itemName: d.itemName || 'สินค้าทั่วไป',
                    itemQty: Number(d.itemQty || d.bookingQty || 1),
                }))
            );
            return;
        }

        // 3. Fallback สำหรับเอกสารอื่นๆ
        setSelectedDocItems([
            { id: 1, itemName: 'สินค้ามาตรฐานตามใบแจ้ง', itemQty: 1 },
        ]);
    };

    return (
        <AppLayout>
            {/* Page Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        รายการธุรกรรม (Transactions)
                    </h1>
                    <p className="text-sm mt-1 text-zinc-500 dark:text-zinc-400">
                        ค้นหาและตรวจสอบเอกสารความเคลื่อนไหวสินค้าทั้งหมดในระบบ (All Inventory Transaction Documents)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => router.push('/transaction/receive/form')}
                        className="px-3.5 py-2 text-xs font-medium text-white rounded-xl shadow-sm bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        สร้างใบรับสินค้า
                    </Button>
                    <Button
                        onClick={() => router.push('/transaction/issue/form')}
                        variant="outline"
                        className="px-3.5 py-2 text-xs font-medium rounded-xl border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        สร้างใบเบิกสินค้า
                    </Button>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                1. Filter / Search Section (Docno, Docdate, Menu)
               ───────────────────────────────────────────────────────────── */}
            <Card className="mb-6 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                            เงื่อนไขการค้นหาเอกสาร (Search Criteria)
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetFilter}
                            className="h-8 px-3 text-xs rounded-lg border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            ล้างค่า (Reset)
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                setCurrentPage(1);
                                fetchDocuments();
                            }}
                            className="h-8 px-4 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Search className="w-3.5 h-3.5 mr-1" />
                            ค้นหา
                        </Button>
                    </div>
                </div>

                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
                        {/* 1. Docno Field */}
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="docno-input" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    Docno
                                </Label>
                                <span className="text-xs text-zinc-400">เลขที่เอกสาร</span>
                            </div>
                            <div className="relative">
                                <input
                                    id="docno-input"
                                    type="text"
                                    value={docNoInput}
                                    onChange={(e) => {
                                        setDocNoInput(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="เช่น GR2024001, GI2024001..."
                                    className="w-full h-10 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                                />
                                {docNoInput && (
                                    <button
                                        type="button"
                                        onClick={() => setDocNoInput('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 2. Docdate Field */}
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="docdate-input" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    Docdate
                                </Label>
                                <span className="text-xs text-zinc-400">วันที่เอกสาร</span>
                            </div>
                            <div className="relative">
                                <input
                                    id="docdate-input"
                                    type="date"
                                    value={docDateInput}
                                    onChange={(e) => {
                                        setDocDateInput(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full h-10 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer transition-all"
                                />
                                {docDateInput && (
                                    <button
                                        type="button"
                                        onClick={() => setDocDateInput('')}
                                        className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 3. Menu Field (Select Dropdown) */}
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="menu-select" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    Menu
                                </Label>
                                <span className="text-xs text-zinc-400">ประเภทเมนูธุรกรรม</span>
                            </div>
                            <select
                                id="menu-select"
                                value={menuSelect}
                                onChange={(e) => {
                                    setMenuSelect(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full h-10 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer transition-all"
                            >
                                <option value="">-- ทั้งหมด (All Menus) --</option>
                                {menuOptions.map((opt) => (
                                    <option key={opt.id} value={String(opt.id)}>
                                        {opt.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─────────────────────────────────────────────────────────────
                2. Table Section (Table-Document อิงตาม COLUMNS ครบถ้วน)
               ───────────────────────────────────────────────────────────── */}
            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/40">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                            Table-Document (รายการเอกสารธุรกรรมทั้งหมด)
                        </h2>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        พบทั้งหมด {filteredDocuments.length} รายการ
                    </span>
                </div>

                <CardContent className="p-0 w-full overflow-x-auto">
                    <Table className="w-full">
                        {/* Table Header อิงตาม COLUMNS */}
                        <TableHeader className="bg-zinc-100/80 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                            <TableRow>
                                {COLUMNS.map((col) => (
                                    <TableHead
                                        key={col.key}
                                        style={{ width: `${col.width}px` }}
                                        className={`font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 py-3.5 px-4 ${col.key === 'action' ? 'text-right' : 'text-left'
                                            }`}
                                    >
                                        {col.colName}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>

                        {/* Table Body อิงตาม COLUMNS */}
                        <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {loading ? (
                                <TableRow key="loading-row">
                                    <TableCell colSpan={COLUMNS.length} className="h-48 text-center text-zinc-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-sm">กำลังโหลดข้อมูลเอกสาร...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedDocuments.length === 0 ? (
                                <TableRow key="empty-row">
                                    <TableCell colSpan={COLUMNS.length} className="h-48 text-center text-zinc-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <FileText className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                                ไม่พบข้อมูลเอกสารที่ตรงกับเงื่อนไข
                                            </p>
                                            <p className="text-xs text-zinc-400">
                                                ลองปรับเปลี่ยนค่า Docno, Docdate หรือ Menu เพื่อค้นหาใหม่อีกครั้ง
                                            </p>
                                            {(docNoInput || docDateInput || menuSelect) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleResetFilter}
                                                    className="mt-2 text-xs"
                                                >
                                                    ล้างเงื่อนไขการค้นหา
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedDocuments.map((item, index) => {
                                    const rec = item as Record<string, unknown>;

                                    // 1. Menu (ประเภทรายการ)
                                    const rawMenuId = getField(rec, 'menuId', 'menu_id', 'transTypeId', 'Menu_id');
                                    const menuNameVal = getField<string>(rec, 'menuName', 'menu_name', 'transTypeName');
                                    const matchedMenu = menuOptions.find((m) => String(m.id) === String(rawMenuId));
                                    const menuLabel = menuNameVal || matchedMenu?.name || (rawMenuId ? `Menu #${rawMenuId}` : '-');

                                    // 2. DocNo (เลขที่เอกสาร)
                                    const docNoVal = String(getField(rec, 'docNo', 'doc_no', 'DocNo', 'DOC_NO') || '-');

                                    // 3. DocType (ประเภทเอกสาร)
                                    const rawDocTypeId = getField(rec, 'docTypeId', 'doc_type_id');
                                    const docTypeNameVal = getField<string>(rec, 'docTypeName', 'doc_type_name', 'docType');
                                    const matchedDocType = docTypes.find((d) => String(d.id) === String(rawDocTypeId));
                                    const docTypeLabel = docTypeNameVal || matchedDocType?.name || (rawDocTypeId ? `Type #${rawDocTypeId}` : '-');

                                    // 4. DocDate (วันที่เอกสาร)
                                    const rawDate = String(getField(rec, 'docDate', 'doc_date', 'DocDate', 'DOC_DATE', 'createDate') || '');
                                    const docDateStr = rawDate.length >= 10 ? rawDate.slice(0, 10) : rawDate;
                                    const formattedDate = docDateStr ? ServiceSystem.formatThaiDate(docDateStr) : '-';

                                    // 5. Employee (พนักงาน)
                                    const rawEmpId = getField(rec, 'empId', 'emp_id', 'employeeId', 'employee_id');
                                    const empNameVal = getField<string>(rec, 'employeeName', 'employee_name', 'empName', 'employee');
                                    const matchedEmp = employees.find((e) => String(e.id) === String(rawEmpId));
                                    const employeeLabel =
                                        empNameVal ||
                                        (matchedEmp ? `${matchedEmp.fName || ''} ${matchedEmp.lName || ''}`.trim() : '') ||
                                        (rawEmpId ? `Emp #${rawEmpId}` : '-');

                                    // 6. Warehouse (คลังสินค้า)
                                    const rawWhId = getField(rec, 'warehouseId', 'warehouse_id', 'fromWarehouseId');
                                    const whNameVal = getField<string>(rec, 'warehouseName', 'warehouse_name', 'warehouse');
                                    const matchedWh = warehouses.find((w) => String(w.id) === String(rawWhId));
                                    const warehouseLabel = whNameVal || matchedWh?.warehouseName || (rawWhId ? `คลัง #${rawWhId}` : '-');

                                    // 7. Status (สถานะ)
                                    const statusCodeVal = String(
                                        getField(rec, 'statusCode', 'status_code', 'DOC_STATUS', 'doc_status', 'statusName', 'statusId') || 'Draft'
                                    );

                                    // 8. Remark (หมายเหตุ)
                                    const remarkVal = String(getField(rec, 'remark', 'remark_text', 'note') || '');

                                    // 9. Direct Link (หากมีหน้ารายละเอียดเอกสารตรง)
                                    const directLink = getDirectLink(rec, rawMenuId);

                                    return (
                                        <TableRow
                                            key={`doc-${rawMenuId ?? item.menuId ?? 'm'}-${item.docNo || item.id || index}-${index}`}
                                            className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                                            onClick={() => handleViewDetail(item)}
                                        >
                                            {/* Column 1: ประเภทรายการ */}
                                            <TableCell className="py-3.5 px-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                    <Layers className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                                    {menuLabel}
                                                </span>
                                            </TableCell>

                                            {/* Column 2: เลขที่เอกสาร */}
                                            <TableCell className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-sm whitespace-nowrap">
                                                <span className="text-blue-600 dark:text-blue-400 group-hover:underline">
                                                    {docNoVal}
                                                </span>
                                            </TableCell>

                                            {/* Column 3: ประเภทเอกสาร */}
                                            <TableCell className="py-3.5 px-4 text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                                {docTypeLabel}
                                            </TableCell>

                                            {/* Column 4: วันที่เอกสาร */}
                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                                    <span>{formattedDate}</span>
                                                </div>
                                            </TableCell>

                                            {/* Column 5: พนักงาน */}
                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                                {employeeLabel}
                                            </TableCell>

                                            {/* Column 6: คลังสินค้า */}
                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-700 dark:text-zinc-300">
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                                    <span className="truncate max-w-[200px]" title={warehouseLabel}>
                                                        {warehouseLabel}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Column 7: สถานะ */}
                                            <TableCell className="py-3.5 px-4 whitespace-nowrap">
                                                {renderStatusBadge(statusCodeVal)}
                                            </TableCell>

                                            {/* Column 8: หมายเหตุ */}
                                            <TableCell className="py-3.5 px-4 text-xs text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate" title={remarkVal}>
                                                {remarkVal || '-'}
                                            </TableCell>

                                            {/* Column 9: Action */}
                                            <TableCell className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleViewDetail(item)}
                                                        className="h-8 px-2.5 rounded-lg border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs"
                                                        title="ดูรายละเอียดเอกสาร"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                                                        รายละเอียด
                                                    </Button>
                                                    {directLink && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => router.push(directLink)}
                                                            className="h-8 px-2 rounded-lg border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs"
                                                            title="เปิดหน้าเอกสารนี้"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

                {/* ─────────────────────────────────────────────────────────────
                    3. Bottom Pagination Bar: Page-navigate
                   ───────────────────────────────────────────────────────────── */}
                <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/60">
                    <TablePagination
                        currentPage={safeCurrentPage}
                        pageSize={pageSize}
                        totalItems={docList.length}
                        filteredCount={filteredDocuments.length}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setCurrentPage(1);
                        }}
                        loading={loading}
                    />
                </div>
            </Card>

            {/* ─────────────────────────────────────────────────────────────
                Modal: ดูรายละเอียดเอกสาร (Document Detail Modal)
               ───────────────────────────────────────────────────────────── */}
            {selectedDoc && (
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                <FileText className="w-5 h-5 text-blue-600" />
                                รายละเอียดเอกสาร ({selectedDoc.docNo || selectedDoc.id || '-'})
                            </DialogTitle>
                        </DialogHeader>

                        <div className="py-4 space-y-4">
                            {/* Card ข้อมูลส่วนหัวเอกสาร */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700">
                                <div>
                                    <span className="block text-xs font-semibold text-zinc-400">เลขที่เอกสาร</span>
                                    <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                                        {selectedDoc.docNo || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold text-zinc-400">วันที่เอกสาร</span>
                                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                        {selectedDoc.docDate ? ServiceSystem.formatThaiDate(selectedDoc.docDate) : '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold text-zinc-400">ประเภทรายการ</span>
                                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                        {selectedDoc.menuName || (selectedDoc.menuId ? `Menu #${selectedDoc.menuId}` : '-')}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold text-zinc-400">สถานะ</span>
                                    <div className="mt-0.5">
                                        {renderStatusBadge(selectedDoc.statusCode || selectedDoc.statusName || selectedDoc.statusId || 'Draft')}
                                    </div>
                                </div>
                            </div>

                            {/* ข้อมูลประเภทเอกสาร, คลังสินค้า และผู้จำหน่าย/พนักงาน */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <span className="block text-xs font-semibold text-zinc-500 mb-1">
                                        ประเภทเอกสาร
                                    </span>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                        {selectedDoc.docTypeName || (selectedDoc.docTypeId ? `Type #${selectedDoc.docTypeId}` : '-')}
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                                        <Building2 className="w-3.5 h-3.5" />
                                        คลังสินค้า (Warehouse)
                                    </div>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                        {selectedDoc.warehouseName || (selectedDoc.warehouseId ? `คลัง #${selectedDoc.warehouseId}` : '-')}
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                                        <Truck className="w-3.5 h-3.5" />
                                        ผู้จำหน่าย / พนักงาน
                                    </div>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                        {selectedDoc.employeeName || selectedDoc.empName || selectedDoc.vendorName || (selectedDoc.employeeId ? `Emp #${selectedDoc.employeeId}` : '-')}
                                    </p>
                                </div>
                            </div>

                            {/* หมายเหตุ */}
                            {selectedDoc.remark && (
                                <div className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-700">
                                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">หมายเหตุ: </span>
                                    {selectedDoc.remark}
                                </div>
                            )}

                            {/* รายการสินค้าในเอกสาร (Items in Document) */}
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                                    รายการสินค้าในเอกสาร (Items in Document)
                                </h4>
                                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden max-h-60 overflow-y-auto">
                                    <Table>
                                        <TableHeader className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                                            <TableRow>
                                                <TableHead className="py-2 px-3 text-xs w-14 text-center">ลำดับ</TableHead>
                                                <TableHead className="py-2 px-3 text-xs">ชื่อสินค้า</TableHead>
                                                <TableHead className="py-2 px-3 text-xs text-right w-28">จำนวน</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedDocItems.map((detail, idx) => (
                                                <TableRow key={`item-${detail.id ?? 'row'}-${idx}`}>
                                                    <TableCell className="py-2.5 px-3 text-xs text-center text-zinc-500">{idx + 1}</TableCell>
                                                    <TableCell className="py-2.5 px-3 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                                        {detail.itemName}
                                                    </TableCell>
                                                    <TableCell className="py-2.5 px-3 text-xs text-right font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                                                        {(detail.itemQty ?? 0).toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {selectedDocItems.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="py-4 text-center text-xs text-zinc-400">
                                                        ไม่มีรายการสินค้าในเอกสารนี้
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 w-full">
                            <div>
                                {getDirectLink(selectedDoc, selectedDoc.menuId) && (
                                    <Button
                                        variant="default"
                                        onClick={() => {
                                            const url = getDirectLink(selectedDoc, selectedDoc.menuId);
                                            if (url) router.push(url);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        เปิดหน้าเอกสารฉบับเต็ม
                                    </Button>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setIsDetailOpen(false)}
                                className="px-4 py-2 text-xs"
                            >
                                ปิดหน้าต่าง
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </AppLayout>
    );
}
