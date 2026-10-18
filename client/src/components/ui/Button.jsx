import { forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

// variant: primary (leaf) | secondary (viền) | ghost | danger (berry). Cao 44px mobile / 40px desktop
const VARIANT = {
  primary: 'bg-leaf text-white hover:bg-leaf-dark disabled:bg-leaf/50',
  secondary: 'bg-surface text-ink border border-line hover:bg-paper disabled:text-ink-soft',
  ghost: 'bg-transparent text-ink hover:bg-paper disabled:text-ink-soft',
  danger: 'bg-berry text-white hover:bg-berry/90 disabled:bg-berry/50',
};
const SIZE = {
  md: 'h-11 md:h-10 px-4 text-sm',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-11 w-11 md:h-10 md:w-10 p-0',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-btn font-medium transition-colors duration-150 select-none disabled:cursor-not-allowed',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={18} className="animate-spin" aria-hidden /> : Icon ? <Icon size={18} strokeWidth={1.75} aria-hidden /> : null}
      {children}
    </button>
  );
});
