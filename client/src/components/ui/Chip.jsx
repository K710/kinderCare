import clsx from 'clsx';

// Chip trạng thái: bo full, luôn có chữ (và icon nếu có), không chỉ dựa vào màu
const TONE = {
  leaf: 'bg-leaf-soft text-leaf-dark',
  sun: 'bg-sun-soft text-[#8A6100]',
  sky: 'bg-sky-soft text-[#1F6FA8]',
  peach: 'bg-peach-soft text-[#B5412F]',
  berry: 'bg-berry-soft text-berry',
  principal: 'bg-role-principal-soft text-role-principal-dark', // chip vai trò Hiệu trưởng (DESIGN.md: #7A5AF8)
  muted: 'bg-paper text-ink-soft border border-line',
};

export function Chip({ tone = 'muted', icon: Icon, children, className }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', TONE[tone], className)}>
      {Icon && <Icon size={14} strokeWidth={1.75} aria-hidden />}
      {children}
    </span>
  );
}

// Chip theo bảng trạng thái trong constants.js: <StatusChip map={TUITION_STATUS} value="paid" />
export function StatusChip({ map, value, icon }) {
  const s = map[value] || { label: value, tone: 'muted' };
  return (
    <Chip tone={s.tone} icon={icon}>
      {s.label}
    </Chip>
  );
}
