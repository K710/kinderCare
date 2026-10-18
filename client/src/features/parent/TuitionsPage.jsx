import { Link } from 'react-router-dom';
import { Wallet, ChevronRight, Baby, CircleCheck } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch.js';
import { useSelectedChild } from '../../hooks/useSelectedChild.js';
import { tuitionApi } from '../../api/tuition.api.js';
import { Skeleton, EmptyState, StatusChip, Button } from '../../components/ui/index.js';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PATHS } from '../../router/paths.js';
import { TUITION_STATUS } from '../../utils/constants.js';
import { formatMoney, formatMonth, formatDate } from '../../utils/format.js';

// Học phí của bé đang chọn: khoản chưa đóng lên đầu, bấm "Thanh toán" → trang QR
export default function ParentTuitionsPage() {
  const { child, childId } = useSelectedChild();
  const { data, loading, error, reload } = useFetch(tuitionApi.my, []);
  if (!child) return <EmptyState icon={Baby} title="Chưa có thông tin bé" />;

  const mine = (data || []).filter((t) => (t.student?._id || t.student) === childId);
  const due = mine.filter((t) => t.status !== 'paid');
  const paid = mine.filter((t) => t.status === 'paid');
  const totalDue = due.reduce((s, t) => s + (t.amount - t.paidAmount), 0);

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onRetry={reload} />
      <section className="card flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-ink-soft">Còn phải đóng</p>
          <p className="font-display text-2xl font-bold tabular-nums">{loading ? '…' : formatMoney(totalDue)}</p>
          <p className="text-xs text-ink-soft">{due.length ? `${due.length} khoản · mỗi bé chuyển khoản riêng theo mã` : 'Bé đã đóng đủ, cảm ơn ba mẹ!'}</p>
        </div>
        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${totalDue ? 'bg-sun-soft text-[#8A6100]' : 'bg-leaf-soft text-leaf'}`}>{totalDue ? <Wallet size={24} strokeWidth={1.75} aria-hidden /> : <CircleCheck size={24} strokeWidth={1.75} aria-hidden />}</span>
      </section>

      {loading ? (
        <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-24 rounded-card" />)}</div>
      ) : !mine.length ? (
        <EmptyState icon={Wallet} title="Chưa có học phí" description="Nhà trường chưa tạo khoản thu cho bé." />
      ) : (
        <>
          {due.length > 0 && (
            <section>
              <h2 className="mb-2 text-base">Cần thanh toán</h2>
              <ul className="space-y-2">{due.map((t) => <TuitionCard key={t._id} t={t} />)}</ul>
            </section>
          )}
          {paid.length > 0 && (
            <section>
              <h2 className="mb-2 text-base">Đã đóng</h2>
              <ul className="space-y-2">{paid.map((t) => <TuitionCard key={t._id} t={t} />)}</ul>
            </section>
          )}
        </>
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
          <p className="text-xs text-ink-soft">Hạn {formatDate(t.dueDate)} · {t.items?.length || 0} khoản</p>
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
