'use client';

import { useState, useMemo } from 'react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T extends { id: number | string }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onView?: (row: T) => void;
  actionsLabel?: string;
}

export function DataTable<T extends { id: number | string }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'ไม่มีข้อมูล',
  onEdit,
  onDelete,
  onView,
  actionsLabel = 'จัดการ',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'th');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const hasActions = onEdit || onDelete || onView;

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
            {columns.map(col => (
              <th
                key={String(col.key)}
                className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide select-none
                  ${col.sortable ? 'cursor-pointer hover:text-blue-500 transition-colors' : ''}
                  ${col.className ?? ''}`}
                style={{ color: 'var(--text-secondary)' }}
                onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === String(col.key) && (
                    <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </span>
              </th>
            ))}
            {hasActions && (
              <th
                className="px-4 py-3 text-right text-xs uppercase tracking-wide font-semibold"
                style={{ color: 'var(--text-secondary)' }}
              >
                {actionsLabel}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length + (hasActions ? 1 : 0)}
                className="py-12 text-center"
                style={{ color: 'var(--text-secondary)' }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>กำลังโหลด...</span>
                </div>
              </td>
            </tr>
          ) : sorted.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (hasActions ? 1 : 0)}
                className="py-12 text-center"
                style={{ color: 'var(--text-secondary)' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={row.id}
                className="border-t transition-colors hover:bg-blue-50/5"
                style={{ borderColor: 'var(--border)', background: i % 2 === 0 ? 'var(--bg-card)' : 'transparent' }}
              >
                {columns.map(col => {
                  const val = (row as Record<string, unknown>)[String(col.key)];
                  return (
                    <td key={String(col.key)} className={`px-4 py-3 ${col.className ?? ''}`} style={{ color: 'var(--text-primary)' }}>
                      {col.render ? col.render(val, row) : String(val ?? '-')}
                    </td>
                  );
                })}
                {hasActions && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onView && (
                        <button
                          onClick={() => onView(row)}
                          className="px-2.5 py-1 text-xs rounded-lg transition-colors"
                          style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}
                        >
                          👁
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors dark:bg-blue-900/20 dark:text-blue-400"
                        >
                          แก้ไข
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors dark:bg-red-900/20 dark:text-red-400"
                        >
                          ลบ
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

