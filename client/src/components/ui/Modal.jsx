import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X } from 'lucide-react';

const SIZE = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

// Lớp nổi duy nhất được dùng bóng. Đóng bằng ESC / bấm nền. Trên mobile dính đáy như bottom sheet.
export function Modal({ open, onClose, title, description, size = 'md', children, footer }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus phần tử đầu tiên trong modal
    const t = setTimeout(() => panelRef.current?.querySelector('input, select, textarea, button:not([aria-label="Đóng"])')?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button className="absolute inset-0 bg-ink/40" onClick={onClose} aria-label="Đóng" tabIndex={-1} />
      <div
        ref={panelRef}
        className={clsx(
          'relative flex max-h-[92dvh] w-full flex-col bg-surface shadow-float',
          'rounded-t-card md:rounded-card',
          SIZE[size],
        )}
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="modal-title" className="text-lg">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
          </div>
          <button onClick={onClose} className="touch -mr-2 -mt-2 flex items-center justify-center rounded-btn text-ink-soft hover:bg-paper hover:text-ink" aria-label="Đóng">
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="safe-bottom flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
