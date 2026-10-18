import { useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import dayjs from '../../utils/dayjs.js';

/**
 * DatePicker dd/mm/yyyy. value / onChange dùng chuỗi ISO 'YYYY-MM-DD' ('' = trống).
 * Gõ tay tự chèn dấu "/", hoặc bấm lịch. min/max (ISO) chặn ngày ngoài khoảng (vd không cho tương lai).
 */
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const toDisplay = (iso) => (ISO.test(iso || '') ? dayjs(iso).format('DD/MM/YYYY') : '');
const parseDisplay = (s) => {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = dayjs(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`, 'YYYY-MM-DD', true);
  return d.isValid() ? d.format('YYYY-MM-DD') : null;
};
const inRange = (iso, min, max) => (!min || iso >= min) && (!max || iso <= max);
// Tự chèn "/" khi gõ số
const mask = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter((p, i) => p.length || i === 0);
  return parts.join('/');
};

export function DatePicker({ label, error, hint, value = '', onChange, min, max, placeholder = 'dd/mm/yyyy', disabled, clearable = true, className, inputClassName, ...rest }) {
  const id = useId();
  const [text, setText] = useState(toDisplay(value));
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => (ISO.test(value) ? dayjs(value) : dayjs()).startOf('month'));
  const [localErr, setLocalErr] = useState('');
  const ref = useRef(null);

  // Đồng bộ khi value đổi từ ngoài
  useEffect(() => {
    setText(toDisplay(value));
    if (ISO.test(value)) setView(dayjs(value).startOf('month'));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const commit = (iso) => {
    if (iso && !inRange(iso, min, max)) {
      setLocalErr(max && iso > max ? 'Không chọn được ngày sau ' + toDisplay(max) : 'Không chọn được ngày trước ' + toDisplay(min));
      return;
    }
    setLocalErr('');
    onChange?.(iso || '');
  };
  const onBlur = () => {
    if (!text) return commit('');
    const iso = parseDisplay(text);
    if (!iso) return setLocalErr('Ngày chưa đúng, nhập dạng dd/mm/yyyy.');
    commit(iso);
  };

  // Lưới lịch: Thứ 2 ở cột đầu
  const first = view.startOf('month');
  const offset = (first.isoWeekday() + 6) % 7;
  const cells = [...Array(offset).fill(null), ...Array.from({ length: view.daysInMonth() }, (_, i) => first.date(i + 1))];
  const today = dayjs().format('YYYY-MM-DD');
  const err = error || localErr;

  return (
    <div ref={ref} className={clsx('relative flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={!!err}
          onChange={(e) => {
            setText(mask(e.target.value));
            setLocalErr('');
          }}
          onBlur={onBlur}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onBlur())}
          className={clsx(
            'h-11 w-full rounded-btn border bg-surface pl-3 pr-20 text-base tabular-nums text-ink placeholder:text-ink-soft/70 transition-colors md:h-10 md:text-sm',
            err ? 'border-berry' : 'border-line hover:border-ink-soft/50',
            disabled && 'bg-paper text-ink-soft',
            inputClassName,
          )}
          {...rest}
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          {clearable && value && !disabled && (
            <button type="button" onClick={() => commit('')} className="flex h-8 w-8 items-center justify-center rounded-btn text-ink-soft hover:text-ink" aria-label="Xoá ngày">
              <X size={16} aria-hidden />
            </button>
          )}
          <button type="button" onClick={() => !disabled && setOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-btn text-ink-soft hover:bg-paper hover:text-ink" aria-label="Mở lịch" aria-expanded={open} disabled={disabled}>
            <CalendarDays size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        {open && (
          <div className="absolute right-0 z-40 mt-1 w-72 rounded-card border border-line bg-surface p-3 shadow-float" role="dialog" aria-label="Chọn ngày">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => setView(view.subtract(1, 'month'))} className="flex h-8 w-8 items-center justify-center rounded-btn hover:bg-paper" aria-label="Tháng trước"><ChevronLeft size={18} /></button>
              <div className="flex items-center gap-1 text-sm font-medium">
                <select value={view.month()} onChange={(e) => setView(view.month(Number(e.target.value)))} className="rounded-btn bg-transparent px-1 py-0.5 hover:bg-paper" aria-label="Tháng">
                  {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>Tháng {i + 1}</option>)}
                </select>
                <select value={view.year()} onChange={(e) => setView(view.year(Number(e.target.value)))} className="rounded-btn bg-transparent px-1 py-0.5 tabular-nums hover:bg-paper" aria-label="Năm">
                  {Array.from({ length: 31 }, (_, i) => dayjs().year() - 25 + i).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button type="button" onClick={() => setView(view.add(1, 'month'))} className="flex h-8 w-8 items-center justify-center rounded-btn hover:bg-paper" aria-label="Tháng sau"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] text-ink-soft">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => <span key={d} className="py-1">{d}</span>)}</div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((c, i) => {
                if (!c) return <span key={`e${i}`} />;
                const iso = c.format('YYYY-MM-DD');
                const ok = inRange(iso, min, max);
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={!ok}
                    onClick={() => { commit(iso); setOpen(false); }}
                    className={clsx(
                      'h-9 rounded-btn text-sm tabular-nums',
                      iso === value ? 'bg-leaf font-semibold text-white' : ok ? 'hover:bg-paper' : 'text-ink-soft/40',
                      iso === today && iso !== value && 'font-bold text-leaf-dark',
                      c.isoWeekday() > 5 && iso !== value && ok && 'text-ink-soft',
                    )}
                  >
                    {c.date()}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-xs">
              <button type="button" className="text-sky hover:underline" onClick={() => { commit(today); setOpen(false); }} disabled={!inRange(today, min, max)}>Hôm nay</button>
              <button type="button" className="text-ink-soft hover:underline" onClick={() => setOpen(false)}>Đóng</button>
            </div>
          </div>
        )}
      </div>
      {err ? <p className="text-sm text-berry">{err}</p> : hint ? <p className="text-sm text-ink-soft">{hint}</p> : null}
    </div>
  );
}
