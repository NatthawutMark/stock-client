'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { useLayout } from '@/app/providers';
import { transactionService } from '@/app/_services/transaction';
import { SystemMenuService } from '@/app/_services/systemMenu';
import { masterService } from '@/app/_services/master';
import { docReceives, docReceiveDetails } from '@/lib/mock/data';
import type { DocReceive, MastWarehouse, MastVendor, MastTransType } from '@/lib/types';
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
} from '@/components/ui';
import Swal from 'sweetalert2';
import {
    Search,
    RotateCcw,
    Plus,
    Eye,
    Layers,
    Calendar,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    Building2,
    Truck,
} from 'lucide-react';

// Helper เพื่อดึงค่าฟิลด์แบบ non-case-sensitive และรองรับทั้ง camelCase, PascalCase, snake_case
function getField<T = unknown>(item: Record<string, unknown>, ...keys: string[]): T | undefined {
    for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null) {
            return item[key] as T;
        }
    }
    // ค้นหาแบบไม่สนตัวพิมพ์เล็ก-ใหญ่ (case-insensitive fallback)
    const itemKeys = Object.keys(item);
    for (const key of keys) {
        const foundKey = itemKeys.find((k) => k.toLowerCase() === key.toLowerCase());
        if (foundKey && item[foundKey] !== undefined && item[foundKey] !== null) {
            return item[foundKey] as T;
        }
    }
    return undefined;
}

export default function ReceivePage() {
    const { pageTitle } = useLayout();

    // ─────────────────────────────────────────────────────────────
    // Form Filter States (ตรงตามกล่องด้านบนของ Wireframe)
    // ─────────────────────────────────────────────────────────────
    const [docNoInput, setDocNoInput] = useState<string>('');
    const [docDateInput, setDocDateInput] = useState<string>('');
    const [menuSelect, setMenuSelect] = useState<string>('');

    // Menu Dropdown Options
    const [menuOptions, setMenuOptions] = useState<{ id: string | number; name: string }[]>([]);

    // Document Data State
    const [docList, setDocList] = useState<DocReceive[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Pagination States
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Detail Modal State
    const [selectedDoc, setSelectedDoc] = useState<DocReceive | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
    const [warehouses, setWarehouses] = useState<MastWarehouse[]>([]);
    const [vendors, setVendors] = useState<MastVendor[]>([]);
    const [newDocData, setNewDocData] = useState({
        docNo: '',
        docDate: new Date().toISOString().split('T')[0],
        menuId: '1',
        warehouseId: '',
        vendorId: '',
        remark: '',
    });

    // ─────────────────────────────────────────────────────────────
    // 1. โหลดข้อมูล Menu สำหรับ Dropdown
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchMenus = async () => {
            try {
                const res = await SystemMenuService.transactionList();
                if (res && res.success) {
                    const data = Array.isArray(res.results)
                        ? res.results
                        : Array.isArray(res.data)
                            ? res.data
                            : [];
                    if (data.length > 0) {
                        setMenuOptions(
                            data.map((item: MastTransType) => {
                                const id = item.id;
                                const name =
                                    item.menuName ??
                                    (item.nameTh && item.nameEn
                                        ? `${item.nameTh} (${item.nameEn})`
                                        : item.nameTh || item.name || `Menu ${id}`);
                                return { id: String(id), name };
                            })
                        );
                        return;
                    }
                }
            } catch (err) {
                console.warn('SystemMenuService transactionList error, fallback to defaults:', err);
            }

            // Fallback options ถ้าเชื่อมต่อ service ไม่ได้
            setMenuOptions([
                { id: '1', name: '1 - Receive (รับสินค้าเข้า)' },
                { id: '2', name: '2 - Issue (จ่ายสินค้า)' },
                { id: '3', name: '3 - Transfer (โอนย้ายสินค้า)' },
                { id: '4', name: '4 - Request (ขอเบิกสินค้า)' },
                { id: '5', name: '5 - Disposal (ตัดจำหน่าย)' },
            ]);
        };

        fetchMenus();
    }, []);

    // ─────────────────────────────────────────────────────────────
    // 2. โหลดข้อมูล Warehouse & Vendor สำหรับ Modal สร้างเอกสาร
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadMasterHelpers = async () => {
            try {
                const [whRes, vendRes] = await Promise.all([
                    masterService.warehouses.list(),
                    masterService.vendors.list(),
                ]);
                if (whRes && whRes.success && Array.isArray(whRes.results)) {
                    setWarehouses(whRes.results);
                }
                if (vendRes && vendRes.success && Array.isArray(vendRes.results)) {
                    setVendors(vendRes.results);
                }
            } catch (err) {
                console.warn('Failed to load warehouses/vendors master:', err);
            }
        };
        loadMasterHelpers();
    }, []);

    // ─────────────────────────────────────────────────────────────
    // 3. โหลดข้อมูลเอกสารรับเข้า (Fetch Documents)
    // ─────────────────────────────────────────────────────────────
    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await transactionService.receive.list({
                docNo: docNoInput || undefined,
                docDate: docDateInput || undefined,
                menuId: menuSelect || undefined,
            });

            if (res && res.success && Array.isArray(res.results) && res.results.length > 0) {
                setDocList(res.results);
            } else {
                // Fallback mock data ถ้า backend ยังไม่มีข้อมูล หรือ offline
                setDocList(docReceives);
            }
        } catch (error) {
            console.warn('Fetch receive documents failed, loading mock data:', error);
            setDocList(docReceives);
        } finally {
            setLoading(false);
        }
    }, [docNoInput, docDateInput, menuSelect]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchDocuments();
    }, [fetchDocuments]);

    // ─────────────────────────────────────────────────────────────
    // 4. การกรองข้อมูล (Filter Document) ตามฟิลด์ Docno, Docdate, Menu
    // ─────────────────────────────────────────────────────────────
    const filteredDocuments = useMemo(() => {
        return docList.filter((doc) => {
            const rec = doc as unknown as Record<string, unknown>;

            // Non-case-sensitive field resolution
            const rawDocNo = String(getField(rec, 'DOC_NO', 'doc_no', 'docNo', 'DocNo') || '').toLowerCase();
            const rawDocDate = String(getField(rec, 'DOC_DATE', 'doc_date', 'docDate', 'DocDate', 'createDate') || '');
            const rawMenuId = String(getField(rec, 'Menu_id', 'menu_id', 'menuId', 'transTypeId', 'docTypeId') || '');

            // 1. ตรวจสอบเงื่อนไข Docno
            if (docNoInput.trim()) {
                const searchDocNo = docNoInput.trim().toLowerCase();
                if (!rawDocNo.includes(searchDocNo)) {
                    return false;
                }
            }

            // 2. ตรวจสอบเงื่อนไข Docdate (รองรับการเปรียบเทียบเฉพาะ YYYY-MM-DD)
            if (docDateInput) {
                const datePart = rawDocDate.slice(0, 10);
                if (datePart !== docDateInput) {
                    return false;
                }
            }

            // 3. ตรวจสอบเงื่อนไข Menu
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
    const handleViewDetail = (doc: DocReceive) => {
        setSelectedDoc(doc);
        setIsDetailOpen(true);
    };

    // บันทึกสร้างเอกสารใหม่
    const handleCreateDocument = () => {
        if (!newDocData.docNo.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณากรอกเลขที่เอกสาร (Docno)',
                confirmButtonColor: '#2563eb',
            });
            return;
        }

        const newDoc: DocReceive = {
            id: Date.now(),
            docNo: newDocData.docNo.trim(),
            docDate: newDocData.docDate,
            menuId: newDocData.menuId,
            statusId: 1,
            docStatus: 'Draft',
            warehouseId: Number(newDocData.warehouseId) || 1,
            warehouseName: warehouses.find((w) => String(w.id) === newDocData.warehouseId)?.warehouseName || 'คลังสินค้าหลัก',
            vendorId: Number(newDocData.vendorId) || 1,
            vendorName: vendors.find((v) => String(v.id) === newDocData.vendorId)?.vendName || 'บริษัทผู้จัดจำหน่าย',
            remark: newDocData.remark || 'เอกสารสร้างใหม่',
            isActive: true,
            isDelete: false,
            createDate: new Date().toISOString(),
        };

        setDocList((prev) => [newDoc, ...prev]);
        setIsCreateOpen(false);
        setNewDocData({
            docNo: '',
            docDate: new Date().toISOString().split('T')[0],
            menuId: '1',
            warehouseId: '',
            vendorId: '',
            remark: '',
        });

        Swal.fire({
            icon: 'success',
            title: 'สร้างเอกสารสำเร็จ',
            text: `สร้างใบรับสินค้าเลขที่ ${newDoc.docNo} เรียบร้อยแล้ว`,
            timer: 1800,
            showConfirmButton: false,
        });
    };

    // Helper แสดง Badge สถานะ DOC_STATUS
    const renderStatusBadge = (statusValue: unknown) => {
        const val = String(statusValue ?? '').trim().toLowerCase();

        if (val === 'completed' || val === 'approved' || val === '3' || val === 'รับแล้ว' || val === 'สำเร็จ') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Completed
                </span>
            );
        }

        if (val === 'pending' || val === 'waiting' || val === '2' || val === 'รอรับ' || val === 'รอตรวจนับ') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Pending
                </span>
            );
        }

        if (val === 'cancelled' || val === 'rejected' || val === '4' || val === 'ยกเลิก') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    Cancelled
                </span>
            );
        }

        // ค่าเริ่มต้น / Draft
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Draft
            </span>
        );
    };

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
                        onClick={() => setIsCreateOpen(true)}
                        className="px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        สร้างใบรับสินค้า
                    </Button>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                1. Filter / Search Section (ตรงตามส่วนบนของ Wireframe)
                - ฟิลด์ Docno
                - ฟิลด์ Docdate
                - ฟิลด์ Menu
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
                    {/* Form Layout แบบเรียงจากบนลงล่าง หรือ Label ด้านซ้าย Input ด้านขวา ตาม Wireframe */}
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
                                    placeholder="เช่น GR2024001..."
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
                2. Table Section (Table-Document)
                คอลัมน์ตาม Wireframe:
                - Menu_id
                - DOC_NO
                - DOC_DATE
                - DOC_STATUS
               ───────────────────────────────────────────────────────────── */}
            <Card className="flex flex-col w-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/40">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                            Table-Document (รายการเอกสารรับสินค้า)
                        </h2>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        พบทั้งหมด {filteredDocuments.length} รายการ
                    </span>
                </div>

                <CardContent className="p-0 w-full overflow-x-auto">
                    <Table className="w-full">
                        {/* Table Header: Menu_id | DOC_NO | DOC_DATE | DOC_STATUS */}
                        <TableHeader className="bg-zinc-100/80 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                            <TableRow>
                                <TableHead className="w-[140px] text-left font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 py-3.5 px-6">
                                    Menu_id
                                </TableHead>
                                <TableHead className="w-[240px] text-left font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 py-3.5 px-6">
                                    DOC_NO
                                </TableHead>
                                <TableHead className="w-[180px] text-left font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 py-3.5 px-6">
                                    DOC_DATE
                                </TableHead>
                                <TableHead className="w-[180px] text-left font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 py-3.5 px-6">
                                    DOC_STATUS
                                </TableHead>
                                <TableHead className="w-[140px] text-right font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 py-3.5 px-6">
                                    การกระทำ
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        {/* Table Body (Table-Document) */}
                        <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {loading ? (
                                <TableRow key="loading-row">
                                    <TableCell colSpan={5} className="h-48 text-center text-zinc-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-sm">กำลังโหลดข้อมูลเอกสาร...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedDocuments.length === 0 ? (
                                <TableRow key="empty-row">
                                    <TableCell colSpan={5} className="h-48 text-center text-zinc-500">
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
                                    const rec = item as unknown as Record<string, unknown>;

                                    // ดึงค่าตามชื่อฟิลด์แบบ non-case-sensitive
                                    const menuIdVal = getField(rec, 'Menu_id', 'menu_id', 'menuId', 'transTypeId', 'docTypeId') ?? '-';
                                    const docNoVal = String(getField(rec, 'DOC_NO', 'doc_no', 'docNo', 'DocNo') || '-');
                                    const rawDate = String(getField(rec, 'DOC_DATE', 'doc_date', 'docDate', 'DocDate', 'createDate') || '-');
                                    const docDateVal = rawDate.length >= 10 ? rawDate.slice(0, 10) : rawDate;
                                    const docStatusVal = getField(rec, 'DOC_STATUS', 'doc_status', 'docStatus', 'DocStatus', 'statusName', 'statusId') ?? 'Draft';

                                    return (
                                        <TableRow
                                            key={item.id ?? `doc-${index}`}
                                            className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                                            onClick={() => handleViewDetail(item)}
                                        >
                                            {/* Column 1: Menu_id */}
                                            <TableCell className="py-4 px-6">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                    <Layers className="w-3 h-3 text-blue-500" />
                                                    {String(menuIdVal)}
                                                </span>
                                            </TableCell>

                                            {/* Column 2: DOC_NO */}
                                            <TableCell className="py-4 px-6 font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-blue-600 dark:text-blue-400 group-hover:underline">
                                                        {docNoVal}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Column 3: DOC_DATE */}
                                            <TableCell className="py-4 px-6 text-sm text-zinc-600 dark:text-zinc-400">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                                    <span>{docDateVal}</span>
                                                </div>
                                            </TableCell>

                                            {/* Column 4: DOC_STATUS */}
                                            <TableCell className="py-4 px-6">
                                                {renderStatusBadge(docStatusVal)}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleViewDetail(item)}
                                                    className="h-8 px-2.5 rounded-lg border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                                    title="ดูรายละเอียดเอกสาร"
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                                                    รายละเอียด
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

                {/* ─────────────────────────────────────────────────────────────
                    3. Bottom Pagination Bar: Page-navigate (ตาม Wireframe)
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
                                รายละเอียดเอกสารรับเข้า (Receive Document)
                            </DialogTitle>
                        </DialogHeader>

                        <div className="py-4 space-y-4">
                            {/* Card ข้อมูลส่วนหัวเอกสาร */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700">
                                <div>
                                    <span className="block text-xs font-semibold text-zinc-400">DOC_NO</span>
                                    <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                                        {selectedDoc.docNo || selectedDoc.DOC_NO || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold text-zinc-400">DOC_DATE</span>
                                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                        {selectedDoc.docDate || selectedDoc.DOC_DATE || selectedDoc.createDate?.slice(0, 10) || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold text-zinc-400">Menu_id</span>
                                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                        {selectedDoc.menuId || selectedDoc.Menu_id || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold text-zinc-400">DOC_STATUS</span>
                                    <div className="mt-0.5">
                                        {renderStatusBadge(selectedDoc.docStatus || selectedDoc.DOC_STATUS || selectedDoc.statusId)}
                                    </div>
                                </div>
                            </div>

                            {/* ข้อมูลคลังสินค้า & ผู้จัดจำหน่าย */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                                        <Building2 className="w-3.5 h-3.5" />
                                        คลังสินค้ารับเข้า (Warehouse)
                                    </div>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                                        {selectedDoc.warehouseName || `Warehouse ID: ${selectedDoc.warehouseId || '-'}`}
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                                        <Truck className="w-3.5 h-3.5" />
                                        ผู้จำหน่าย (Vendor)
                                    </div>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                                        {selectedDoc.vendorName || `Vendor ID: ${selectedDoc.vendorId || '-'}`}
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

                            {/* รายการสินค้าที่รับเข้า (Details) */}
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
                                                <TableHead className="py-2 px-3 text-xs text-right">จำนวน</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {docReceiveDetails
                                                .filter((d) => String(d.docId) === String(selectedDoc.id))
                                                .map((detail, idx) => (
                                                    <TableRow key={detail.id || idx}>
                                                        <TableCell className="py-2.5 px-3 text-xs text-zinc-500">{idx + 1}</TableCell>
                                                        <TableCell className="py-2.5 px-3 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                                            {detail.itemName}
                                                        </TableCell>
                                                        <TableCell className="py-2.5 px-3 text-xs text-right font-bold text-zinc-900 dark:text-zinc-100">
                                                            {detail.itemQty.toLocaleString()}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            {docReceiveDetails.filter((d) => String(d.docId) === String(selectedDoc.id)).length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="py-4 text-center text-xs text-zinc-400">
                                                        มี 1 รายการมาตรฐานในเอกสารนี้
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
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

            {/* ─────────────────────────────────────────────────────────────
                Modal: สร้างใบรับสินค้าใหม่ (Create Receive Document)
               ───────────────────────────────────────────────────────────── */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-lg bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            <Plus className="w-5 h-5 text-blue-600" />
                            สร้างใบรับสินค้าใหม่ (New Receive)
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {/* Docno */}
                        <div>
                            <Label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                                เลขที่เอกสาร (DOC_NO) <span className="text-red-500">*</span>
                            </Label>
                            <input
                                type="text"
                                value={newDocData.docNo}
                                onChange={(e) => setNewDocData((prev) => ({ ...prev, docNo: e.target.value }))}
                                placeholder="เช่น GR2024007"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Docdate */}
                        <div>
                            <Label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                                วันที่เอกสาร (DOC_DATE) <span className="text-red-500">*</span>
                            </Label>
                            <input
                                type="date"
                                value={newDocData.docDate}
                                onChange={(e) => setNewDocData((prev) => ({ ...prev, docDate: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            />
                        </div>

                        {/* Menu_id */}
                        <div>
                            <Label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                                ประเภทเมนู (Menu_id)
                            </Label>
                            <select
                                value={newDocData.menuId}
                                onChange={(e) => setNewDocData((prev) => ({ ...prev, menuId: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                                {menuOptions.map((opt) => (
                                    <option key={opt.id} value={String(opt.id)}>
                                        {opt.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Warehouse */}
                        <div>
                            <Label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                                คลังสินค้ารับเข้า
                            </Label>
                            <select
                                value={newDocData.warehouseId}
                                onChange={(e) => setNewDocData((prev) => ({ ...prev, warehouseId: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="">-- เลือกคลังสินค้า --</option>
                                {warehouses.map((wh) => (
                                    <option key={wh.id} value={String(wh.id)}>
                                        {wh.warehouseName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Remark */}
                        <div>
                            <Label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                                หมายเหตุ
                            </Label>
                            <textarea
                                rows={2}
                                value={newDocData.remark}
                                onChange={(e) => setNewDocData((prev) => ({ ...prev, remark: e.target.value }))}
                                placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateOpen(false)}
                            className="px-4 py-2 text-sm"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            onClick={handleCreateDocument}
                            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            บันทึกสร้างเอกสาร
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
