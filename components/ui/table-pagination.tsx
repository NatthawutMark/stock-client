'use client';

import * as React from 'react';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
} from '@/components/ui/index';

export interface TablePaginationProps {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    filteredCount: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    loading?: boolean;
    pageSizeOptions?: number[];
    className?: string;
}

export function TablePagination({
    currentPage,
    pageSize,
    totalItems,
    filteredCount,
    onPageChange,
    onPageSizeChange,
    loading = false,
    pageSizeOptions = [10, 20, 50, 100],
    className = '',
}: TablePaginationProps) {
    const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const startIndex = filteredCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
    const endIndex = Math.min(safeCurrentPage * pageSize, filteredCount);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (safeCurrentPage <= 4) {
                for (let i = 1; i <= 5; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (safeCurrentPage >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(safeCurrentPage - 1);
                pages.push(safeCurrentPage);
                pages.push(safeCurrentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div
            className={`border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm ${className}`}
        >
            {/* Left: Range and Page Size */}
            <div className="flex flex-wrap items-center gap-4 text-zinc-600 dark:text-zinc-400">
                <div>
                    แสดง <span className="font-semibold text-zinc-900 dark:text-zinc-100">{startIndex}</span> ถึง{' '}
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{endIndex}</span> จากทั้งหมด{' '}
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{filteredCount}</span> รายการ
                    {filteredCount !== totalItems && (
                        <span className="text-xs text-zinc-400 ml-1">
                            (กรองจากทั้งหมด {totalItems} รายการ)
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs">แสดง</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            onPageSizeChange(Number(e.target.value));
                        }}
                        className="h-8 px-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                        {pageSizeOptions.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                    <span className="text-xs">แถว/หน้า</span>
                </div>
            </div>

            {/* Right: Shadcn Pagination Component */}
            <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent className="gap-1">
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            text="ก่อนหน้า"
                            onClick={(e) => {
                                e.preventDefault();
                                if (safeCurrentPage > 1 && !loading) {
                                    onPageChange(safeCurrentPage - 1);
                                }
                            }}
                            className={
                                safeCurrentPage <= 1 || loading
                                    ? 'pointer-events-none opacity-40 cursor-not-allowed select-none'
                                    : 'cursor-pointer'
                            }
                        />
                    </PaginationItem>

                    {getPageNumbers().map((pageItem, idx) => {
                        if (typeof pageItem === 'string') {
                            return (
                                <PaginationItem key={`ellipsis-${idx}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            );
                        }

                        const isActive = pageItem === safeCurrentPage;
                        return (
                            <PaginationItem key={`page-${pageItem}`}>
                                <PaginationLink
                                    href="#"
                                    isActive={isActive}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (!loading) onPageChange(pageItem);
                                    }}
                                    className={
                                        isActive
                                            ? 'bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 hover:text-white border-blue-600 cursor-pointer'
                                            : 'cursor-pointer'
                                    }
                                >
                                    {pageItem}
                                </PaginationLink>
                            </PaginationItem>
                        );
                    })}

                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            text="ถัดไป"
                            onClick={(e) => {
                                e.preventDefault();
                                if (safeCurrentPage < totalPages && !loading) {
                                    onPageChange(safeCurrentPage + 1);
                                }
                            }}
                            className={
                                safeCurrentPage >= totalPages || loading
                                    ? 'pointer-events-none opacity-40 cursor-not-allowed select-none'
                                    : 'cursor-pointer'
                            }
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
}

