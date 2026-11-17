'use client';

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { transactionService } from '@/app/_services/transaction';
import { masterService } from '@/app/_services/master';
import { ServiceSystem } from '@/app/_services/ServiceSystem';
import { getField, extractList, extractTotal } from '@/lib/utils';
import type {
    DocReceive,
    DocTrans,
    DocReceiveDetail,
    MastVendor,
    MastEmployee,
    MastDocType,
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
    DatePicker,
    SearchableSelect,
    SearchableSelectOption,
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
    Pencil,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const MENU_ID = '00E03A994280450ABF7E2EE62A7AD4D6';

const LOCKED_STATUSES = ['CANCEL', 'CANCELLED', 'CONFIRM', 'COMPLETE', 'COMPLETED', 'PARTIAL_PUTAWAY'];

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

function FilterField({
    id,
    label,
    subLabel,
    children,
}: {
    id: string;
    label: string;
    subLabel: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col space-y-1.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
                <Label htmlFor={id} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
                    {label}
                </Label>
                <span className="text-xs text-zinc-400 truncate">{subLabel}</span>
            </div>
            {children}
        </div>
    );
}

export default function ReceivePage() {
    const router = useRouter();
    const { pageTitle } = useLayout();

    // Filter inputs
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
            }
        };
        loadFilterMasters();
    }, []);

    // ─── 2. Dropdown Options ────────────────────────────────────
    const employeeOptions = useMemo<SearchableSelectOption[]>(
        () =>
            employeeList.map((e) => ({
                value: String(e.id),
                label:
                    `${e.empCode ? `[${e.empCode}] ` : ''}${e.fName || ''} ${e.lName || ''}`.trim() ||
                    String(e.id),
                subLabel: e.tel ? `โทร: ${e.tel}` : undefined,
            })),
        [employeeList]
    );

    const vendorOptions = useMemo<SearchableSelectOption[]>(
        () =>
            vendorList.map((v) => ({
                value: String(v.id),
                label:
                    `${v.vendCode ? `[${v.vendCode}] ` : ''}${v.vendName || ''}`.trim() ||
                    String(v.id),
                subLabel: v.contactName
                    ? `ผู้ติดต่อ: ${v.contactName}${v.tel ? ` (${v.tel})` : ''}`
                    : v.tel
                        ? `โทร: ${v.tel}`
                        : undefined,
            })),
        [vendorList]
    );

    const docTypeOptions = useMemo<SearchableSelectOption[]>(
        () =>
            docTypeList.map((dt) => ({
                value: String(dt.id),
                label: dt.docTypeName || dt.name || String(dt.id),
            })),
        [docTypeList]
    );

    // ─── 3. โหลดเอกสาร (Server Pagination) ──────────────────────
    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const payload: DocTrans & { pageSize?: number; pageNumber?: number } = {
                docNo: appliedFilters.docNo.trim() || undefined,
                docDate: appliedFilters.docDate || undefined,
                empId: appliedFilters.employeeId || undefined,
                vendId: appliedFilters.vendorId || undefined,
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
                setDocList([]);
                setTotalRecords(0);
                return;
            }

            const data = extractList<DocReceive>(res);
            setDocList(data);

            const total = extractTotal(res);
            setTotalRecords(
                total !== undefined
                    ? total
                    : data.length === pageSize
                        ? currentPage * pageSize + 1
                        : (currentPage - 1) * pageSize + data.length
            );
        } catch (error) {
            console.error('Fetch receive documents failed:', error);
            setDocList([]);
            setTotalRecords(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, appliedFilters]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchDocuments();
    }, [fetchDocuments]);

    // ─── 4. โหลดรายการสินค้าเมื่อเปิด Modal ─────────────────────
    useEffect(() => {
        const fetchItems = async () => {
            if (!isDetailOpen || !selectedDoc?.id) {
                setDocItemList([]);
                return;
            }
            try {
                const res = await transactionService.receive.listItem({ docId: selectedDoc.id });
                setDocItemList(extractList<DocReceiveDetail>(res));
            } catch (err) {
                console.error('Failed to load receive doc items:', err);
                setDocItemList([]);
            }
        };
        fetchItems();
    }, [isDetailOpen, selectedDoc]);

    // ─── Handlers ───────────────────────────────────────────────
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
    const isSelectedLocked = LOCKED_STATUSES.includes(
        String(selectedDoc?.statusCode || '').toUpperCase()
    );

    const resolvedDocList = useMemo(
        () =>
            docList.map((item) => {
                const rec = item as unknown as Record<string, unknown>;
                const str = (...keys: string[]) => String(getField(rec, ...keys) || '-');
                const statusCode = str('statusCode', 'status', 'statusName');
                const isLocked = LOCKED_STATUSES.includes(statusCode.toUpperCase());
                const docDateVal = str('docDate', 'doc_date', 'createDate');
                return {
                    item,
                    docNo: str('docNo', 'doc_no'),
                    docType: str('docTypeName', 'menuName', 'menu_name', 'menuId'),
                    docDateFormatted: ServiceSystem.formatThaiDate(docDateVal),
                    refDoc: str('docNoRef', 'doc_no_ref', 'refDocNo', 'refDoc'),
                    employee: str('empName', 'employeeName', 'employeeId'),
                    vendor: str('vendName', 'vendorName', 'vendor', 'vendId', 'vendorId'),
                    warehouse: str('warehouseName', 'warehouse', 'warehouseId'),
                    statusCode,
                    isLocked,
                    remarkVal: str('remark'),
                };
            }),
        [docList]
    );

    return (
        <AppLayout>
            {/* Page Header */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {pageTitle || 'รับสินค้าเข้าคลัง (Goods Receive)'}
                    </h1>
                    <p className="text-xs sm:text-sm mt-1 text-zinc-500 dark:text-zinc-400">
                        ค้นหาและจัดการเอกสารรับสินค้าตามรหัสเอกสาร วันที่ และประเภทเอกสาร
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button
                        onClick={() => router.push('/transaction/receive/form')}
                        className="w-full sm:w-auto justify-center px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        สร้างใบรับสินค้า
                    </Button>
                </div>
            </div>

            {/* 1. Filter Section */}
            <Card className="mb-6 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                            เงื่อนไขการค้นหาเอกสาร (Search Criteria)
                        </span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetFilter}
                            className="flex-1 sm:flex-none h-8 px-3 text-xs rounded-lg border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            ล้างค่า (Reset)
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSearch}
                            className="flex-1 sm:flex-none h-8 px-4 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Search className="w-3.5 h-3.5 mr-1" />
                            ค้นหา
                        </Button>
                    </div>
                </div>

                <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
                                searchPlaceholder="ค้นหารหัส หรือชื่อผู้จำหน่าย..."
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

            {/* 2. Table Section */}
            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-50/50 dark:bg-zinc-800/40">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <h2 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                            รายการเอกสารรับสินค้า (Receive Documents)
                        </h2>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchDocuments()}
                        disabled={loading}
                        className="self-start sm:self-auto h-8 px-3 text-xs rounded-lg border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <RotateCcw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                        รีเฟรช
                    </Button>
                </div>

                <CardContent className="p-0">
                    {/* Mobile Card View */}
                    <div className="md:hidden">
                        {loading ? (
                            <div className="h-56 flex flex-col items-center justify-center gap-2 text-zinc-400 p-4">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs">กำลังโหลดข้อมูลเอกสาร...</span>
                            </div>
                        ) : resolvedDocList.length === 0 ? (
                            <div className="h-56 flex flex-col items-center justify-center gap-2 text-zinc-400 p-6 text-center">
                                <FileText className="w-8 h-8 stroke-[1.5] text-zinc-300 dark:text-zinc-600" />
                                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                    ไม่พบข้อมูลเอกสาร
                                </p>
                                <p className="text-xs text-zinc-400">
                                    {hasActiveFilters
                                        ? 'ลองปรับเปลี่ยนเงื่อนไขการค้นหาใหม่'
                                        : 'ยังไม่มีรายการเอกสารรับสินค้าในระบบ'}
                                </p>
                            </div>
                        ) : (
                            <div className="p-3 space-y-3 bg-zinc-50/40 dark:bg-zinc-950/20">
                                {resolvedDocList.map((row, index) => (
                                    <div
                                        key={row.item.id ?? `card-${index}`}
                                        onClick={() => handleViewDetail(row.item)}
                                        className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-3 shadow-xs cursor-pointer active:bg-zinc-50/80 dark:active:bg-zinc-800/40 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 space-y-1">
                                                <div className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                                                    {row.docNo}
                                                </div>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                    <Layers className="w-3 h-3 text-blue-500 shrink-0" />
                                                    {row.docType}
                                                </span>
                                            </div>
                                            <div className="shrink-0">{renderStatusBadge(row.statusCode)}</div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                <span className="truncate">{row.docDateFormatted}</span>
                                            </div>
                                            {row.refDoc !== '-' && (
                                                <div className="text-right font-mono truncate text-zinc-500">
                                                    Ref: {row.refDoc}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5 min-w-0 col-span-2">
                                                <Truck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                <span className="truncate text-zinc-800 dark:text-zinc-200 font-medium">
                                                    {row.vendor}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 min-w-0 col-span-2">
                                                <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                <span className="truncate">{row.warehouse}</span>
                                                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                                                <span className="truncate">{row.employee}</span>
                                            </div>
                                        </div>

                                        {row.remarkVal !== '-' && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-2.5 py-1.5">
                                                หมายเหตุ: {row.remarkVal}
                                            </p>
                                        )}

                                        <div
                                            className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {!row.isLocked && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        router.push(`/transaction/receive/form?id=${row.item.id}`)
                                                    }
                                                    className="flex-1 h-9 px-3 text-xs rounded-lg border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                                >
                                                    <Pencil className="w-3.5 h-3.5 mr-1" />
                                                    แก้ไข
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => router.push(`/transaction/receive/${row.item.id}`)}
                                                className="flex-1 h-9 px-3 text-xs rounded-lg border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                                                รายละเอียด
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 hover:bg-transparent">
                                    {COLUMNS.map((col) => (
                                        <TableHead
                                            key={col.key}
                                            style={{ width: col.width }}
                                            className={`py-3.5 px-4 font-semibold text-xs tracking-wider uppercase text-zinc-500 dark:text-zinc-400 ${
                                                col.key === 'action' ? 'text-right' : ''
                                            }`}
                                        >
                                            {col.colName}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow key="loading-row">
                                        <TableCell colSpan={COLUMNS.length} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-zinc-400">
                                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                <span className="text-xs">กำลังโหลดข้อมูลเอกสาร...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : resolvedDocList.length === 0 ? (
                                    <TableRow key="empty-row">
                                        <TableCell colSpan={COLUMNS.length} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-zinc-400">
                                                <FileText className="w-8 h-8 stroke-[1.5] text-zinc-300 dark:text-zinc-600" />
                                                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                                    ไม่พบข้อมูลเอกสาร
                                                </p>
                                                <p className="text-xs text-zinc-400">
                                                    {hasActiveFilters
                                                        ? 'ลองปรับเปลี่ยนเงื่อนไขการค้นหาใหม่'
                                                        : 'ยังไม่มีรายการเอกสารรับสินค้าในระบบ'}
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    resolvedDocList.map((row, index) => (
                                        <TableRow
                                            key={row.item.id ?? `row-${index}`}
                                            className="group hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors border-b border-zinc-100 dark:border-zinc-800/80 cursor-pointer"
                                            onClick={() => handleViewDetail(row.item)}
                                        >
                                            <TableCell className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                                                <span className="text-blue-600 dark:text-blue-400 group-hover:underline">
                                                    {row.docNo}
                                                </span>
                                            </TableCell>

                                            <TableCell className="py-3.5 px-4 text-xs">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                    <Layers className="w-3 h-3 text-blue-500" />
                                                    {row.docType}
                                                </span>
                                            </TableCell>

                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                                    <span>{row.docDateFormatted}</span>
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-600 dark:text-zinc-400 font-mono">
                                                {row.refDoc}
                                            </TableCell>

                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-700 dark:text-zinc-300">
                                                {row.employee}
                                            </TableCell>

                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-700 dark:text-zinc-300">
                                                {row.vendor}
                                            </TableCell>

                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-700 dark:text-zinc-300">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                    {row.warehouse}
                                                </span>
                                            </TableCell>

                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-700 dark:text-zinc-300">
                                                {renderStatusBadge(row.statusCode)}
                                            </TableCell>

                                            <TableCell
                                                className="py-3.5 px-4 text-xs text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate"
                                                title={row.remarkVal}
                                            >
                                                {row.remarkVal}
                                            </TableCell>

                                            <TableCell
                                                className="py-3.5 px-4 text-right"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        hidden={row.isLocked}
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            router.push(`/transaction/receive/form?id=${row.item.id}`)
                                                        }
                                                        className="px-4 py-2 text-sm rounded-xl border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1.5"
                                                        title="แก้ไขเอกสาร"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                                                        แก้ไข
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => router.push(`/transaction/receive/${row.item.id}`)}
                                                        className="h-8 px-2.5 rounded-lg border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                                        title="ดูรายละเอียดเอกสาร"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                                                        รายละเอียด
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>

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

            {/* Detail Modal (View Quick Detail) */}
            {selectedDoc && (
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-4xl p-4 sm:p-6 max-h-[90dvh] overflow-y-auto overscroll-contain rounded-2xl">
                        <DialogHeader className="pr-8">
                            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                                รายละเอียดใบรับสินค้า (Goods Receive Detail)
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 my-2">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                                        <FileText className="w-3.5 h-3.5" />
                                        เลขที่เอกสาร
                                    </div>
                                    <p className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                        {selectedDoc.docNo || `#${selectedDoc.id}`}
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        วันที่เอกสาร
                                    </div>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200 text-sm">
                                        {selectedDoc.docDate
                                            ? ServiceSystem.formatThaiDate(selectedDoc.docDate)
                                            : '-'}
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                                        <Building2 className="w-3.5 h-3.5" />
                                        คลังสินค้า
                                    </div>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200 text-sm">
                                        {selectedDoc.warehouseName || selectedDoc.warehouseId || '-'}
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <div className="text-xs font-semibold text-zinc-500 mb-1">สถานะ</div>
                                    {renderStatusBadge(selectedDoc.statusCode || selectedDoc.statusName)}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                                        <Layers className="w-3.5 h-3.5" />
                                        ประเภทเอกสาร
                                    </div>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                                        {selectedDoc.menuName || selectedDoc.menuId || '-'}
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                                        <Truck className="w-3.5 h-3.5" />
                                        ผู้จัดจำหน่าย (Vendor)
                                    </div>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                                        {selectedDoc.vendName || selectedDoc.vendId || '-'}
                                    </p>
                                </div>
                            </div>

                            {selectedDoc.remark && (
                                <div className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-700">
                                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">หมายเหตุ: </span>
                                    {selectedDoc.remark}
                                </div>
                            )}

                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                                    รายการสินค้าที่รับเข้า (Received Items)
                                </h4>
                                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-x-auto">
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
                                                        <TableCell className="py-2.5 px-3 text-xs text-zinc-500">
                                                            {idx + 1}
                                                        </TableCell>
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

                        <DialogFooter
                            className={`flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:-mx-6 sm:-mb-6 sm:px-6 ${
                                isSelectedLocked ? 'sm:justify-end' : 'sm:justify-between'
                            }`}
                        >
                            <Button
                                variant="outline"
                                onClick={() => setIsDetailOpen(false)}
                                className="w-full sm:w-auto sm:order-2 px-4 py-2 text-sm"
                            >
                                ปิดหน้าต่าง
                            </Button>
                            {!isSelectedLocked && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsDetailOpen(false);
                                        router.push(`/transaction/receive/form?id=${selectedDoc.id}`);
                                    }}
                                    className="w-full sm:w-auto sm:order-1 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                >
                                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                    แก้ไขเอกสารนี้
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </AppLayout>
    );
}
