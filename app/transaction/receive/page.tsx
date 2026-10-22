'use client';

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { transactionService } from '@/app/_services/transaction';
import { masterService } from '@/app/_services/master';
import { ServiceSystem } from '@/app/_services/ServiceSystem';
import { docReceives } from '@/lib/mock/data';
import type {
    DocReceive, DocTrans, DocReceiveDetail,
    MastVendor, MastEmployee, MastDocType,
} from '@/lib/types';
import {
    Button, Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
    Card, CardContent, Label, TablePagination,
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
    DatePicker, SearchableSelect, SearchableSelectOption,
    renderStatusBadge,
} from '@/components/ui';
import {
    Search, RotateCcw, Plus, Eye, Layers, Calendar, FileText, Building2, Truck, Pencil,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const MENU_ID = '00E03A994280450ABF7E2EE62A7AD4D6';

/** สถานะที่ไม่อนุญาตให้แก้ไขเอกสาร */
const LOCKED_STATUSES = ['CANCEL', 'CONFIRM', 'COMPLETED', 'PARTIAL_PUTAWAY'];

const STATUS_OPTIONS: SearchableSelectOption[] = [
    { value: 'DRAFT', label: 'Draft (ร่าง)' },
    { value: 'SAVE', label: 'Save (บันทึก)' },
    { value: 'PENDING', label: 'Pending (รอดำเนินการ)' },
    { value: 'COMPLETED', label: 'Completed (รับแล้ว)' },
    { value: 'CANCELLED', label: 'Cancelled (ยกเลิก)' },
];

const COLUMNS = [
    { colName: 'เลขที่เอกสาร', key: 'docno', width: 140 },
    { colName: 'ประเภทเอกสาร', key: 'docType', width: 140 },
    { colName: 'วันที่เอกสาร', key: 'docDate', width: 140 },
    { colName: 'เลขที่อ้างอิง', key: 'refDoc', width: 140 },
    { colName: 'พนักงาน', key: 'employee', width: 140 },
    { colName: 'ผู้จัดจำหน่าย', key: 'vendor', width: 140 },
    { colName: 'คลังสินค้า', key: 'warehouse', width: 240 },
    { colName: 'สถานะ', key: 'status', width: 140 },
    { colName: 'หมายเหตุ', key: 'remark', width: 240 },
    { colName: 'Action', key: 'action', width: 140 },
];

const TOTAL_KEYS = ['total', 'totalCount', 'totalRecords', 'total_count', 'total_records', 'count', 'recordsTotal'];

const INPUT_CLASS =
    'w-full h-10 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 shadow-sm';

interface ReceiveFilters {
    docNo: string;
    employeeId: string;
    vendorId: string;
    docDate: string;
    docTypeId: string;
    statusCode: string;
}

const initialFilters: ReceiveFilters = {
    docNo: '',
    employeeId: '',
    vendorId: '',
    docDate: '',
    docTypeId: '',
    statusCode: '',
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** ดึงค่าฟิลด์ตามลำดับ key ที่ระบุ (fallback แบบ case-insensitive) */
function getField<T = unknown>(item: Record<string, unknown> | undefined, ...keys: string[]): T | undefined {
    if (!item) return undefined;
    for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null) return item[key] as T;
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

interface ListResponse {
    success?: boolean;
    results?: unknown;
    data?: unknown;
}

/** ดึง array จาก response (รองรับ results[], data[] หรือ results.{items|data|list}) */
function extractList<T>(res: ListResponse | null | undefined): T[] {
    if (!res?.success) return [];
    if (Array.isArray(res.results)) return res.results as T[];
    if (Array.isArray(res.data)) return res.data as T[];
    if (res.results && typeof res.results === 'object') {
        const nested = res.results as Record<string, unknown>;
        for (const key of ['items', 'data', 'list']) {
            if (Array.isArray(nested[key])) return nested[key] as T[];
        }
    }
    return [];
}

/** ดึงจำนวนทั้งหมดจาก response (ทั้งระดับบนและภายใน results object) */
function extractTotal(res: ListResponse): number | undefined {
    const nested = res.results && typeof res.results === 'object' && !Array.isArray(res.results)
        ? (res.results as Record<string, unknown>)
        : undefined;
    const value =
        getField(res as Record<string, unknown>, ...TOTAL_KEYS) ??
        getField(nested, ...TOTAL_KEYS);
    const num = Number(value);
    return value !== undefined && !Number.isNaN(num) ? num : undefined;
}

// ─────────────────────────────────────────────────────────────
// Sub Components
// ─────────────────────────────────────────────────────────────
function FilterField({ id, label, subLabel, children }: {
    id: string;
    label: string;
    subLabel: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between">
                <Label htmlFor={id} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {label}
                </Label>
                <span className="text-xs text-zinc-400">{subLabel}</span>
            </div>
            {children}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function ReceivePage() {
    const router = useRouter();
    const { pageTitle } = useLayout();

    // Filter inputs (ยังไม่ apply จนกว่าจะกดค้นหา)
    const [docNoInput, setDocNoInput] = useState('');
    const [employeeIdInput, setEmployeeIdInput] = useState('');
    const [vendorIdInput, setVendorIdInput] = useState('');
    const [docDateInput, setDocDateInput] = useState('');
    const [docTypeIdInput, setDocTypeIdInput] = useState('');
    const [statusCodeInput, setStatusCodeInput] = useState('');
    const [appliedFilters, setAppliedFilters] = useState<ReceiveFilters>(initialFilters);

    // Master dropdown data
    const [vendorList, setVendorList] = useState<MastVendor[]>([]);
    const [employeeList, setEmployeeList] = useState<MastEmployee[]>([]);
    const [docTypeList, setDocTypeList] = useState<MastDocType[]>([]);

    // Document data
    const [docList, setDocList] = useState<DocReceive[]>([]);
    const [docItemList, setDocItemList] = useState<DocReceiveDetail[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // Detail modal
    const [selectedDoc, setSelectedDoc] = useState<DocReceive | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // ─── 1. โหลด Master Dropdowns ───────────────────────────────
    useEffect(() => {
        const loadFilterMasters = async () => {
            try {
                const [vendRes, empRes, dTypeRes] = await Promise.all([
                    masterService.vendors.list(),
                    masterService.employees.list(),
                    masterService.docTypes.list({ menuId: MENU_ID }),
                ]);
                setVendorList(extractList<MastVendor>(vendRes));
                setEmployeeList(extractList<MastEmployee>(empRes));
                setDocTypeList(extractList<MastDocType>(dTypeRes));
            } catch (err) {
                console.error('Failed to load filter masters:', err);
                setVendorList([]);
                setEmployeeList([]);
                setDocTypeList([]);
            }
        };
        loadFilterMasters();
    }, []);

    // ─── 2. Dropdown Options ────────────────────────────────────
    const employeeOptions = useMemo<SearchableSelectOption[]>(() =>
        employeeList.map((e) => ({
            value: String(e.id),
            label: `${e.empCode ? `[${e.empCode}] ` : ''}${e.fName || ''} ${e.lName || ''}`.trim() || String(e.id),
            subLabel: e.department || e.position
                ? `${e.department || ''}${e.position ? ` (${e.position})` : ''}`
                : (e.tel ? `โทร: ${e.tel}` : undefined),
        })), [employeeList]);

    const vendorOptions = useMemo<SearchableSelectOption[]>(() =>
        vendorList.map((v) => ({
            value: String(v.id),
            label: `${v.vendCode ? `[${v.vendCode}] ` : ''}${v.vendName || ''}`.trim() || String(v.id),
            subLabel: v.contactName
                ? `ผู้ติดต่อ: ${v.contactName}${v.tel ? ` (${v.tel})` : ''}`
                : (v.tel ? `โทร: ${v.tel}` : undefined),
        })), [vendorList]);

    const docTypeOptions = useMemo<SearchableSelectOption[]>(() =>
        docTypeList.map((dt) => ({
            value: String(dt.id),
            label: dt.docTypeName || dt.name || String(dt.id),
        })), [docTypeList]);

    // ─── 3. Mock Fallback (กรณี Backend ไม่พร้อม) ────────────────
    const applyMockFallback = useCallback((filters: ReceiveFilters, page: number, size: number) => {
        const docNo = filters.docNo.trim().toLowerCase();
        const filtered = docReceives.filter((doc) => {
            const rec = doc as unknown as Record<string, unknown>;
            const str = (...keys: string[]) => String(getField(rec, ...keys) || '');

            if (docNo && !str('docNo', 'doc_no').toLowerCase().includes(docNo)) return false;
            if (filters.docDate && str('docDate', 'doc_date', 'createDate').slice(0, 10) !== filters.docDate) return false;
            if (filters.employeeId && str('empId', 'employeeId', 'emp_id') !== filters.employeeId) return false;
            if (filters.vendorId && str('vendId', 'vendorId', 'vend_id') !== filters.vendorId) return false;
            if (filters.docTypeId && str('docTypeId', 'transTypeId', 'doc_type_id', 'menuId') !== filters.docTypeId) return false;
            if (filters.statusCode && str('statusCode', 'status').toLowerCase() !== filters.statusCode.toLowerCase()) return false;
            return true;
        });

        const start = (page - 1) * size;
        setTotalRecords(filtered.length);
        setDocList(filtered.slice(start, start + size));
    }, []);

    // ─── 4. โหลดเอกสาร (Server Pagination) ──────────────────────
    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const payload: DocTrans & { pageSize?: number; pageNumber?: number } = {
                docNo: appliedFilters.docNo.trim() || undefined,
                docDate: appliedFilters.docDate || undefined,
                employeeId: appliedFilters.employeeId || undefined,
                empId: appliedFilters.employeeId || undefined,
                vendId: appliedFilters.vendorId || undefined,
                vendorId: appliedFilters.vendorId || undefined,
                docTypeId: appliedFilters.docTypeId || undefined,
                statusCode: appliedFilters.statusCode || undefined,
                menuId: MENU_ID,
                page: currentPage,
                pageNumber: currentPage,
                size: pageSize,
                pageSize,
                limit: pageSize,
            };

            const res = await transactionService.docTrans.list(payload);
            if (!res?.success) {
                applyMockFallback(appliedFilters, currentPage, pageSize);
                return;
            }

            const data = extractList<DocReceive>(res);
            console.log('load data', data);

            // Backend ส่งมาทั้งหมด → ตัดหน้าเอง (Client Pagination)
            // if (data.length > pageSize) {
            //     const start = (currentPage - 1) * pageSize;
            //     setTotalRecords(data.length);
            //     setDocList(data.slice(start, start + pageSize));
            //     return;
            // }

            // Backend ตัดหน้ามาแล้ว (Server Pagination)
            setDocList(data);
            const total = extractTotal(res);
            if (total !== undefined) {
                setTotalRecords(total);
            } else {
                // ไม่มี total: ถ้าได้เต็ม pageSize ถือว่ายังมีหน้าถัดไป
                setTotalRecords(data.length === pageSize
                    ? currentPage * pageSize + 1
                    : (currentPage - 1) * pageSize + data.length);
            }
        } catch (error) {
            console.warn('Fetch receive documents failed, loading mock data:', error);
            applyMockFallback(appliedFilters, currentPage, pageSize);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, appliedFilters, applyMockFallback]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchDocuments();
    }, [fetchDocuments]);

    // ─── 5. โหลดรายการสินค้าเมื่อเปิด Modal ─────────────────────
    useEffect(() => {
        const fetchItems = async () => {
            if (!isDetailOpen || !selectedDoc?.id) {
                setDocItemList([]);
                return;
            }
            try {
                const res = await transactionService.receive.listItem({ docId: selectedDoc.id });
                setDocItemList(res?.success && Array.isArray(res.results) ? res.results : []);
            } catch (err) {
                console.error('Failed to load receive doc items:', err);
                setDocItemList([]);
            }
        };
        fetchItems();
    }, [isDetailOpen, selectedDoc]);

    // ─── Handlers ───────────────────────────────────────────────
    // สร้าง object ใหม่ทุกครั้ง เพื่อให้ fetchDocuments ทำงานแม้เงื่อนไขเหมือนเดิม
    const handleSearch = () => {
        setAppliedFilters({
            docNo: docNoInput,
            employeeId: employeeIdInput,
            vendorId: vendorIdInput,
            docDate: docDateInput,
            docTypeId: docTypeIdInput,
            statusCode: statusCodeInput,
        });
        setCurrentPage(1);
    };

    const handleResetFilter = () => {
        setDocNoInput('');
        setEmployeeIdInput('');
        setVendorIdInput('');
        setDocDateInput('');
        setDocTypeIdInput('');
        setStatusCodeInput('');
        setAppliedFilters({ ...initialFilters });
        setCurrentPage(1);
    };

    const handleViewDetail = (doc: DocReceive) => {
        setSelectedDoc(doc);
        setIsDetailOpen(true);
    };

    const hasActiveFilters = Object.values(appliedFilters).some(Boolean);
    const isSelectedLocked = LOCKED_STATUSES.includes(String(selectedDoc?.statusCode));

    return (
        <AppLayout>
            {/* Page Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'รับสินค้า (Goods Receive)'}
                    </h1>
                    <p className="text-sm mt-1 text-zinc-500 dark:text-zinc-400">
                        ค้นหาและจัดการเอกสารรับเข้าสินค้าตามรหัสเอกสาร วันที่ และประเภทเมนู (Receive Document Management)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => router.push('/transaction/receive/form')}
                        className="px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        สร้างใบรับสินค้า
                    </Button>
                </div>
            </div>

            {/* ─── 1. Filter Section ─── */}
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
                            onClick={handleSearch}
                            className="h-8 px-4 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Search className="w-3.5 h-3.5 mr-1" />
                            ค้นหา
                        </Button>
                    </div>
                </div>

                <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <FilterField id="filter-docno" label="เลขที่เอกสาร" subLabel="Doc No.">
                            <div className="relative">
                                <input
                                    id="filter-docno"
                                    type="text"
                                    value={docNoInput}
                                    onChange={(e) => setDocNoInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSearch();
                                    }}
                                    placeholder="เช่น GR2024001..."
                                    className={`${INPUT_CLASS} placeholder:text-zinc-400 focus:outline-none transition-all`}
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
                        </FilterField>

                        <FilterField id="filter-employee" label="พนักงาน" subLabel="Employee">
                            <SearchableSelect
                                id="filter-employee"
                                value={employeeIdInput}
                                onChange={setEmployeeIdInput}
                                options={employeeOptions}
                                placeholder="-- ทั้งหมด (All Employees) --"
                                searchPlaceholder="ค้นหารหัส หรือชื่อพนักงาน..."
                                clearable
                            />
                        </FilterField>

                        <FilterField id="filter-vendor" label="ผู้จัดจำหน่าย" subLabel="Vendor">
                            <SearchableSelect
                                id="filter-vendor"
                                value={vendorIdInput}
                                onChange={setVendorIdInput}
                                options={vendorOptions}
                                placeholder="-- ทั้งหมด (All Vendors) --"
                                searchPlaceholder="ค้นหารหัส หรือชื่อผู้จัดจำหน่าย..."
                                clearable
                            />
                        </FilterField>

                        <FilterField id="filter-docdate" label="วันที่เอกสาร" subLabel="Doc Date">
                            <DatePicker
                                id="filter-docdate"
                                value={docDateInput}
                                onChange={setDocDateInput}
                                clearable
                                placeholder="เลือกวันที่เอกสาร..."
                                formatString="dd/MM/yyyy"
                                className={INPUT_CLASS}
                            />
                        </FilterField>

                        <FilterField id="filter-doctype" label="ประเภทเอกสาร" subLabel="Doc Type">
                            <SearchableSelect
                                id="filter-doctype"
                                value={docTypeIdInput}
                                onChange={setDocTypeIdInput}
                                options={docTypeOptions}
                                placeholder="-- ทั้งหมด (All Types) --"
                                searchPlaceholder="ค้นหาประเภทเอกสาร..."
                                clearable
                            />
                        </FilterField>

                        <FilterField id="filter-status" label="สถานะเอกสาร" subLabel="Status">
                            <SearchableSelect
                                id="filter-status"
                                value={statusCodeInput}
                                onChange={setStatusCodeInput}
                                options={STATUS_OPTIONS}
                                placeholder="-- ทั้งหมด (All Status) --"
                                searchPlaceholder="ค้นหาสถานะ..."
                                clearable
                            />
                        </FilterField>
                    </div>
                </CardContent>
            </Card>

            {/* ─── 2. Table Section ─── */}
            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/40">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                            Table-Document (รายการเอกสารรับสินค้า)
                        </h2>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        พบทั้งหมด {totalRecords} รายการ
                    </span>
                </div>

                <CardContent className="p-0 w-full overflow-x-auto">
                    <Table className="w-full">
                        <TableHeader className="bg-zinc-100/80 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                            <TableRow>
                                {COLUMNS.map((col) => (
                                    <TableHead
                                        key={col.key}
                                        style={{ width: `${col.width}px` }}
                                        className={`font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 py-3.5 px-4 ${col.key === 'action' ? 'text-right' : 'text-left'}`}
                                    >
                                        {col.colName}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>

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
                            ) : docList.length === 0 ? (
                                <TableRow key="empty-row">
                                    <TableCell colSpan={COLUMNS.length} className="h-48 text-center text-zinc-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <FileText className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                                ไม่พบข้อมูลเอกสารที่ตรงกับเงื่อนไข
                                            </p>
                                            <p className="text-xs text-zinc-400">
                                                ลองปรับเปลี่ยนเงื่อนไขการค้นหาเพื่อค้นหาใหม่อีกครั้ง
                                            </p>
                                            {hasActiveFilters && (
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
                                docList.map((item, index) => {
                                    const rec = item as unknown as Record<string, unknown>;
                                    const str = (...keys: string[]) => String(getField(rec, ...keys) || '-');

                                    const rawDate = str('docDate', 'doc_date', 'createDate');
                                    const docDateVal = rawDate.length >= 10 ? rawDate.slice(0, 10) : rawDate;
                                    const remarkVal = str('remark');
                                    const statusCode = str('statusCode');
                                    const isLocked = LOCKED_STATUSES.includes(statusCode);

                                    return (
                                        <TableRow
                                            key={item.id ?? `doc-${index}`}
                                            className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                                            onClick={() => handleViewDetail(item)}
                                        >
                                            {/* เลขที่เอกสาร */}
                                            <TableCell className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                                                <span className="text-blue-600 dark:text-blue-400 group-hover:underline">
                                                    {str('docNo', 'doc_no')}
                                                </span>
                                            </TableCell>

                                            {/* ประเภทเอกสาร */}
                                            <TableCell className="py-3.5 px-4 text-xs">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                    <Layers className="w-3 h-3 text-blue-500" />
                                                    {str('docTypeName', 'menuName', 'menu_name', 'menuId')}
                                                </span>
                                            </TableCell>

                                            {/* วันที่เอกสาร */}
                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                                    <span>{ServiceSystem.formatThaiDate(docDateVal)}</span>
                                                </div>
                                            </TableCell>

                                            {/* เลขที่อ้างอิง */}
                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-600 dark:text-zinc-400 font-mono">
                                                {str('docNoRef', 'doc_no_ref', 'refDocNo', 'refDoc')}
                                            </TableCell>

                                            {/* พนักงาน */}
                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-700 dark:text-zinc-300">
                                                {str('empName', 'employeeName', 'employeeId')}
                                            </TableCell>

                                            {/* ผู้จัดจำหน่าย */}
                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-700 dark:text-zinc-300">
                                                {str('vendName', 'vendorName', 'vendor', 'vendorId')}
                                            </TableCell>

                                            {/* คลังสินค้า */}
                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-700 dark:text-zinc-300">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                    {str('warehouseName', 'warehouse', 'warehouseId')}
                                                </span>
                                            </TableCell>

                                            {/* สถานะ */}
                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-700 dark:text-zinc-300">
                                                {renderStatusBadge(statusCode)}
                                            </TableCell>

                                            {/* หมายเหตุ */}
                                            <TableCell className="py-3.5 px-4 text-xs text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate" title={remarkVal}>
                                                {remarkVal}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        hidden={isLocked}
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => router.push(`/transaction/receive/form?id=${item.id}`)}
                                                        className="px-4 py-2 text-sm rounded-xl border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1.5"
                                                        title="แก้ไขเอกสาร"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                                                        แก้ไข
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => router.push(`/transaction/receive/${item.id}`)}
                                                        className="h-8 px-2.5 rounded-lg border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                                        title="ดูรายละเอียดเอกสาร"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                                                        รายละเอียด
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

                {/* ─── 3. Pagination ─── */}
                <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/60">
                    <TablePagination
                        currentPage={currentPage}
                        pageSize={pageSize}
                        totalItems={totalRecords}
                        filteredCount={totalRecords}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setCurrentPage(1);
                        }}
                        loading={loading}
                    />
                </div>
            </Card>

            {/* ─── Modal: รายละเอียดเอกสาร ─── */}
            {selectedDoc && (
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-5xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                <FileText className="w-5 h-5 text-blue-600" />
                                รายละเอียดเอกสารรับเข้า (Receive Document)
                            </DialogTitle>
                        </DialogHeader>

                        <div className="py-4 space-y-4">
                            {/* ข้อมูลส่วนหัวเอกสาร */}
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
                                        {selectedDoc.docDate?.slice(0, 10) || selectedDoc.createDate?.slice(0, 10) || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold text-zinc-400">พนักงาน</span>
                                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                        {selectedDoc.empName || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold text-zinc-400">สถานะเอกสาร</span>
                                    <div className="mt-0.5">
                                        {renderStatusBadge(selectedDoc.statusCode)}
                                    </div>
                                </div>
                            </div>

                            {/* คลังสินค้า & ผู้จัดจำหน่าย */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                                        <Building2 className="w-3.5 h-3.5" />
                                        คลังสินค้ารับเข้า (Warehouse)
                                    </div>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                                        {selectedDoc.warehouseName || '-'}
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                                        <Truck className="w-3.5 h-3.5" />
                                        ผู้จำหน่าย (Vendor)
                                    </div>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                                        {selectedDoc.vendName || `Vendor ID: ${selectedDoc.vendId || '-'}`}
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

                            {/* รายการสินค้าที่รับเข้า */}
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                                    รายการสินค้าที่รับเข้า (Received Items)
                                </h4>
                                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-zinc-50 dark:bg-zinc-800">
                                            <TableRow>
                                                <TableHead className="py-2 px-3 text-xs">ลำดับ</TableHead>
                                                <TableHead className="py-2 px-3 text-xs">ชื่อสินค้า</TableHead>
                                                <TableHead className="py-2 px-3 text-xs">LotNo</TableHead>
                                                <TableHead className="py-2 px-3 text-xs">SerialNo</TableHead>
                                                <TableHead className="py-2 px-3 text-xs text-right">จำนวน</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {docItemList.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="py-4 text-center text-xs text-zinc-400">
                                                        ไม่พบรายการสินค้าในเอกสารนี้
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                docItemList.map((detail, idx) => (
                                                    <TableRow key={detail.id || idx}>
                                                        <TableCell className="py-2.5 px-3 text-xs text-zinc-500">{idx + 1}</TableCell>
                                                        <TableCell className="py-2.5 px-3 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                                            {detail.itemName}
                                                        </TableCell>
                                                        <TableCell className="py-2.5 px-3 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                                            {detail.lotNo || '-'}
                                                        </TableCell>
                                                        <TableCell className="py-2.5 px-3 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                                            {detail.serialNo || '-'}
                                                        </TableCell>
                                                        <TableCell className="py-2.5 px-3 text-xs text-right font-bold text-zinc-900 dark:text-zinc-100">
                                                            {(detail.itemQty ?? 0).toLocaleString()}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className={`flex items-center ${isSelectedLocked ? 'justify-end sm:justify-end' : 'justify-between sm:justify-between'}`}>
                            <Button
                                hidden={isSelectedLocked}
                                variant="outline"
                                onClick={() => {
                                    setIsDetailOpen(false);
                                    router.push(`/transaction/receive/form?id=${selectedDoc.id}`);
                                }}
                                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            >
                                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                แก้ไขเอกสารนี้
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsDetailOpen(false)}
                                className="px-4 py-2 text-sm"
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
