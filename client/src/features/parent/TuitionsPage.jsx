import { Link } from 'react-router-dom';
import { Wallet, ChevronRight, Baby, CircleCheck } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch.js';
import { useSelectedChild } from '../../hooks/useSelectedChild.js';
import { tuitionApi } from '../../api/tuition.api.js';
import { Skeleton, EmptyState, StatusChip, Button, Avatar } from '../../components/ui/index.js';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PATHS } from '../../router/paths.js';
import { TUITION_STATUS } from '../../utils/constants.js';
import { formatMoney, formatMonth, formatDate, childName } from '../../utils/format.js';

// "Gồm học phí, tiền ăn"
export const itemsText = (items = []) => (items.length ? `Gồm ${items.map((i) => i.name.charAt(0).toLowerCase() + i.name.slice(1)).join(', ')}` : '');

// Học phí của TẤT CẢ các con, nhóm theo bé; ô tổng cộng mọi bé
export default function ParentTuitionsPage() {
  const { children } = useSelectedChild();
  const { data, loading, error, reload } = useFetch(tuitionApi.my, []);
  if (!children.length) return <EmptyState icon={Baby} title="Chưa có thông tin bé" />;

  const all = data || [];
  const due = all.filter((t) => t.status !== 'paid');
  const totalDue = due.reduce((s, t) => s + (t.amount - t.paidAmount), 0);
  // Nhóm theo bé, theo thứ tự danh sách con
  const groups = children.map((c) => ({ child: c, items: all.filter((t) => (t.student?._id || t.student) === c._id) })).filter((g) => g.items.length);

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onRetry={reload} />
      <section className="card flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-ink-soft">Còn phải đóng{children.length > 1 ? ` (${children.length} bé)` : ''}</p>
          <p className="font-display text-2xl font-bold tabular-nums">{loading ? '…' : formatMoney(totalDue)}</p>
          <p className="text-xs text-ink-soft">{loading ? '' : due.length ? `${due.length} tháng chưa đóng · mỗi bé chuyển khoản riêng theo mã` : 'Đã đóng đủ, cảm ơn ba mẹ!'}</p>
        </div>
        <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${totalDue ? 'bg-sun-soft text-[#8A6100]' : 'bg-leaf-soft text-leaf'}`}>
          {totalDue ? <Wallet size={24} strokeWidth={1.75} aria-hidden /> : <CircleCheck size={24} strokeWidth={1.75} aria-hidden />}
        </span>
      </section>

      {loading ? (
        <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-24 rounded-card" />)}</div>
      ) : !all.length ? (
        <EmptyState icon={Wallet} title="Chưa có học phí" description="Nhà trường chưa tạo khoản thu cho bé." />
      ) : (
        groups.map(({ child, items }) => {
          const childDue = items.filter((t) => t.status !== 'paid');
          const childPaid = items.filter((t) => t.status === 'paid');
          return (
            <section key={child._id}>
              <div className="mb-2 flex items-center gap-3">
                <Avatar src={child.avatar} name={child.fullName} size="sm" />
                <div className="min-w-0">
                  <h2 className="truncate text-base">{childName(child)}</h2>
                  <p className="truncate text-xs text-ink-soft">{child.nickname ? `${child.fullName} · ` : ''}{child.class?.name || 'Chưa xếp lớp'}</p>
                </div>
                {childDue.length > 0 && <span className="ml-auto text-sm font-medium tabular-nums text-[#8A6100]">{childDue.length} tháng chưa đóng</span>}
              </div>
              <ul className="space-y-2">
                {childDue.map((t) => <TuitionCard key={t._id} t={t} />)}
                {childPaid.map((t) => <TuitionCard key={t._id} t={t} />)}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function TuitionCard({ t }) {
  const remaining = Math.max(0, t.amount - t.paidAmount);
  return (
    <li className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold">{formatMonth(t.month)}</p>
          <p className="text-xs text-ink-soft">Hạn {formatDate(t.dueDate)} · {itemsText(t.items)}</p>
        </div>
        <StatusChip map={TUITION_STATUS} value={t.status} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-sm">
          {t.status === 'paid' ? (
            <p>Đã đóng <strong className="tabular-nums">{formatMoney(t.amount)}</strong></p>
          ) : (
            <>
              <p className="text-ink-soft">Còn lại</p>
              <p className="font-display text-xl font-bold tabular-nums">{formatMoney(remaining)}</p>
              {t.paidAmount > 0 && <p className="text-xs text-ink-soft">Đã nhận {formatMoney(t.paidAmount)} / {formatMoney(t.amount)}</p>}
            </>
          )}
        </div>
        {t.status === 'paid' ? (
          <Link to={`${PATHS.parent.tuitions}/${t._id}`} className="inline-flex items-center gap-1 text-sm text-sky hover:underline">Xem biên lai <ChevronRight size={16} aria-hidden /></Link>
        ) : (
          <Link to={`${PATHS.parent.tuitions}/${t._id}/pay`}><Button size="sm">Thanh toán</Button></Link>
        )}
      </div>
    </li>
  );
}
