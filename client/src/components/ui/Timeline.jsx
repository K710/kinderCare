import clsx from 'clsx';

/**
 * Dòng thời gian một ngày của bé (điểm nhấn trang chủ PH).
 * items: [{ key, time, title, detail?, state: 'done' | 'current' | 'pending', icon?, children? }]
 */
export function Timeline({ items = [], className }) {
  return (
    <ol className={clsx('relative ml-3 border-l-2 border-line', className)}>
      {items.map((it, i) => {
        const Icon = it.icon;
        const done = it.state === 'done';
        const current = it.state === 'current';
        return (
          <li key={it.key ?? i} className={clsx('relative pl-6', i < items.length - 1 ? 'pb-5' : 'pb-1')}>
            <span
              className={clsx(
                'absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2',
                done && 'border-leaf bg-leaf',
                current && 'border-leaf bg-surface ring-4 ring-leaf-soft',
                !done && !current && 'border-line bg-surface',
              )}
              aria-hidden
            />
            <div className="flex items-start gap-3">
              <span className="w-12 shrink-0 pt-0.5 text-sm tabular-nums text-ink-soft">{it.time}</span>
              <div className="min-w-0 flex-1">
                <p className={clsx('flex items-center gap-1.5 text-sm', done || current ? 'font-medium text-ink' : 'text-ink-soft')}>
                  {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden className="shrink-0" />}
                  {it.title}
                </p>
                {it.detail && <p className="mt-0.5 text-sm text-ink-soft">{it.detail}</p>}
                {it.children}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
