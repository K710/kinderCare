import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Skeleton } from './Skeleton.jsx';

/**
 * DataTable: header dính, hàng zebra nhẹ, số tabular, skeleton khi tải, empty state, phân trang.
 * columns: [{ key, title, render?(row), className?, align?: 'right' }]
 */
export function DataTable({ columns, rows = [], rowKey = '_id', loading = false, emptyTitle = 'Chưa có dữ liệu', emptyDescription, onRowClick, pagination, onPageChange, footer }) {
  const colSpan = columns.length;
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-paper text-left text-xs font-medium text-ink-soft">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={clsx('px-4 py-3 whitespace-nowrap', c.align === 'right' && 'text-right', c.className)}>
                  {c.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center">
                  <Inbox size={28} strokeWidth={1.5} className="mx-auto mb-2 text-ink-soft" aria-hidden />
                  <p className="font-medium">{emptyTitle}</p>
                  {emptyDescription && <p className="mt-1 text-sm text-ink-soft">{emptyDescription}</p>}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row, i) => (
                <tr
                  key={row[rowKey] ?? i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={clsx('odd:bg-paper/40', onRowClick && 'cursor-pointer hover:bg-leaf-soft/40')}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={clsx('px-4 py-3 align-middle', c.align === 'right' && 'text-right', c.className)}>
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {(pagination || footer) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2">
          <div className="text-sm text-ink-soft">{footer}</div>
          {pagination && <Pagination {...pagination} onChange={onPageChange} />}
        </div>
      )}
    </div>
  );
}

// "1–20 trong 45" + ‹ › + số trang gần kề
export function Pagination({ page = 1, limit = 20, total = 0, totalPages = 1, onChange }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) pages.push(p);
  const btn = 'touch md:min-h-9 md:min-w-9 flex items-center justify-center rounded-btn text-sm disabled:opacity-40';
  return (
    <nav className="flex items-center gap-1" aria-label="Phân trang">
      <span className="mr-2 text-sm text-ink-soft tabular-nums">
        {from}–{to} trong {total}
      </span>
      <button className={clsx(btn, 'hover:bg-paper')} disabled={page <= 1} onClick={() => onChange?.(page - 1)} aria-label="Trang trước">
        <ChevronLeft size={18} />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange?.(p)}
          aria-current={p === page ? 'page' : undefined}
          className={clsx(btn, 'tabular-nums', p === page ? 'bg-leaf-soft font-medium text-leaf-dark' : 'hover:bg-paper')}
        >
          {p}
        </button>
      ))}
      <button className={clsx(btn, 'hover:bg-paper')} disabled={page >= totalPages} onClick={() => onChange?.(page + 1)} aria-label="Trang sau">
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
