import { forwardRef, useId } from 'react';
import clsx from 'clsx';

// Input có nhãn + lỗi. Lỗi nói rõ chuyện gì và cách sửa.
export const Input = forwardRef(function Input({ label, error, hint, className, inputClassName, type = 'text', rightSlot, ...rest }, ref) {
  const id = useId();
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          ref={ref}
          type={type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          className={clsx(
            'w-full h-11 md:h-10 rounded-btn border bg-surface px-3 text-base md:text-sm text-ink placeholder:text-ink-soft/70 transition-colors',
            error ? 'border-berry' : 'border-line hover:border-ink-soft/50',
            rightSlot && 'pr-11',
            inputClassName,
          )}
          {...rest}
        />
        {rightSlot && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{rightSlot}</div>}
      </div>
      {error ? (
        <p id={`${id}-err`} className="text-sm text-berry">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
