import { useState } from 'react';
import { Plus, Users, Pencil, Trash2, Eye, Copy, Check } from 'lucide-react';
import { tuitionApi } from '../../api/tuition.api.js';
import { paymentApi } from '../../api/payment.api.js';
import { classApi } from '../../api/class.api.js';
import { studentApi } from '../../api/student.api.js';
import { schoolYearApi } from '../../api/schoolYear.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch, useDebounce } from '../../hooks/useFetch.js';
import { usePagination } from '../../hooks/usePagination.js';
import { toast } from '../../stores/toast.store.js';
import { Button, Input, Select, Textarea, SearchInput, DataTable, StatusChip, Chip, Modal, ConfirmDialog, Avatar, StatTile, Skeleton, DatePicker } from '../../components/ui/index.js';
import { EntityPicker } from '../../components/shared/EntityPicker.jsx';
import { TuitionItemsEditor, normalizeItems } from '../../components/shared/TuitionItemsEditor.jsx';
import { FormError } from '../../components/shared/FormError.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { TUITION_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } from '../../utils/constants.js';
import { formatMoney, formatDate, formatMonth, formatDateTime, currentMonth, toInputDate } from '../../utils/format.js';
import dayjs from '../../utils/dayjs.js';

const STATUS_OPTIONS = Object.entries(TUITION_STATUS).map(([value, s]) => ({ value, label: s.label }));
const defaultDue = (month) => dayjs(`${month}-10`).format('YYYY-MM-DD'); // hạn mặc định: mùng 10
const defaultItems = (sy) => [{ name: 'Học phí', amount: sy?.tuitionDefault || '' }];

/* ---------- Nút sao chép ---------- */
export function CopyButton({ text, label = 'Sao chép' }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch {
      /* trình duyệt chặn clipboard */
    }
  };
  return (
    <Button size="sm" variant="secondary" icon={ok ? Check : Copy} onClick={copy} aria-label={`${label} ${text}`}>
      {ok ? 'Đã chép' : label}
    </Button>
  );
}

/* ---------- Tạo học phí cho cả lớp ---------- */
function BulkModal({ open, onClose, classes, schoolYear, onDone }) {
  const [classId, setClassId] = useState('');
  const [month, setMonth] = useState(currentMonth());
  const [dueDate, setDueDate] = useState(defaultDue(currentMonth()));
  const [items, setItems] = useState(defaultItems(schoolYear));
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    setErr('');
    if (!classId) return setErr('Chọn lớp.');
    const n = normalizeItems(items);
    if (n.error) return setErr(n.error);
    setLoading(true);
    try {
      const r = await tuitionApi.bulkCreate({ class: classId, month, items: n.items, dueDate });
      setResult(r);
      toast.success(`Đã tạo học phí cho ${r.created} bé`);
      onDone();
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
      title="Tạo học phí cho cả lớp"
      description="Mỗi bé đang học trong lớp sẽ có 1 khoản học phí tháng này. Bé đã có sẽ được bỏ qua."
      footer={
        result ? (
          <Button onClick={onClose}>Xong</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>Huỷ</Button>
            <Button onClick={submit} loading={loading}>Tạo học phí</Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-2 text-sm">
          <p>
            Đã tạo <strong>{result.created}</strong>/{result.total} bé.
          </p>
          {result.skipped?.length > 0 && (
            <div className="rounded-card border border-line bg-paper p-3">
              <p className="font-medium">Bỏ qua {result.skipped.length} bé đã có học phí tháng này:</p>
              <ul className="mt-1 list-inside list-disc text-ink-soft">
                {result.skipped.map((s) => (
                  <li key={s.student}>{s.fullName}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Select label="Lớp" value={classId} onChange={(e) => setClassId(e.target.value)} options={classes.map((c) => ({ value: c._id, label: `${c.name} (${c.studentCount} bé)` }))} placeholder="Chọn lớp" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tháng" type="month" value={month} onChange={(e) => { setMonth(e.target.value); if (e.target.value) setDueDate(defaultDue(e.target.value)); }} />
            <DatePicker label="Hạn đóng" value={dueDate} clearable={false} onChange={(v) => v && setDueDate(v)} />
          </div>
          <TuitionItemsEditor items={items} onChange={setItems} />
          <FormError message={err} />
        </div>
      )}
    </Modal>
  );
}

/* ---------- Tạo cho 1 bé / Sửa ---------- */
function TuitionFormModal({ open, onClose, tuition, schoolYear, onSaved }) {
  const isEdit = !!tuition;
  const [student, setStudent] = useState(tuition?.student ? [tuition.student] : []);
  const [month, setMonth] = useState(tuition?.month || currentMonth());
  const [dueDate, setDueDate] = useState(tuition ? toInputDate(tuition.dueDate) : defaultDue(currentMonth()));
  const [items, setItems] = useState(tuition?.items?.length ? tuition.items.map((i) => ({ name: i.name, amount: i.amount })) : defaultItems(schoolYear));
  const [note, setNote] = useState(tuition?.note || '');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const hasMoney = isEdit && tuition.paidAmount > 0;

  const submit = async () => {
    setErr('');
    const n = normalizeItems(items);
    if (n.error) return setErr(n.error);
    const total = n.items.reduce((s, i) => s + i.amount, 0);
    if (hasMoney && total < tuition.paidAmount) return setErr(`Tổng mới (${formatMoney(total)}) không được nhỏ hơn số đã thu (${formatMoney(tuition.paidAmount)}).`);
    if (hasMoney && reason.trim().length < 3) return setErr('Học phí đã có tiền vào: nhập lý do điều chỉnh (tối thiểu 3 ký tự).');
    if (!isEdit && !student.length) return setErr('Chọn bé.');
    setLoading(true);
    try {
      const saved = isEdit
        ? await tuitionApi.update(tuition._id, { items: n.items, dueDate, note: note.trim() || undefined, reason: hasMoney ? reason.trim() : undefined })
        : await tuitionApi.create({ student: student[0]._id, month, items: n.items, dueDate, note: note.trim() || undefined });
      toast.success(isEdit ? 'Đã lưu học phí' : 'Đã tạo học phí');
      onSaved(saved);
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
      title={isEdit ? 'Sửa học phí' : 'Tạo học phí cho 1 bé'}
      description={isEdit ? `${tuition.student?.fullName} · ${formatMonth(tuition.month)}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Huỷ</Button>
          <Button onClick={submit} loading={loading}>{isEdit ? 'Lưu thay đổi' : 'Tạo học phí'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {!isEdit && (
          <EntityPicker
            label="Bé"
            multiple={false}
            selected={student}
            onChange={setStudent}
            fetcher={(search) => studentApi.list({ search, limit: 10 }).then((r) => r.data)}
            getSub={(s) => s.class?.name || 'Chưa xếp lớp'}
            renderAvatar={(s) => <Avatar name={s.fullName} src={s.avatar} size="sm" />}
            placeholder="Tìm bé theo tên…"
            hint="Chỉ tạo được cho bé đã xếp lớp."
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Tháng" type="month" value={month} disabled={isEdit} onChange={(e) => { setMonth(e.target.value); if (e.target.value) setDueDate(defaultDue(e.target.value)); }} />
          <DatePicker label="Hạn đóng" value={dueDate} clearable={false} onChange={(v) => v && setDueDate(v)} />
        </div>
        <TuitionItemsEditor items={items} onChange={setItems} />
        {hasMoney && (
          <div className="rounded-card border border-sun bg-sun-soft p-3 text-sm">
            <p>Đã thu <strong>{formatMoney(tuition.paidAmount)}</strong>. Mọi thay đổi sẽ được ghi vào nhật ký hệ thống.</p>
            <Textarea className="mt-2" label="Lý do điều chỉnh" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
        <Textarea label="Ghi chú" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc" />
        <FormError message={err} />
      </div>
    </Modal>
  );
}

/* ---------- Chi tiết học phí + giao dịch ---------- */
export function TuitionDetailModal({ tuitionId, onClose }) {
  const { data: t, loading } = useFetch(() => tuitionApi.get(tuitionId), [tuitionId], { enabled: !!tuitionId });
  const { data: payments } = useFetch(() => paymentApi.list({ tuition: tuitionId, limit: 50 }).then((r) => r.data), [tuitionId], { enabled: !!tuitionId });
  if (!tuitionId) return null;
  return (
    <Modal open onClose={onClose} size="lg" title={t ? `${t.student?.fullName} · ${formatMonth(t.month)}` : 'Học phí'} description={t ? `${t.class?.name || ''} · Hạn ${formatDate(t.dueDate)}` : ''} footer={<Button variant="secondary" onClick={onClose}>Đóng</Button>}>
      {loading || !t ? (
        <div className="space-y-2"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-20 w-full" /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-paper p-3">
            <div>
              <p className="text-xs text-ink-soft">Mã thanh toán (nội dung chuyển khoản)</p>
              <p className="font-display text-xl font-bold tracking-wider text-ink">{t.paymentCode}</p>
            </div>
            <CopyButton text={t.paymentCode} label="Sao chép mã" />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-xs text-ink-soft">Tổng</p><p className="font-display text-lg font-semibold tabular-nums">{formatMoney(t.amount)}</p></div>
            <div><p className="text-xs text-ink-soft">Đã thu</p><p className="font-display text-lg font-semibold tabular-nums text-leaf-dark">{formatMoney(t.paidAmount)}</p></div>
            <div><p className="text-xs text-ink-soft">Còn lại</p><p className="font-display text-lg font-semibold tabular-nums">{formatMoney(Math.max(0, t.amount - t.paidAmount))}</p></div>
          </div>
          <div className="flex items-center gap-2"><StatusChip map={TUITION_STATUS} value={t.status} />{t.note && <span className="text-sm text-ink-soft">{t.note}</span>}</div>
          <div>
            <p className="mb-1 text-sm font-medium">Các khoản thu</p>
            <ul className="divide-y divide-line rounded-card border border-line text-sm">
              {t.items.map((i, idx) => (
                <li key={idx} className="flex justify-between px-3 py-2"><span>{i.name}</span><span className="tabular-nums">{formatMoney(i.amount)}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Giao dịch</p>
            {payments?.length ? (
              <ul className="divide-y divide-line rounded-card border border-line text-sm">
                {payments.map((p) => (
                  <li key={p._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <div>
                      <p className="tabular-nums">{formatDateTime(p.transactionDate)}</p>
                      <p className="text-xs text-ink-soft">{p.content || p.note || p.referenceCode || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip map={PAYMENT_METHOD} value={p.method} />
                      <StatusChip map={PAYMENT_STATUS} value={p.status} />
                      <span className="font-medium tabular-nums">{formatMoney(p.amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">Chưa có giao dịch nào.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Trang ---------- */
export default function TuitionsPage() {
  const { setPage, filters, setFilters, params } = usePagination({ month: currentMonth(), class: '', status: '', search: '' });
  const search = useDebounce(filters.search);
  const { data: classes } = useFetch(() => classApi.list({ limit: 100 }).then((r) => r.data), []);
  const { data: schoolYear } = useFetch(() => schoolYearApi.current().catch(() => null), []);
  const { data, loading, error, reload } = useFetch(() => tuitionApi.list({ ...params, search }), [params.page, params.month, params.class, params.status, search]);
  const { data: summary, loading: ls, reload: reloadSummary } = useFetch(
    () => (filters.month ? tuitionApi.summary({ month: filters.month, class: filters.class || undefined }) : Promise.resolve(null)),
    [filters.month, filters.class],
  );
  const [bulk, setBulk] = useState(false);
  const [form, setForm] = useState(undefined);
  const [detail, setDetail] = useState(null);
  const [del, setDel] = useState(null);
  const reloadAll = () => { reload(); reloadSummary(); };

  return (
    <>
      <PageHeader
        description="Tạo khoản thu theo tháng, theo dõi đã thu / còn lại. Phụ huynh thanh toán bằng chuyển khoản theo mã."
        actions={
          <>
            <Button variant="secondary" icon={Plus} onClick={() => setForm(null)}>Tạo cho 1 bé</Button>
            <Button icon={Users} onClick={() => setBulk(true)}>Tạo cho cả lớp</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-[1fr_160px_180px_170px]">
        <SearchInput className="col-span-2 md:col-span-1" value={filters.search} onChange={(v) => setFilters({ search: v })} placeholder="Tìm theo tên bé hoặc mã HP" />
        <Input type="month" value={filters.month} onChange={(e) => setFilters({ month: e.target.value })} aria-label="Tháng" />
        <Select value={filters.class} onChange={(e) => setFilters({ class: e.target.value })} options={(classes || []).map((c) => ({ value: c._id, label: c.name }))} placeholder="Mọi lớp" aria-label="Lọc lớp" />
        <Select value={filters.status} onChange={(e) => setFilters({ status: e.target.value })} options={STATUS_OPTIONS} placeholder="Mọi trạng thái" aria-label="Lọc trạng thái" className="col-span-2 md:col-span-1" />
      </div>

      {filters.month && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label={`Phải thu ${formatMonth(filters.month)}`} value={formatMoney(summary?.totalAmount)} loading={ls} hint={summary ? `${summary.count} khoản` : undefined} tone="muted" />
          <StatTile label="Đã thu" value={formatMoney(summary?.totalPaid)} loading={ls} tone="leaf" hint={summary ? `${summary.paid} đã đóng đủ` : undefined} />
          <StatTile label="Còn lại" value={formatMoney(summary?.remaining)} loading={ls} tone="sun" hint={summary ? `${summary.partial} đóng một phần` : undefined} />
          <StatTile label="Quá hạn" value={summary?.overdue ?? 0} loading={ls} tone={summary?.overdue ? 'berry' : 'muted'} hint={summary ? `${summary.unpaid} chưa đóng` : undefined} />
        </div>
      )}

      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      <DataTable
        loading={loading}
        rows={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowClick={(t) => setDetail(t._id)}
        emptyTitle="Chưa có học phí khớp bộ lọc"
        emptyDescription="Tạo học phí cho cả lớp để bắt đầu thu tháng này."
        columns={[
          {
            key: 'student',
            title: 'Bé',
            render: (t) => (
              <div className="flex items-center gap-3">
                <Avatar name={t.student?.fullName} src={t.student?.avatar} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.student?.fullName}</p>
                  <p className="text-xs text-ink-soft">{t.class?.name} · {formatMonth(t.month)}</p>
                </div>
              </div>
            ),
          },
          { key: 'paymentCode', title: 'Mã', card: 'chip', render: (t) => <Chip tone="muted" className="font-mono tracking-wide">{t.paymentCode}</Chip> },
          { key: 'amount', title: 'Tổng', align: 'right', render: (t) => <span className="tabular-nums">{formatMoney(t.amount)}</span> },
          { key: 'paidAmount', title: 'Đã thu', align: 'right', render: (t) => <span className={`tabular-nums ${t.paidAmount ? 'text-leaf-dark' : 'text-ink-soft'}`}>{formatMoney(t.paidAmount)}</span> },
          { key: 'dueDate', title: 'Hạn', render: (t) => <span className="tabular-nums">{formatDate(t.dueDate)}</span> },
          { key: 'status', title: 'Trạng thái', card: 'chip', render: (t) => <StatusChip map={TUITION_STATUS} value={t.status} /> },
          {
            key: 'actions',
            title: '',
            align: 'right',
            actions: (t) => [
              { key: 'view', label: 'Chi tiết', icon: Eye, onClick: () => setDetail(t._id) },
              { key: 'edit', label: 'Sửa', icon: Pencil, onClick: () => setForm(t) },
              { key: 'del', label: 'Xoá', icon: Trash2, danger: true, disabled: t.paidAmount > 0, tooltip: t.paidAmount > 0 ? 'Đã có tiền vào, không xoá được' : undefined, onClick: () => setDel(t) },
            ],
          },
        ]}
      />

      <BulkModal key={bulk ? 'open' : 'closed'} open={bulk} onClose={() => setBulk(false)} classes={classes || []} schoolYear={schoolYear} onDone={reloadAll} />
      {form !== undefined && <TuitionFormModal key={form?._id || 'new'} open tuition={form} schoolYear={schoolYear} onClose={() => setForm(undefined)} onSaved={reloadAll} />}
      <TuitionDetailModal tuitionId={detail} onClose={() => setDetail(null)} />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        danger
        title="Xoá học phí"
        confirmLabel="Xoá học phí"
        message={del ? `Xoá học phí ${formatMonth(del.month)} của ${del.student?.fullName}? Chỉ xoá được khi chưa có giao dịch.` : ''}
        onConfirm={() => tuitionApi.remove(del._id).then(() => { toast.success('Đã xoá học phí'); reloadAll(); }).catch((e) => toast.error(errorMessage(e)))}
      />
    </>
  );
}
