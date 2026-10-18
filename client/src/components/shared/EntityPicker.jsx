import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Search, X } from 'lucide-react';
import { useDebounce } from '../../hooks/useFetch.js';

/**
 * Chọn 1 / nhiều đối tượng qua ô tìm kiếm (giáo viên, phụ huynh, học sinh…).
 * fetcher(search) → mảng đối tượng có _id. selected: mảng đối tượng đã chọn; onChange(mảng mới).
 */
export function EntityPicker({
  label, hint, error, placeholder = 'Gõ tên để tìm…', fetcher, selected = [], onChange,
  multiple = true, max, disabled = false, getLabel = (o) => o.fullName, getSub, renderAvatar, className,
}) {
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 300);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    fetcher(dq)
      .then((list) => alive && setItems(list || []))
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [dq, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const selectedIds = new Set(selected.map((s) => s._id));
  const full = max ? selected.length >= max : false;

  const add = (o) => {
    if (selectedIds.has(o._id)) return;
    onChange(multiple ? [...selected, o] : [o]);
    setQ('');
    if (!multiple) setOpen(false);
  };
  const remove = (id) => onChange(selected.filter((s) => s._id !== id));

  return (
    <div ref={ref} className={clsx('flex flex-col gap-1.5', className)}>
      {label && <span className="text-sm font-medium text-ink">{label}</span>}
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((o) => (
            <li key={o._id} className="inline-flex items-center gap-1 rounded-full bg-leaf-soft py-0.5 pl-2.5 pr-1 text-sm text-leaf-dark">
              {getLabel(o)}
              {!disabled && (
                <button type="button" onClick={() => remove(o._id)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-leaf/20" aria-label={`Bỏ ${getLabel(o)}`}>
                  <X size={14} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && !full && (
        <div className="relative">
          <Search size={18} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            value={q}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            placeholder={placeholder}
            aria-label={label || placeholder}
            aria-invalid={!!error}
            className={clsx(
              'h-11 w-full rounded-btn border bg-surface pl-10 pr-3 text-base text-ink placeholder:text-ink-soft/70 md:h-10 md:text-sm',
              error ? 'border-berry' : 'border-line hover:border-ink-soft/50',
            )}
          />
          {open && (
            <ul role="listbox" className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-card border border-line bg-surface py-1 shadow-float">
              {loading && <li className="px-3 py-2 text-sm text-ink-soft">Đang tìm…</li>}
              {!loading && items.length === 0 && <li className="px-3 py-2 text-sm text-ink-soft">Không tìm thấy kết quả.</li>}
              {!loading &&
                items.map((o) => (
                  <li key={o._id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedIds.has(o._id)}
                      disabled={selectedIds.has(o._id)}
                      onClick={() => add(o)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-paper disabled:opacity-40"
                    >
                      {renderAvatar?.(o)}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{getLabel(o)}</span>
                        {getSub && <span className="block truncate text-xs text-ink-soft">{getSub(o)}</span>}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
      {error ? <p className="text-sm text-berry">{error}</p> : hint ? <p className="text-sm text-ink-soft">{hint}</p> : null}
    </div>
  );
}
