import { forwardRef } from 'react';
import clsx from 'clsx';
import { Tooltip } from './Tooltip.jsx';

// Nút chỉ có icon: luôn có aria-label + tooltip (tooltip có thể khác nhãn, vd lý do bị khoá)
export const IconButton = forwardRef(function IconButton(
  { label, tooltip, icon: Icon, danger = false, size = 'md', className, iconClassName, children, ...rest },
  ref,
) {
  return (
    <Tooltip label={tooltip ?? label}>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={clsx(
          'touch inline-flex items-center justify-center rounded-btn text-ink-soft transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
          size === 'sm' ? 'md:min-h-9 md:min-w-9' : 'md:min-h-10 md:min-w-10',
          danger ? 'hover:text-berry' : 'hover:text-ink',
          className,
        )}
        {...rest}
      >
        {children ?? (Icon && <Icon size={18} strokeWidth={1.75} aria-hidden className={iconClassName} />)}
      </button>
    </Tooltip>
  );
});
