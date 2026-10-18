import clsx from 'clsx';

// Tabs ngang gạch chân leaf. items: [{ value, label, count? }]
export function Tabs({ items, value, onChange, className }) {
  return (
    <div role="tablist" className={clsx('flex gap-1 overflow-x-auto border-b border-line', className)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={clsx(
              '-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active ? 'border-leaf text-leaf-dark' : 'border-transparent text-ink-soft hover:text-ink',
            )}
          >
            {it.label}
            {it.count != null && (
              <span className={clsx('rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-leaf-soft' : 'bg-paper')}>{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
