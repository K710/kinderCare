import { useState } from 'react';
import { Link2, Unlink, Trash2, Eye, Banknote } from 'lucide-react';
import { paymentApi } from '../../api/payment.api.js';
import { tuitionApi } from '../../api/tuition.api.js';
import { studentApi } from '../../api/student.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch, useDebounce } from '../../hooks/useFetch.js';
import { usePagination } from '../../hooks/usePagination.js';
import { toast } from '../../stores/toast.store.js';
import { Button, Input, Select, Textarea, SearchInput, DataTable, StatusChip, Modal, ConfirmDialog, Avatar, Tabs, Skeleton, DatePicker } from '../../components/ui/index.js';
import { EntityPicker } from '../../components/shared/EntityPicker.jsx';
import { FormError } from '../../components/shared/FormError.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { PAYMENT_STATUS, PAYMENT_METHOD, TUITION_STATUS } from '../../utils/constants.js';
import { formatMoney, formatMonth, formatDateTime, formatDate } from '../../utils/format.js';
import { TuitionDetailModal } from './TuitionsPage.jsx';

// Bỏ dấu, thường hoá để so khớp tên trong nội dung chuyển khoản
const strip = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
// Gợi ý bé có tên xuất hiện trong nội dung CK: tên ở nhà hoặc ≥1 từ dài ≥4 ký tự / ≥2 từ trong họ tên
export function suggestStudents(content, students = []) {
  const text = ` ${strip(content).replace(/[^a-z0-9]+/g, ' ')} `;
  if (text.trim().length < 2) return [];
  return students
    .map((s) => {
      const tokens = strip(s.fullName).split(/\s+/).filter(Boolean);
      const hits = tokens.filter((t) => text.includes(` ${t} `));
      let score = hits.reduce((sum, t) => sum + t.length, 0);
      if (hits.length < 2 && !hits.some((t) => t.length >= 4)) score = 0;
      if (s.nickname && text.includes(` ${strip(s.nickname)} `)) score += 10;
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.s);
}

const STATUS_OPTIONS = Object.entries(PAYMENT_STATUS).map(([value, s]) => ({ value, label: s.label }));
const METHOD_OPTIONS = Object.entries(PAYMENT_METHOD).map(([value, s]) => ({ value, label: s.label }));

/* ---------- Chọn bé → chọn học phí chưa đóng đủ ---------- */
function TuitionSelector({ student, setStudent, tuitionId, setTuitionId, amountHint }) {
  const sid = student[0]?._id;
  const { data: tuitions, loading } = useFetch(() => tuitionApi.list({ student: sid, limit: 24 }).then((r) => r.data), [sid], { enabled: !!sid });
  return (
    <>
      <EntityPicker
        label="Bé"
        multiple={false}
        selected={student}
        onChange={(v) => { setStudent(v); setTuitionId(''); }}
        fetcher={(search) => studentApi.list({ search, limit: 10 }).then((r) => r.data)}
        getSub={(s) => s.class?.name || 'Chưa xếp lớp'}
        renderAvatar={(s) => <Avatar name={s.fullName} src={s.avatar} size="sm" />}
        placeholder="Tìm bé theo tên…"
      />
      {sid && (
        <div>
          <p className="mb-1.5 text-sm font-medium">Học phí</p>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : tuitions?.length ? (
            <ul className="max-h-60 space-y-1.5 overflow-y-auto">
              {tuitions.map((t) => {
                const remaining = Math.max(0, t.amount - t.paidAmount);
                return (
                  <li key={t._id}>
                    <label className={`flex cursor-pointer items-center gap-3 rounded-card border p-3 text-sm ${tuitionId === t._id ? 'border-leaf bg-leaf-soft/40' : 'border-line hover:bg-paper'}`}>
                      <input type="radio" name="tuition" className="h-4 w-4 accent-leaf" checked={tuitionId === t._id} onChange={() => setTuitionId(t._id)} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-medium">{formatMonth(t.month)} <StatusChip map={TUITION_STATUS} value={t.status} /></span>
                        <span className="block text-xs text-ink-soft tabular-nums">
                          {t.paymentCode} · Còn {formatMoney(remaining)} / {formatMoney(t.amount)} · Hạn {formatDate(t.dueDate)}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">Bé chưa có học phí nào. Tạo học phí trước.</p>
          )}
          {(() => {
            const sel = (tuitions || []).find((t) => t._id === tuitionId);
            return sel && sel.amount - sel.paidAmount <= 0 ? (
              <p className="mt-2 rounded-card border border-peach bg-peach-soft px-3 py-2 text-sm text-[#B5412F]">Học phí {formatMonth(sel.month)} đã đóng đủ. Gán thêm sẽ ghi nhận thanh toán thừa (có ghi chú), hãy kiểm tra lại bé và tháng.</p>
            ) : null;
          })()}
          {amountHint}
        </div>
      )}
    </>
  );
}

/* ---------- Gán giao dịch chưa khớp vào học phí ---------- */
function AssignModal({ payment, onClose, onDone }) {
  const [student, setStudent] = useState([]);
  const { data: allStudents } = useFetch(() => studentApi.list({ limit: 100 }).then((r) => r.data), []);
  const suggestions = suggestStudents(payment?.content, allStudents || []).filter((s) => s._id !== student[0]?._id);
  const [tuitionId, setTuitionId] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!tuitionId) return setErr('Chọn học phí để gán.');
    setLoading(true);
    setErr('');
    try {
      await paymentApi.assign(payment._id, tuitionId, note.trim() || undefined);
      toast.success('Đã gán giao dịch vào học phí');
      onDone();
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      open={!!payment}
      onClose={onClose}
      title="Gán vào học phí"
      description={payment ? `${formatMoney(payment.amount)} · ${formatDateTime(payment.transactionDate)} · "${payment.content || payment.referenceCode || ''}"` : ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Huỷ</Button>
          <Button onClick={submit} loading={loading} disabled={!tuitionId}>Gán vào học phí</Button>
        </>
      }
    >
      <div className="space-y-4">
        {suggestions.length > 0 && (
          <div className="rounded-card border border-sun bg-sun-soft p-3 text-sm">
            <p className="font-medium">Gợi ý theo tên trong nội dung chuyển khoản</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s._id} type="button" onClick={() => { setStudent([s]); setTuitionId(''); }} className="touch md:min-h-9 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm hover:bg-paper">
                  <Avatar name={s.fullName} src={s.avatar} size="sm" />
                  <span><strong>{s.nickname || s.fullName}</strong>{s.nickname ? ` · ${s.fullName}` : ''}{s.class?.name ? ` · ${s.class.name}` : ''}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <TuitionSelector student={student} setStudent={setStudent} tuitionId={tuitionId} setTuitionId={setTuitionId} />
        <Textarea label="Ghi chú" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="vd: PH ghi sai nội dung chuyển khoản" />
        <FormError message={err} />
      </div>
    </Modal>
  );
}

/* ---------- Thu tiền mặt ---------- */
function CashModal({ open, onClose, onDone }) {
  const [student, setStudent] = useState([]);
  const [tuitionId, setTuitionId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setErr('');
    const n = Math.round(Number(amount));
    if (!tuitionId) return setErr('Chọn học phí.');
    if (!Number.isFinite(n) || n <= 0) return setErr('Số tiền phải lớn hơn 0.');
    setLoading(true);
    try {
      await paymentApi.manual({ tuitionId, amount: n, note: note.trim() || undefined, transactionDate: date || undefined });
      toast.success(`Đã ghi nhận thu ${formatMoney(n)} tiền mặt`);
      onDone();
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thu tiền mặt"
      description="Ghi nhận phụ huynh đóng trực tiếp tại trường. Số tiền được cộng ngay vào học phí."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Huỷ</Button>
          <Button icon={Banknote} onClick={submit} loading={loading} disabled={!tuitionId}>Ghi nhận thu tiền</Button>
        </>
      }
    >
      <div className="space-y-4">
        <TuitionSelector student={student} setStudent={setStudent} tuitionId={tuitionId} setTuitionId={setTuitionId} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Số tiền (₫)" type="number" inputMode="numeric" min={1} step={1000} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <DatePicker label="Ngày thu" value={date} max={new Date().toISOString().slice(0, 10)} clearable={false} onChange={(v) => v && setDate(v)} />
        </div>
        <Textarea label="Ghi chú" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc" />
        <FormError message={err} />
      </div>
    </Modal>
  );
}

/* ---------- Trang ---------- */
export default function ReconcilePage() {
  const [tab, setTab] = useState('unmatched');
  const { setPage, filters, setFilters, params } = usePagination({ status: '', method: '', from: '', to: '', search: '' });
  const search = useDebounce(filters.search);
  const fetcher = tab === 'unmatched' ? paymentApi.unmatched : paymentApi.list;
  const { data, loading, error, reload } = useFetch(() => fetcher({ ...params, search, status: tab === 'unmatched' ? undefined : params.status }), [tab, params.page, params.status, params.method, params.from, params.to, search]);
  const { data: unmatched, reload: reloadCount } = useFetch(() => paymentApi.unmatched({ limit: 1 }), []);
  const [assign, setAssign] = useState(null);
  const [unassign, setUnassign] = useState(null);
  const [del, setDel] = useState(null);
  const [cash, setCash] = useState(false);
  const [detail, setDetail] = useState(null);
  const reloadAll = () => { reload(); reloadCount(); };

  return (
    <>
      <PageHeader
        description="Giao dịch SePay chưa khớp mã cần gán tay. Gỡ gán hay xoá đều phải ghi lý do."
        actions={<Button icon={Banknote} onClick={() => setCash(true)}>Thu tiền mặt</Button>}
      />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={(v) => { setTab(v); setPage(1); }}
        items={[
          { value: 'unmatched', label: 'Chưa khớp', count: unmatched?.pagination?.total ?? 0 },
          { value: 'all', label: 'Tất cả giao dịch' },
        ]}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-[1fr_180px_180px_160px_160px]">
        <SearchInput className="col-span-2 md:col-span-1" value={filters.search} onChange={(v) => setFilters({ search: v })} placeholder="Tìm theo mã HP, nội dung CK" />
        {tab === 'all' && <Select value={filters.status} onChange={(e) => setFilters({ status: e.target.value })} options={STATUS_OPTIONS} placeholder="Mọi trạng thái" aria-label="Lọc trạng thái" />}
        <Select value={filters.method} onChange={(e) => setFilters({ method: e.target.value })} options={METHOD_OPTIONS} placeholder="Mọi phương thức" aria-label="Lọc phương thức" className={tab === 'all' ? '' : 'col-span-2 md:col-span-1'} />
        <DatePicker value={filters.from} onChange={(v) => setFilters({ from: v })} placeholder="Từ ngày" aria-label="Từ ngày" />
        <DatePicker value={filters.to.slice(0, 10)} onChange={(v) => setFilters({ to: v ? `${v}T23:59:59` : '' })} placeholder="Đến ngày" aria-label="Đến ngày" />
      </div>

      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      <DataTable
        loading={loading}
        rows={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyTitle={tab === 'unmatched' ? 'Không có giao dịch chưa khớp' : 'Chưa có giao dịch'}
        emptyDescription={tab === 'unmatched' ? 'Mọi khoản chuyển về đều đã khớp mã học phí.' : undefined}
        columns={[
          {
            key: 'transactionDate',
            title: 'Giao dịch',
            render: (p) => (
              <div>
                <p className="font-medium tabular-nums">{formatDateTime(p.transactionDate)}</p>
                <p className="max-w-[240px] truncate text-xs text-ink-soft" title={p.content}>{p.content || p.note || p.referenceCode || '—'}</p>
              </div>
            ),
          },
          { key: 'amount', title: 'Số tiền', align: 'right', render: (p) => <span className="font-display text-base font-semibold tabular-nums">{formatMoney(p.amount)}</span> },
          { key: 'kind', title: 'Loại / trạng thái', card: 'chip', render: (p) => <div className="flex flex-wrap items-center gap-1"><StatusChip map={PAYMENT_METHOD} value={p.method} /><StatusChip map={PAYMENT_STATUS} value={p.status} /></div> },
          {
            key: 'tuition',
            title: 'Học phí',
            render: (p) =>
              p.tuition ? (
                <button type="button" className="text-left text-sm hover:underline" onClick={(e) => { e.stopPropagation(); setDetail(p.tuition._id); }}>
                  <span className="font-medium">{p.tuition.student?.fullName}</span>
                  <span className="block text-xs text-ink-soft">{formatMonth(p.tuition.month)} · {p.tuition.paymentCode}</span>
                </button>
              ) : (
                <span className="text-sm text-ink-soft">{p.paymentCode ? `Mã ${p.paymentCode} không tồn tại` : 'Không tìm thấy mã HP'}</span>
              ),
          },
          {
            key: 'actions',
            title: '',
            align: 'right',
            actions: (p) => [
              { key: 'assign', label: 'Gán vào học phí', icon: Link2, hidden: p.status !== 'unmatched', onClick: () => setAssign(p) },
              { key: 'view', label: 'Xem học phí', icon: Eye, hidden: !p.tuition, onClick: () => setDetail(p.tuition._id) },
              { key: 'unassign', label: 'Gỡ gán', icon: Unlink, danger: true, hidden: p.status === 'unmatched' || p.method === 'cash', onClick: () => setUnassign(p) },
              { key: 'del', label: 'Xoá khoản tiền mặt', icon: Trash2, danger: true, hidden: p.method !== 'cash', onClick: () => setDel(p) },
            ],
          },
        ]}
      />

      {assign && <AssignModal payment={assign} onClose={() => setAssign(null)} onDone={reloadAll} />}
      {cash && <CashModal open onClose={() => setCash(false)} onDone={reloadAll} />}
      <TuitionDetailModal tuitionId={detail} onClose={() => setDetail(null)} />
      <ConfirmDialog
        open={!!unassign}
        onClose={() => setUnassign(null)}
        danger
        requireReason
        title="Gỡ gán giao dịch"
        confirmLabel="Gỡ gán"
        message={unassign ? `${formatMoney(unassign.amount)} sẽ bị trừ khỏi học phí của ${unassign.tuition?.student?.fullName || 'bé'} và giao dịch quay về "Chưa khớp". Phụ huynh sẽ được thông báo.` : ''}
        onConfirm={(reason) => paymentApi.unassign(unassign._id, reason).then(() => { toast.success('Đã gỡ gán giao dịch'); reloadAll(); }).catch((e) => toast.error(errorMessage(e)))}
      />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        danger
        requireReason
        title="Xoá khoản thu tiền mặt"
        confirmLabel="Xoá khoản thu"
        message={del ? `${formatMoney(del.amount)} tiền mặt sẽ bị trừ khỏi học phí. Thao tác được ghi vào nhật ký.` : ''}
        onConfirm={(reason) => paymentApi.removeCash(del._id, reason).then(() => { toast.success('Đã xoá khoản thu tiền mặt'); reloadAll(); }).catch((e) => toast.error(errorMessage(e)))}
      />
    </>
  );
}
