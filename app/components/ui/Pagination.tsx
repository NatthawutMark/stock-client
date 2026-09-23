interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (p: number) => void;
  ofLabel?: string;
  pageLabel?: string;
}

export function Pagination({ page, total, limit, onPageChange, ofLabel = 'จาก', pageLabel = 'หน้า' }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  return (
    <div className="flex items-center justify-between text-sm mt-4">
      <span style={{ color: 'var(--text-secondary)' }}>
        {pageLabel} {page} {ofLabel} {totalPages} ({total} รายการ)
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
        >
          ‹
        </button>
        {visible.map((p, i) => {
          const prev = visible[i - 1];
          return (
            <div key={p} className="flex items-center gap-1">
              {prev && p - prev > 1 && (
                <span style={{ color: 'var(--text-secondary)' }}>…</span>
              )}
              <button
                onClick={() => onPageChange(p)}
                className="w-8 h-8 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: p === page ? 'var(--accent)' : 'var(--bg)',
                  color: p === page ? '#fff' : 'var(--text-primary)',
                }}
              >
                {p}
              </button>
            </div>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
        >
          ›
        </button>
      </div>
    </div>
  );
}

