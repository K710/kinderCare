import { Fragment } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Skeleton } from './Skeleton.jsx';
import { IconButton } from './IconButton.jsx';
import { ActionMenu } from './ActionMenu.jsx';

/**
 * DataTable: ≥768px là bảng (header dính, zebra nhẹ, số tabular); <768px là danh sách thẻ.
 * columns: [{ key, title, render?(row), className?, align?: 'right',
 *             card?: 'header' | 'chip' | 'meta' | false   // vị trí trên thẻ mobile (mặc định: cột đầu = header, còn lại = meta)
 *             actions?(row) → [{ key, label, tooltip, icon, onClick, disabled, danger, hidden, iconClassName }] }]
 * Cột actions: bảng hiện nút icon (tooltip + aria-label), thẻ gom vào menu "⋯".
 */
export function DataTable({ columns, rows = [], rowKey = '_id', loading = false, emptyTitle = 'Chưa có dữ liệu', emptyDescription, onRowClick, pagination, onPageChange, footer }) {
  const colSpan = columns.length;
  const cell = (c, row) => (c.actions ? <RowActions items={c.actions(row)} /> : c.render ? c.render(row) : row[c.key]);

  // Phân vai cột cho thẻ mobile
  const actionCol = columns.find((c) => c.actions);
  const dataCols = columns.filter((c) => !c.actions && c.card !== false);
  const headerCol = dataCols.find((c) => c.card === 'header') || dataCols[0];
  const chipCols = dataCols.filter((c) => c.card === 'chip');
  const metaCols = dataCols.filter((c) => c !== headerCol && c.card !== 'chip');

  const empty = (
    <div className="px-4 py-12 text-center">
      <Inbox size={28} strokeWidth={1.5} className="mx-auto mb-2 text-ink-soft" aria-hidden />
      <p className="font-medium">{emptyTitle}</p>
      {emptyDescription && <p className="mt-1 text-sm text-ink-soft">{emptyDescription}</p>}
    </div>
  );

  return (
    <div className="card md:overflow-hidden">
      {/* Mobile: thẻ */}
      <ul className="divide-y divide-line md:hidden">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <li key={`sk-${i}`} className="space-y-2 p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </li>
          ))}
        {!loading && rows.length === 0 && <li>{empty}</li>}
        {!loading &&
          rows.map((row, i) => (
            <li
              key={row[rowKey] ?? i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx('flex items-start gap-2 p-4', onRowClick && 'cursor-pointer active:bg-leaf-soft/40')}
            >
              <div className="min-w-0 flex-1">
                {headerCol && <div className="text-sm">{cell(headerCol, row)}</div>}
                {chipCols.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {chipCols.map((c) => (
                      <Fragment key={c.key}>{cell(c, row)}</Fragment>
                    ))}
                  </div>
                )}
                {metaCols.length > 0 && (
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    {metaCols.map((c) => (
                      <Fragment key={c.key}>
                        <dt className="text-ink-soft">{c.title}</dt>
                        <dd className="min-w-0">{cell(c, row)}</dd>
                      </Fragment>
                    ))}
                  </dl>
                )}
              </div>
              {actionCol && <ActionMenu items={actionCol.actions(row)} className="-mr-2 -mt-2" />}
            </li>
          ))}
      </ul>

      {/* Desktop: bảng */}
      <div className="hidden overflow-x-auto md:block">
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
                <td colSpan={colSpan} className="p-0">
                  {empty}
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
                      {cell(c, row)}
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

// Nút icon của một hàng trên bảng desktop (mỗi nút có tooltip + aria-label)
export function RowActions({ items = [] }) {
  const visible = items.filter((i) => i && !i.hidden);
  if (!visible.length) return null;
  return (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {visible.map(({ key, label, tooltip, icon, onClick, disabled, danger, iconClassName }) => (
        <IconButton key={key ?? label} size="sm" label={label} tooltip={tooltip} icon={icon} onClick={onClick} disabled={disabled} danger={danger} iconClassName={iconClassName} />
      ))}
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
