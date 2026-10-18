import clsx from 'clsx';

// Tooltip thuần CSS: hiện khi hover / focus. Chỉ để nhìn – nhãn trợ năng đặt ở aria-label của nút bên trong.
export function Tooltip({ label, children, className, side = 'top' }) {
  if (!label) return children;
  return (
    <span className={clsx('group relative inline-flex', className)}>
      {children}
      <span
        aria-hidden
        className={clsx(
          'pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-btn bg-ink px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )}
      >
        {label}
      </span>
    </span>
  );
}
