'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { transactionService } from '@/app/_services/transaction';
import { SystemMenuService } from '@/app/_services/systemMenu';
import { masterService } from '@/app/_services/master';
import { ServiceSystem } from '@/app/_services/ServiceSystem';
import { getField, extractList, extractTotal } from '@/lib/utils';
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
    Calendar,
    FileText,
    Building2,
    Truck,
    ExternalLink,
} from 'lucide-react';

const RECEIVE_MENU_ID = '00E03A994280450ABF7E2EE62A7AD4D6';
const ISSUE_MENU_ID = '85D356B7877647C49B61B71FB047E0B6';

export interface TransactionDocView extends Record<string, unknown> {
    id?: string;
    docNo?: string;
    docDate?: string;
    refDocNo?: string;
    menuId?: string;
    menuName?: string;
    docTypeId?: string;
    docTypeName?: string;
    empId?: string;
    empName?: string;
    vendId?: string | null;
    vendName?: string | null;
    custId?: string | null;
    custName?: string | null;
    warehouseId?: string;
    warehouseName?: string;
    statusCode?: string;
    statusName?: string;
    statusNameTh?: string;
    statusNameEn?: string;
    statusId?: string;
    remark?: string;
    isActive?: boolean;
    isQualityControl?: boolean;
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

/**
 * สร้างลิงก์ไปยังหน้ารายละเอียดเอกสารตามประเภทเมนู (Receive / Issue)
 */
function getDirectLink(item: Record<string, unknown>, rawMenuId?: unknown): string | null {
    const id = item.id;
    if (!id) return null;

    const menuIdStr = String(rawMenuId ?? item.menuId ?? '').toUpperCase();
    const menuNameStr = String(item.menuName ?? '').toLowerCase();

    if (
        menuIdStr === RECEIVE_MENU_ID ||
        menuIdStr === '1' ||
        menuNameStr.includes('receive') ||
        menuNameStr.includes('รับ')
    ) {
        return `/transaction/receive/${id}`;
    }

    if (
        menuIdStr === ISSUE_MENU_ID ||
        menuIdStr === '2' ||
        menuNameStr.includes('issue') ||
        menuNameStr.includes('เบิก')
    ) {
        return `/transaction/issue/${id}`;
    }

    return null;
}

export default function TransactionPage() {
    const router = useRouter();
    const { setPageTitle } = useLayout();

    // Form Filter States
    const [docNoInput, setDocNoInput] = useState<string>('');
    const [docDateInput, setDocDateInput] = useState<string>('');
    const [menuSelect, setMenuSelect] = useState<string>('');
    const [empSelect, setEmpSelect] = useState<string>('');

    // Master Dropdown Options
    const [menuList, setMenuList] = useState<{ id: string | number; name: string }[]>([]);
    const [warehouseList, setWarehouseList] = useState<MastWarehouse[]>([]);
    const [employeeList, setEmployeeList] = useState<MastEmployee[]>([]);
    const [docTypeList, setDocTypeList] = useState<MastDocType[]>([]);

    // Document Data State
    const [docList, setDocList] = useState<TransactionDocView[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Pagination States
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [totalRecords, setTotalRecords] = useState<number>(0);

    // Detail Modal State
    const [selectedDoc, setSelectedDoc] = useState<TransactionDocView | null>(null);
    const [selectedDocItems, setSelectedDocItems] = useState<
        { id?: string | number; itemName?: string; itemQty?: number }[]
    >([]);
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

    useEffect(() => {
        setPageTitle('รายการธุรกรรม (Transactions)');
    }, [setPageTitle]);

    // 1. โหลดข้อมูลตัวเลือก Master Helpers
    useEffect(() => {
        const loadMasterHelpers = async () => {
            try {
                const [menuRes, whRes, empRes, docTypeRes] = await Promise.all([
                    SystemMenuService.menuTransactionList().catch(() => null),
                    masterService.warehouses.list().catch(() => null),
                    masterService.employees.list().catch(() => null),
                    masterService.docTypes.list().catch(() => null),
                ]);

                const menus = extractList<SysMenu>(menuRes);
                if (menus.length > 0) {
                    setMenuList(
                        menus.map((item) => {
                            const raw = item as unknown as Record<string, unknown>;
                            const name =
                                item.nameTh && item.nameEn
                                    ? `${item.nameTh} (${item.nameEn})`
                                    : item.nameTh ||
                                      item.nameEn ||
                                      String(raw.menuName || raw.name || `Menu ${item.id}`);
                            return { id: String(item.id), name };
                        })
                    );
                }

                setWarehouseList(extractList<MastWarehouse>(whRes));
                setEmployeeList(extractList<MastEmployee>(empRes));
                setDocTypeList(extractList<MastDocType>(docTypeRes));
            } catch (err) {
                console.warn('Failed to load master helpers for transaction page:', err);
            }
        };

        loadMasterHelpers();
    }, []);

    // 2. โหลดข้อมูลรายการธุรกรรม
    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const payload: DocTrans & { pageSize?: number; pageNumber?: number } = {
                docNo: docNoInput.trim() || undefined,
                docDate: docDateInput || undefined,
                empId: empSelect || undefined,
                menuId: menuSelect || undefined,
                page: currentPage,
                pageNumber: currentPage,
                size: pageSize,
                pageSize,
                limit: pageSize,
            };

            const res = await transactionService.docTrans.list(payload);
            if (res?.success) {
                const items = extractList<TransactionDocView>(res);
                setDocList(items);
                setTotalRecords(extractTotal(res) ?? items.length);
            } else {
                setDocList([]);
                setTotalRecords(0);
            }
        } catch (error) {
            console.error('Fetch transaction list failed:', error);
            setDocList([]);
            setTotalRecords(0);
        } finally {
            setLoading(false);
        }
    }, [docNoInput, docDateInput, menuSelect, empSelect, currentPage, pageSize]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchDocuments();
    }, [fetchDocuments]);

    const handleResetFilter = () => {
        setDocNoInput('');
        setDocDateInput('');
        setMenuSelect('');
        setEmpSelect('');
        setCurrentPage(1);
    };

    const handleViewDetail = async (doc: TransactionDocView) => {
        setSelectedDoc(doc);
        setIsDetailOpen(true);

        const rawDetails = (doc.details || (doc as Record<string, unknown>).items) as
            | Array<Record<string, unknown>>
            | undefined;
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

        // โหลดรายการสินค้าจาก API ตามประเภทเอกสาร
        setSelectedDocItems([]);
        if (!doc.id) return;

        try {
            const link = getDirectLink(doc, doc.menuId);
            if (link?.includes('/receive/')) {
                const res = await transactionService.receive.listItem({ docId: String(doc.id) });
                setSelectedDocItems(extractList(res));
            } else if (link?.includes('/issue/')) {
                const res = await transactionService.issue.listItem({ docId: String(doc.id) });
                setSelectedDocItems(extractList(res));
            }
        } catch {
            setSelectedDocItems([]);
        }
    };

    const resolvedDocList = useMemo(() => {
        return docList.map((item) => {
            const rec = item as Record<string, unknown>;

            const rawMenuId = getField(rec, 'menuId', 'menu_id', 'transTypeId');
            const menuNameVal = getField<string>(rec, 'menuName', 'menu_name', 'transTypeName');
            const matchedMenu = menuList.find((m) => String(m.id) === String(rawMenuId));
            const menuLabel = menuNameVal || matchedMenu?.name || (rawMenuId ? `Menu #${rawMenuId}` : '-');

            const docNoVal = String(getField(rec, 'docNo', 'doc_no') || '-');

            const rawDocTypeId = getField(rec, 'docTypeId', 'doc_type_id');
            const docTypeNameVal = getField<string>(rec, 'docTypeName', 'doc_type_name', 'docType');
            const matchedDocType = docTypeList.find((d) => String(d.id) === String(rawDocTypeId));
            const docTypeLabel =
                docTypeNameVal ||
                matchedDocType?.docTypeName ||
                matchedDocType?.name ||
                (rawDocTypeId ? `Type #${rawDocTypeId}` : '-');

            const rawDate = String(getField(rec, 'docDate', 'doc_date', 'createDate') || '');
            const docDateStr = rawDate.length >= 10 ? rawDate.slice(0, 10) : rawDate;
            const formattedDate = docDateStr ? ServiceSystem.formatThaiDate(docDateStr) : '-';

            const rawEmpId = getField(rec, 'empId', 'emp_id', 'employeeId');
            const empNameVal = getField<string>(rec, 'employeeName', 'empName', 'employee');
            const matchedEmp = employeeList.find((e) => String(e.id) === String(rawEmpId));
            const employeeLabel =
                empNameVal ||
                (matchedEmp ? `${matchedEmp.fName || ''} ${matchedEmp.lName || ''}`.trim() : '') ||
                (rawEmpId ? `Emp #${rawEmpId}` : '-');

            const rawWhId = getField(rec, 'warehouseId', 'warehouse_id', 'fromWarehouseId');
            const whNameVal = getField<string>(rec, 'warehouseName', 'warehouse_name', 'warehouse');
            const matchedWh = warehouseList.find((w) => String(w.id) === String(rawWhId));
            const warehouseLabel =
                whNameVal || matchedWh?.warehouseName || (rawWhId ? `คลัง #${rawWhId}` : '-');

            const statusCodeVal = String(
                getField(rec, 'statusCode', 'status_code', 'statusName', 'statusId') || 'Draft'
            );
            const remarkVal = String(getField(rec, 'remark', 'remark_text', 'note') || '');
            const directLink = getDirectLink(rec, rawMenuId);

            return {
                item,
                rawMenuId,
                menuLabel,
                docNoVal,
                docTypeLabel,
                formattedDate,
                employeeLabel,
                warehouseLabel,
                statusCodeVal,
                remarkVal,
                directLink,
            };
        });
    }, [docList, menuList, docTypeList, employeeList, warehouseList]);

    return (
        <AppLayout>
            {/* Page Header */}
            <div className="mb-4 sm:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        รายการธุรกรรม (Transactions)
                    </h1>
                    <p className="text-xs sm:text-sm mt-1 text-zinc-500 dark:text-zinc-400">
                        ค้นหาและตรวจสอบเอกสารความเคลื่อนไหวสินค้าทั้งหมดในระบบ (All Inventory Transaction Documents)
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <Button
                        onClick={() => router.push('/transaction/receive/form')}
                        className="flex-1 sm:flex-none justify-center px-3.5 py-2 text-xs font-medium text-white rounded-xl shadow-sm bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        สร้างใบรับสินค้า
                    </Button>
                    <Button
                        onClick={() => router.push('/transaction/issue/form')}
                        variant="outline"
                        className="flex-1 sm:flex-none justify-center px-3.5 py-2 text-xs font-medium rounded-xl border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        สร้างใบเบิกสินค้า
                    </Button>
                </div>
            </div>

            {/* 1. Filter / Search Section */}
            <Card className="mb-6 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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
                            onClick={() => {
                                if (currentPage !== 1) setCurrentPage(1);
                                else fetchDocuments();
                            }}
                            className="flex-1 sm:flex-none h-8 px-4 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Search className="w-3.5 h-3.5 mr-1" />
                            ค้นหา
                        </Button>
                    </div>
                </div>

                <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                        {/* 1. Menu */}
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
                                {menuList.map((opt) => (
                                    <option key={opt.id} value={String(opt.id)}>
                                        {opt.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 2. DocNo */}
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="docno-input" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    Doc No.
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
                                        onClick={() => {
                                            setDocNoInput('');
                                            setCurrentPage(1);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 3. DocDate */}
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="docdate-input" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    Doc Date
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
                                        onClick={() => {
                                            setDocDateInput('');
                                            setCurrentPage(1);
                                        }}
                                        className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 4. Employee */}
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="emp-select" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    Employee
                                </Label>
                                <span className="text-xs text-zinc-400">พนักงานผู้ทำรายการ</span>
                            </div>
                            <select
                                id="emp-select"
                                value={empSelect}
                                onChange={(e) => {
                                    setEmpSelect(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full h-10 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer transition-all"
                            >
                                <option value="">-- ทั้งหมด (All Employees) --</option>
                                {employeeList.map((opt) => (
                                    <option key={opt.id} value={String(opt.id)}>
                                        {opt.fName} {opt.lName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Table Section */}
            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-50/50 dark:bg-zinc-800/40">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <h2 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                            รายการเอกสารธุรกรรมทั้งหมด (All Documents)
                        </h2>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        พบทั้งหมด {totalRecords} รายการ
                    </span>
                </div>

                <CardContent className="p-0 w-full">
                    {/* Mobile Card View */}
                    <div className="md:hidden">
                        {loading ? (
                            <div className="h-48 flex flex-col items-center justify-center gap-2 text-zinc-500 p-4">
                                <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm">กำลังโหลดข้อมูลเอกสาร...</span>
                            </div>
                        ) : resolvedDocList.length === 0 ? (
                            <div className="h-48 flex flex-col items-center justify-center gap-2 text-zinc-500 p-6 text-center">
                                <FileText className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                    ไม่พบข้อมูลเอกสารที่ตรงกับเงื่อนไข
                                </p>
                                {(docNoInput || docDateInput || menuSelect || empSelect) && (
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
                        ) : (
                            <div className="p-3 space-y-3 bg-zinc-50/40 dark:bg-zinc-950/20">
                                {resolvedDocList.map((row, index) => (
                                    <div
                                        key={`card-${row.rawMenuId ?? row.item.menuId ?? 'm'}-${row.item.docNo || row.item.id || index}-${index}`}
                                        onClick={() => handleViewDetail(row.item)}
                                        className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-3 shadow-xs cursor-pointer active:bg-zinc-50/80 dark:active:bg-zinc-800/40 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 space-y-1">
                                                <div className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                                                    {row.docNoVal}
                                                </div>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                    {row.menuLabel}
                                                </span>
                                            </div>
                                            <div className="shrink-0">{renderStatusBadge(row.statusCodeVal)}</div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                <span className="truncate">{row.formattedDate}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 min-w-0 justify-end">
                                                <span className="truncate text-zinc-700 dark:text-zinc-300 font-medium">
                                                    {row.docTypeLabel}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 min-w-0 col-span-2">
                                                <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                <span className="truncate">{row.warehouseLabel}</span>
                                                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                                                <span className="truncate">{row.employeeLabel}</span>
                                            </div>
                                        </div>

                                        {row.remarkVal && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-2.5 py-1.5">
                                                หมายเหตุ: {row.remarkVal}
                                            </p>
                                        )}

                                        <div
                                            className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleViewDetail(row.item)}
                                                className="flex-1 h-9 px-3 rounded-lg border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs"
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                                                รายละเอียด
                                            </Button>
                                            {row.directLink && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => router.push(row.directLink!)}
                                                    className="flex-1 h-9 px-3 rounded-lg border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                                    เปิดหน้าเอกสาร
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table className="w-full">
                            <TableHeader className="bg-zinc-100/80 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                                <TableRow>
                                    {COLUMNS.map((col) => (
                                        <TableHead
                                            key={col.key}
                                            style={{ width: `${col.width}px` }}
                                            className={`font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 py-3.5 px-4 ${
                                                col.key === 'action' ? 'text-right' : 'text-left'
                                            }`}
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
                                ) : resolvedDocList.length === 0 ? (
                                    <TableRow key="empty-row">
                                        <TableCell colSpan={COLUMNS.length} className="h-48 text-center text-zinc-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <FileText className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                                                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                                    ไม่พบข้อมูลเอกสารที่ตรงกับเงื่อนไข
                                                </p>
                                                {(docNoInput || docDateInput || menuSelect || empSelect) && (
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
                                    resolvedDocList.map((row, index) => (
                                        <TableRow
                                            key={`doc-${row.rawMenuId ?? row.item.menuId ?? 'm'}-${row.item.docNo || row.item.id || index}-${index}`}
                                            className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                                            onClick={() => handleViewDetail(row.item)}
                                        >
                                            <TableCell className="py-3.5 px-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                    {row.menuLabel}
                                                </span>
                                            </TableCell>

                                            <TableCell className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-sm whitespace-nowrap">
                                                <span className="text-blue-600 dark:text-blue-400 group-hover:underline">
                                                    {row.docNoVal}
                                                </span>
                                            </TableCell>

                                            <TableCell className="py-3.5 px-4 text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                                {row.docTypeLabel}
                                            </TableCell>

                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                    <span>{row.formattedDate}</span>
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                                {row.employeeLabel}
                                            </TableCell>

                                            <TableCell className="py-3.5 px-4 text-sm text-zinc-700 dark:text-zinc-300">
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                    <span className="truncate max-w-[200px]" title={row.warehouseLabel}>
                                                        {row.warehouseLabel}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            <TableCell className="py-3.5 px-4 whitespace-nowrap">
                                                {renderStatusBadge(row.statusCodeVal)}
                                            </TableCell>

                                            <TableCell
                                                className="py-3.5 px-4 text-xs text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate"
                                                title={row.remarkVal}
                                            >
                                                {row.remarkVal || '-'}
                                            </TableCell>

                                            <TableCell
                                                className="py-3.5 px-4 text-right"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleViewDetail(row.item)}
                                                        className="h-8 px-2.5 rounded-lg border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs"
                                                        title="ดูรายละเอียดเอกสาร"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                                                        รายละเอียด
                                                    </Button>
                                                    {row.directLink && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => router.push(row.directLink!)}
                                                            className="h-8 px-2 rounded-lg border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs"
                                                            title="เปิดหน้าเอกสารนี้"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
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

            {/* Modal: ดูรายละเอียดเอกสาร */}
            {selectedDoc && (
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-2xl p-4 sm:p-6 max-h-[90dvh] overflow-y-auto overscroll-contain bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                        <DialogHeader className="pr-8">
                            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                                <span className="truncate">
                                    รายละเอียดเอกสาร ({selectedDoc.docNo || selectedDoc.id || '-'})
                                </span>
                            </DialogTitle>
                        </DialogHeader>

                        <div className="py-3 sm:py-4 space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700">
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
                                        {selectedDoc.menuName ||
                                            menuList.find((m) => String(m.id) === String(selectedDoc.menuId))?.name ||
                                            '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold text-zinc-400">สถานะ</span>
                                    <div className="mt-0.5">
                                        {renderStatusBadge(
                                            selectedDoc.statusCode || selectedDoc.statusName || selectedDoc.statusId || 'Draft'
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <span className="block text-xs font-semibold text-zinc-500 mb-1">
                                        ประเภทเอกสาร
                                    </span>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                        {selectedDoc.docTypeName ||
                                            docTypeList.find((d) => String(d.id) === String(selectedDoc.docTypeId))?.docTypeName ||
                                            '-'}
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                                        <Building2 className="w-3.5 h-3.5" />
                                        คลังสินค้า (Warehouse)
                                    </div>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                        {selectedDoc.warehouseName ||
                                            warehouseList.find((w) => String(w.id) === String(selectedDoc.warehouseId))?.warehouseName ||
                                            '-'}
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                                        <Truck className="w-3.5 h-3.5" />
                                        ผู้จำหน่าย / พนักงาน
                                    </div>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                        {selectedDoc.empName || selectedDoc.vendName || selectedDoc.custName || '-'}
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
                                    รายการสินค้าในเอกสาร (Items in Document)
                                </h4>
                                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-x-auto max-h-60 overflow-y-auto">
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
                                                    <TableCell className="py-2.5 px-3 text-xs text-center text-zinc-500">
                                                        {idx + 1}
                                                    </TableCell>
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

                        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:-mx-6 sm:-mb-6 sm:px-6">
                            <Button
                                variant="outline"
                                onClick={() => setIsDetailOpen(false)}
                                className="w-full sm:w-auto sm:order-2 px-4 py-2 text-xs"
                            >
                                ปิดหน้าต่าง
                            </Button>
                            {getDirectLink(selectedDoc, selectedDoc.menuId) && (
                                <Button
                                    variant="default"
                                    onClick={() => {
                                        const url = getDirectLink(selectedDoc, selectedDoc.menuId);
                                        if (url) router.push(url);
                                    }}
                                    className="w-full sm:w-auto sm:order-1 sm:mr-auto bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center justify-center gap-1.5"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    เปิดหน้าเอกสารฉบับเต็ม
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </AppLayout>
    );
}
