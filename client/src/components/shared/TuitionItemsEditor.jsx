import { Plus, Trash2 } from 'lucide-react';
import { Input, Button, IconButton } from '../ui/index.js';
import { formatMoney } from '../../utils/format.js';

// Danh sách khoản thu [{ name, amount }] – dùng cho tạo / sửa học phí
export function TuitionItemsEditor({ items, onChange, error }) {
  const set = (i, patch) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">Các khoản thu</span>
        <Button size="sm" variant="secondary" icon={Plus} onClick={() => onChange([...items, { name: '', amount: '' }])}>
          Thêm khoản
        </Button>
      </div>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_140px_auto] items-start gap-2">
          <Input placeholder="Tên khoản (vd: Tiền ăn)" value={it.name} onChange={(e) => set(i, { name: e.target.value })} aria-label={`Tên khoản ${i + 1}`} />
          <Input type="number" inputMode="numeric" min={0} step={1000} placeholder="Số tiền" value={it.amount} onChange={(e) => set(i, { amount: e.target.value })} aria-label={`Số tiền khoản ${i + 1}`} />
          <IconButton label="Xoá khoản" icon={Trash2} danger disabled={items.length <= 1} onClick={() => onChange(items.filter((_, idx) => idx !== i))} />
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-line pt-2 text-sm">
        <span className="text-ink-soft">Tổng cộng</span>
        <span className="font-display text-lg font-semibold tabular-nums">{formatMoney(total)}</span>
      </div>
      {error && <p className="text-sm text-berry">{error}</p>}
    </div>
  );
}

// Chuẩn hoá về [{ name, amount:int }], trả lỗi nếu sai
export function normalizeItems(items) {
  const clean = items.map((it) => ({ name: String(it.name || '').trim(), amount: Math.round(Number(it.amount)) }));
  if (!clean.length) return { error: 'Cần ít nhất 1 khoản thu.' };
  for (const it of clean) {
    if (!it.name) return { error: 'Mỗi khoản thu cần có tên.' };
    if (!Number.isFinite(it.amount) || it.amount < 0) return { error: 'Số tiền phải là số không âm.' };
  }
  return { items: clean };
}
