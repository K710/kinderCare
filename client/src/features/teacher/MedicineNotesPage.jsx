import { useState } from 'react';
import { Pill, Check, CheckCheck, Phone, TriangleAlert, Clock } from 'lucide-react';
import { medicineNoteApi } from '../../api/medicineNote.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useMyClasses } from '../../hooks/useMyClasses.js';
import { usePagination } from '../../hooks/usePagination.js';
import { toast } from '../../stores/toast.store.js';
import { Button, Textarea, Modal, StatusChip, ConfirmDialog, Tabs, Avatar, EmptyState, Skeleton, Pagination, Chip } from '../../components/ui/index.js';
import { ClassSelect } from '../../components/shared/ClassSelect.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { MEDICINE_STATUS } from '../../utils/constants.js';
import { formatDate, formatDateTime, toInputDate } from '../../utils/format.js';
import dayjs from '../../utils/dayjs.js';

const TABS = [{ value: 'today', label: 'Hôm nay' }, { value: 'pending', label: 'Chờ xác nhận' }, { value: 'confirmed', label: 'Đang cho uống' }, { value: 'done', label: 'Hoàn tất' }, { value: '', label: 'Tất cả' }];

// Thẻ dặn thuốc (dùng chung GV / PH)
export function MedicineCard({ note: m, actions, children }) {
  const range = dayjs(m.fromDate).isSame(m.toDate, 'day') ? formatDate(m.fromDate) : `${dayjs(m.fromDate).format('DD/MM')} – ${formatDate(m.toDate)}`;
  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar name={m.student?.fullName} src={m.student?.avatar} />
          <div>
            <p className="font-medium">{m.student?.fullName} <span className="text-xs text-ink-soft">· {m.class?.name}</span></p>
            <p className="text-xs text-ink-soft tabular-nums"><Clock size={12} className="mr-0.5 inline" aria-hidden /> {range}</p>
          </div>
        </div>
        <StatusChip map={MEDICINE_STATUS} value={m.status} />
      </div>
      {m.student?.allergies?.length > 0 && <p className="mt-2 flex items-center gap-1 text-xs text-[#B5412F]"><TriangleAlert size={14} aria-hidden /> Dị ứng: {m.student.allergies.join(', ')}</p>}
      <ul className="mt-3 divide-y divide-line rounded-card border border-line text-sm">
        {m.medicines.map((x, i) => (
          <li key={i} className="px-3 py-2"><span className="font-medium">{x.name}</span> · {x.dosage} · {x.time}{x.note && <span className="block text-xs text-ink-soft">{x.note}</span>}</li>
        ))}
      </ul>
      {m.logs?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-ink-soft">Đã cho uống ({m.logs.length} lần)</p>
          <ul className="mt-1 space-y-0.5 text-xs text-ink-soft">
            {m.logs.map((l, i) => <li key={i} className="tabular-nums"><Check size={12} className="mr-1 inline text-leaf" aria-hidden />{formatDateTime(l.givenAt)}{l.givenBy?.fullName ? ` · ${l.givenBy.fullName}` : ''}{l.note ? ` · ${l.note}` : ''}</li>)}
          </ul>
        </div>
      )}
      {children}
      {(m.parent || actions) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          {m.parent ? <span className="text-sm text-ink-soft">PH: {m.parent.fullName}{m.parent.phone && <a href={`tel:${m.parent.phone}`} className="ml-1 inline-flex items-center gap-0.5 text-sky tabular-nums"><Phone size={12} aria-hidden />{m.parent.phone}</a>}</span> : <span />}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
    </li>
  );
}

function LogModal({ note, onClose, onDone }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try {
      await medicineNoteApi.addLog(note._id, { note: text.trim() || undefined });
      toast.success(`Đã ghi nhận cho ${note.student?.fullName} uống thuốc`);
      onDone();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal open onClose={onClose} size="sm" title="Ghi nhận đã cho uống" description={`${note.student?.fullName} · ${formatDateTime(new Date())}`} footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button icon={Check} onClick={submit} loading={loading}>Đã cho uống</Button></>}>
      <Textarea label="Ghi chú" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="vd: Uống sau ăn trưa, bé hợp tác tốt" />
      <p className="mt-2 text-xs text-ink-soft">Phụ huynh sẽ nhận thông báo ngay.</p>
    </Modal>
  );
}

export default function MedicineNotesPage() {
  const { classes, loading: lc, selectedId, select } = useMyClasses();
  const [tab, setTab] = useState('today');
  const { page, setPage, params } = usePagination({}, 10);
  const query = tab === 'today' ? { date: toInputDate(new Date()) } : tab ? { status: tab } : {};
  const { data, loading, error, reload } = useFetch(() => medicineNoteApi.list({ ...params, ...query, class: selectedId }), [selectedId, params.page, tab], { enabled: !!selectedId });
  const [log, setLog] = useState(null);
  const [done, setDone] = useState(null);
  const run = (fn, ok) => fn().then(() => { toast.success(ok); reload(); }).catch((e) => toast.error(errorMessage(e)));

  if (!lc && !classes.length) return <EmptyState icon={Pill} title="Bạn chưa được phân công lớp" />;

  return (
    <>
      <PageHeader description="Xác nhận đã nhận thuốc từ ba mẹ, ghi mỗi lần cho uống, hoàn tất khi hết đợt." actions={<ClassSelect classes={classes} value={selectedId} onChange={select} />} />
      <Tabs className="mb-4" items={TABS} value={tab} onChange={(v) => { setTab(v); setPage(1); }} />
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />
      {loading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-card" />)}</div>
      ) : !data?.data?.length ? (
        <EmptyState icon={Pill} title={tab === 'today' ? 'Hôm nay không có dặn thuốc' : 'Không có dặn thuốc nào'} description="Ba mẹ gửi dặn thuốc từ ứng dụng, cô sẽ thấy ở đây." />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {data.data.map((m) => (
            <MedicineCard
              key={m._id}
              note={m}
              actions={
                <>
                  {m.status === 'pending' && <Button size="sm" icon={Check} onClick={() => run(() => medicineNoteApi.confirm(m._id), 'Đã xác nhận nhận thuốc')}>Đã nhận thuốc</Button>}
                  {m.status === 'confirmed' && <Button size="sm" icon={Pill} onClick={() => setLog(m)}>Đã cho uống</Button>}
                  {m.status === 'confirmed' && <Button size="sm" variant="secondary" icon={CheckCheck} onClick={() => setDone(m)}>Hoàn tất</Button>}
                  {m.status === 'cancelled' && <Chip tone="muted">Ba mẹ đã huỷ</Chip>}
                </>
              }
            />
          ))}
        </ul>
      )}
      {data?.pagination?.totalPages > 1 && <div className="mt-4 flex justify-end"><Pagination {...data.pagination} page={page} onChange={setPage} /></div>}
      {log && <LogModal note={log} onClose={() => setLog(null)} onDone={reload} />}
      <ConfirmDialog open={!!done} onClose={() => setDone(null)} title="Hoàn tất dặn thuốc" confirmLabel="Hoàn tất" message={done ? `Đánh dấu đợt thuốc của ${done.student?.fullName} đã xong (${done.logs?.length || 0} lần cho uống)?` : ''} onConfirm={() => run(() => medicineNoteApi.done(done._id), 'Đã hoàn tất dặn thuốc')} />
    </>
  );
}
