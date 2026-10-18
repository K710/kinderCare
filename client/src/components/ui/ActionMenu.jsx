import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { MoreHorizontal } from 'lucide-react';

/**
 * Menu "⋯" gom hành động của một hàng (dùng ở dạng thẻ trên mobile).
 * items: [{ key, label, icon, onClick, disabled, danger, hidden }]
 */
export function ActionMenu({ items = [], label = 'Thao tác', align = 'right', className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const visible = items.filter((i) => i && !i.hidden);

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

  if (!visible.length) return null;
  return (
    <div ref={ref} className={clsx('relative shrink-0', className)} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="touch inline-flex items-center justify-center rounded-btn text-ink-soft hover:bg-paper hover:text-ink"
      >
        <MoreHorizontal size={20} strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <ul
          role="menu"
          className={clsx(
            'absolute top-full z-30 mt-1 min-w-[200px] overflow-hidden rounded-card border border-line bg-surface py-1 shadow-float',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {visible.map(({ key, label: text, icon: Icon, onClick, disabled, danger }) => (
            <li key={key ?? text} role="none">
              <button
                role="menuitem"
                type="button"
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  onClick?.();
                }}
                className={clsx(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40',
                  danger ? 'text-berry' : 'text-ink',
                )}
              >
                {Icon && <Icon size={18} strokeWidth={1.75} aria-hidden />}
                {text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
