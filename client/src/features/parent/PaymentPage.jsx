import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, CircleCheck, RefreshCw, Info } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch.js';
import { paymentApi } from '../../api/payment.api.js';
import { tuitionApi } from '../../api/tuition.api.js';
import { Button, Skeleton, Chip, StatusChip } from '../../components/ui/index.js';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PATHS } from '../../router/paths.js';
import { TUITION_STATUS, PAYMENT_METHOD } from '../../utils/constants.js';
import { formatMoney, formatMonth, formatDate, formatDateTime } from '../../utils/format.js';

const POLL_MS = 5000;
const MAX_WAIT_MS = 15 * 60 * 1000;

function CopyRow({ label, value, highlight = false }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch {
      /* trình duyệt chặn clipboard */
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-ink-soft">{label}</p>
        <p className={highlight ? 'inline-block rounded-btn bg-sun-soft px-2 py-0.5 font-display text-lg font-bold tracking-wider text-ink' : 'font-medium tabular-nums'}>{value}</p>
      </div>
      <button type="button" onClick={copy} className="touch inline-flex shrink-0 items-center gap-1 rounded-btn border border-line px-3 text-sm hover:bg-paper" aria-label={`Sao chép ${label}`}>
        {ok ? <Check size={16} className="text-leaf" aria-hidden /> : <Copy size={16} aria-hidden />} {ok ? 'Đã chép' : 'Sao chép'}
      </button>
    </div>
  );
}

const mmss = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

/* ---------- Trang thanh toán SePay: số tiền lớn → QR → thông tin CK → chờ xác nhận ---------- */
export default function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: qr, loading, error, reload } = useFetch(() => paymentApi.qr(id), [id]);
  const [status, setStatus] = useState(null);
  const [left, setLeft] = useState(MAX_WAIT_MS);
  const [expired, setExpired] = useState(false);
  const startedAt = useRef(Date.now());
  const code = qr?.paymentCode;

  // Polling 5s (dự phòng khi socket rớt; GĐ7.1 thêm lắng nghe payment:success), tối đa 15 phút
  useEffect(() => {
    if (!code || expired) return;
    let alive = true;
    const tick = async () => {
      try {
        const s = await paymentApi.status(code);
        if (!alive) return;
        setStatus(s);
        if (s.isPaid) return;
      } catch {
        /* thử lại lần sau */
      }
      const elapsed = Date.now() - startedAt.current;
      if (elapsed >= MAX_WAIT_MS) {
        setExpired(true);
        return;
      }
      setLeft(MAX_WAIT_MS - elapsed);
    };
    tick();
    const poll = setInterval(tick, POLL_MS);
    const clock = setInterval(() => setLeft(Math.max(0, MAX_WAIT_MS - (Date.now() - startedAt.current))), 1000);
    return () => { alive = false; clearInterval(poll); clearInterval(clock); };
  }, [code, expired]);

  const restart = () => { startedAt.current = Date.now(); setLeft(MAX_WAIT_MS); setExpired(false); reload(); };
  const isPaid = status?.isPaid || (qr && qr.amount === 0);
  const remaining = status ? status.remaining : qr?.amount;
  // QR luôn theo số còn lại mới nhất
  const qrUrl = qr && status && status.remaining !== qr.amount ? qr.qrUrl.replace(/amount=\d+/, `amount=${status.remaining}`) : qr?.qrUrl;

  if (isPaid) {
    return (
      <div className="card flex flex-col items-center px-6 py-10 text-center">
        <span className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-leaf-soft text-leaf"><CircleCheck size={44} strokeWidth={1.75} aria-hidden /></span>
        <h2 className="text-xl">Thanh toán thành công</h2>
        <p className="mt-1 text-sm text-ink-soft">Nhà trường đã nhận <strong className="text-ink">{formatMoney(qr?.totalAmount || status?.amount)}</strong> học phí {status ? formatMonth(status.month) : ''}. Cảm ơn ba mẹ!</p>
        {status?.lastPayment && <p className="mt-1 text-xs text-ink-soft tabular-nums">Giao dịch lúc {formatDateTime(status.lastPayment.transactionDate)}</p>}
        <div className="mt-6 flex gap-2">
          <Link to={PATHS.parent.tuitions}><Button variant="secondary">Về học phí</Button></Link>
          <Button onClick={() => navigate(`${PATHS.parent.tuitions}/${id}`)}>Xem biên lai</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to={PATHS.parent.tuitions} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><ArrowLeft size={16} aria-hidden /> Học phí</Link>
      <ErrorBanner message={error} onRetry={reload} />
      {loading || !qr ? (
        <div className="card space-y-4 p-6"><Skeleton className="mx-auto h-10 w-40" /><Skeleton className="mx-auto h-56 w-56" /><Skeleton className="h-32 w-full" /></div>
      ) : (
        <>
          <section className="card p-5 text-center">
            <p className="text-sm text-ink-soft">Số tiền cần chuyển{status?.month ? ` · ${formatMonth(status.month)}` : ''}</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">{formatMoney(remaining)}</p>
            {qr.paidAmount > 0 && <p className="mt-1 text-xs text-ink-soft">Đã nhận {formatMoney(status?.paidAmount ?? qr.paidAmount)} / {formatMoney(qr.totalAmount)}</p>}
            <img src={qrUrl} alt={`Mã QR chuyển khoản ${formatMoney(remaining)} nội dung ${code}`} className="mx-auto mt-4 aspect-square w-full max-w-[280px] rounded-card border border-line bg-white p-2" />
            <p className="mt-3 text-sm text-ink-soft">Mở app ngân hàng → quét QR → kiểm tra số tiền và nội dung rồi xác nhận.</p>
          </section>

          <section className="card divide-y divide-line px-4">
            <CopyRow label="Ngân hàng" value={qr.bank} />
            <CopyRow label="Số tài khoản" value={qr.account} />
            <CopyRow label="Chủ tài khoản" value={qr.accountName} />
            <CopyRow label="Số tiền" value={formatMoney(remaining)} />
            <CopyRow label="Nội dung chuyển khoản (bắt buộc đúng)" value={code} highlight />
          </section>

          <p className="flex items-start gap-2 rounded-card border border-sky bg-sky-soft px-3 py-2 text-xs text-[#1F6FA8]"><Info size={14} className="mt-0.5 shrink-0" aria-hidden />Mỗi bé chuyển khoản riêng, chỉ ghi đúng mã <strong>{code}</strong> trong nội dung. Ghi sai hoặc gộp nhiều bé thì nhà trường phải đối soát tay, cập nhật sẽ chậm hơn.</p>

          <section className="card p-4 text-center">
            {expired ? (
              <>
                <p className="text-sm">Hết thời gian chờ tự động. Nếu ba mẹ đã chuyển khoản, hệ thống vẫn cập nhật khi ngân hàng báo về.</p>
                <Button className="mt-3" variant="secondary" icon={RefreshCw} onClick={restart}>Kiểm tra lại</Button>
              </>
            ) : (
              <>
                <p className="flex items-center justify-center gap-2 text-sm"><span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-sun" aria-hidden />Đang chờ xác nhận từ ngân hàng…</p>
                <p className="mt-1 text-xs text-ink-soft tabular-nums">Tự kiểm tra mỗi 5 giây · còn {mmss(left)}</p>
              </>
            )}
            {status && <div className="mt-2 flex justify-center"><StatusChip map={TUITION_STATUS} value={status.status} /></div>}
          </section>
        </>
      )}
    </div>
  );
}

/* ---------- Biên lai / chi tiết học phí ---------- */
export function TuitionReceiptPage() {
  const { id } = useParams();
  const { data: t, loading, error, reload } = useFetch(() => tuitionApi.get(id), [id]);
  const { data: st } = useFetch(() => (t?.paymentCode ? paymentApi.status(t.paymentCode) : Promise.resolve(null)), [t?.paymentCode]);
  return (
    <div className="space-y-4">
      <Link to={PATHS.parent.tuitions} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><ArrowLeft size={16} aria-hidden /> Học phí</Link>
      <ErrorBanner message={error} onRetry={reload} />
      {loading || !t ? (
        <Skeleton className="h-64 rounded-card" />
      ) : (
        <section className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg">Học phí {formatMonth(t.month)}</h2>
              <p className="text-xs text-ink-soft">{t.student?.fullName} · {t.class?.name} · Hạn {formatDate(t.dueDate)}</p>
            </div>
            <StatusChip map={TUITION_STATUS} value={t.status} />
          </div>
          <ul className="mt-4 divide-y divide-line rounded-card border border-line text-sm">
            {t.items.map((i, idx) => <li key={idx} className="flex justify-between px-3 py-2"><span>{i.name}</span><span className="tabular-nums">{formatMoney(i.amount)}</span></li>)}
            <li className="flex justify-between bg-paper px-3 py-2 font-medium"><span>Tổng cộng</span><span className="tabular-nums">{formatMoney(t.amount)}</span></li>
            <li className="flex justify-between px-3 py-2 text-leaf-dark"><span>Đã đóng</span><span className="tabular-nums">{formatMoney(t.paidAmount)}</span></li>
          </ul>
          <dl className="mt-4 grid grid-cols-[120px_1fr] gap-y-1.5 text-sm">
            <dt className="text-ink-soft">Mã thanh toán</dt><dd className="font-mono tracking-wider">{t.paymentCode}</dd>
            {st?.lastPayment && (
              <>
                <dt className="text-ink-soft">Giao dịch cuối</dt>
                <dd className="tabular-nums">{formatDateTime(st.lastPayment.transactionDate)} · {formatMoney(st.lastPayment.amount)} <Chip tone={PAYMENT_METHOD[st.lastPayment.method]?.tone || 'muted'}>{PAYMENT_METHOD[st.lastPayment.method]?.label || st.lastPayment.method}</Chip></dd>
              </>
            )}
            {t.note && <><dt className="text-ink-soft">Ghi chú</dt><dd>{t.note}</dd></>}
          </dl>
          {t.status !== 'paid' && <Link to={`${PATHS.parent.tuitions}/${t._id}/pay`} className="mt-4 block"><Button className="w-full">Thanh toán {formatMoney(t.amount - t.paidAmount)}</Button></Link>}
        </section>
      )}
    </div>
  );
}
