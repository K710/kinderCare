import { forwardRef, useId } from 'react';
import clsx from 'clsx';

export const Textarea = forwardRef(function Textarea({ label, error, hint, className, rows = 3, ...rest }, ref) {
  const id = useId();
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        aria-invalid={!!error}
        className={clsx(
          'w-full rounded-btn border bg-surface px-3 py-2 text-base md:text-sm text-ink placeholder:text-ink-soft/70 transition-colors',
          error ? 'border-berry' : 'border-line hover:border-ink-soft/50',
        )}
        {...rest}
      />
      {error ? <p className="text-sm text-berry">{error}</p> : hint ? <p className="text-sm text-ink-soft">{hint}</p> : null}
    </div>
  );
});
