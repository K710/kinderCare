import { forwardRef, useId } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

// Select gốc của trình duyệt (hoạt động tốt trên mobile), tạo kiểu giống Input
export const Select = forwardRef(function Select({ label, error, hint, options = [], placeholder, className, ...rest }, ref) {
  const id = useId();
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          ref={ref}
          aria-invalid={!!error}
          className={clsx(
            'w-full h-11 md:h-10 appearance-none rounded-btn border bg-surface pl-3 pr-9 text-base md:text-sm text-ink transition-colors',
            error ? 'border-berry' : 'border-line hover:border-ink-soft/50',
          )}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} strokeWidth={1.75} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
      </div>
      {error ? <p className="text-sm text-berry">{error}</p> : hint ? <p className="text-sm text-ink-soft">{hint}</p> : null}
    </div>
  );
});
