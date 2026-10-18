import clsx from 'clsx';
import { Skeleton } from './Skeleton.jsx';

const TONE = {
  leaf: 'bg-leaf-soft text-leaf-dark',
  sun: 'bg-sun-soft text-[#8A6100]',
  sky: 'bg-sky-soft text-[#1F6FA8]',
  peach: 'bg-peach-soft text-[#B5412F]',
  berry: 'bg-berry-soft text-berry',
  muted: 'bg-paper text-ink-soft',
};

// Ô số liệu: nhãn nhỏ, số lớn Baloo 2, chú thích; icon tròn góc phải
export function StatTile({ label, value, hint, icon: Icon, tone = 'leaf', loading = false, className }) {
  return (
    <div className={clsx('card flex items-start justify-between gap-3 p-4', className)}>
      <div className="min-w-0">
        <p className="text-sm text-ink-soft">{label}</p>
        {loading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">{value}</p>}
        {hint && !loading && <p className="mt-1 truncate text-xs text-ink-soft">{hint}</p>}
      </div>
      {Icon && (
        <span className={clsx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full', TONE[tone])}>
          <Icon size={20} strokeWidth={1.75} aria-hidden />
        </span>
      )}
    </div>
  );
}
