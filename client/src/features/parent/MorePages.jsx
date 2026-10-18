import { useState } from 'react';
import { ChevronLeft, ChevronRight, Baby, Images, UtensilsCrossed, HeartPulse, FileText, Pill, Plus, Trash2, Pencil, X } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch.js';
import { useSelectedChild } from '../../hooks/useSelectedChild.js';
import { albumApi } from '../../api/album.api.js';
import { menuApi } from '../../api/menu.api.js';
import { healthRecordApi } from '../../api/healthRecord.api.js';
import { leaveRequestApi } from '../../api/leaveRequest.api.js';
import { medicineNoteApi } from '../../api/medicineNote.api.js';
import { errorMessage } from '../../api/axios.js';
import { toast } from '../../stores/toast.store.js';
import { Button, Input, Textarea, Modal, Skeleton, EmptyState, StatusChip, Tabs, ConfirmDialog, Pagination, IconButton, Chip, DatePicker } from '../../components/ui/index.js';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { FormError } from '../../components/shared/FormError.jsx';
import { GrowthChart, latestRecord } from '../../components/shared/GrowthChart.jsx';
import { AlbumGrid, AlbumViewModal } from '../teacher/AlbumsPage.jsx';
import { MedicineCard } from '../teacher/MedicineNotesPage.jsx';
import { leaveRange } from '../teacher/LeaveRequestsPage.jsx';
import { LEAVE_STATUS, DAY_LABEL, AGE_GROUP_LABEL } from '../../utils/constants.js';
import { formatDate, formatWeek, toInputDate, formatKg, formatCm, formatNumber } from '../../utils/format.js';
import dayjs from '../../utils/dayjs.js';

const NoChild = () => <EmptyState icon={Baby} title="Chưa có thông tin bé" />;

/* ====================== ALBUM ẢNH ====================== */
export function ParentAlbumsPage() {
  const { child } = useSelectedChild();
  const classId = child?.class?._id;
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(() => albumApi.list({ class: classId, page, limit: 12 }), [classId, page], { enabled: !!classId });
  const [open, setOpen] = useState(null);
  if (!child) return <NoChild />;
  if (!classId) return <EmptyState icon={Images} title="Bé chưa xếp lớp" description="Album ảnh hiện theo lớp của bé." />;
  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onRetry={reload} />
      <AlbumGrid albums={data?.data} loading={loading} onOpen={(a) => setOpen(a._id)} />
      {data?.pagination?.totalPages > 1 && <div className="flex justify-end"><Pagination {...data.pagination} page={page} onChange={setPage} /></div>}
      <AlbumViewModal albumId={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/* ====================== THỰC ĐƠN TUẦN ====================== */
export function ParentMenuPage() {
  const { child } = useSelectedChild();
  const ageGroup = child?.class?.ageGroup;
  const [weekOf, setWeekOf] = useState(dayjs().format('YYYY-MM-DD'));
  const { data, loading, error, reload } = useFetch(() => menuApi.current({ date: weekOf, ...(ageGroup ? { ageGroup } : {}) }), [weekOf, ageGroup], { enabled: !!child?.class });
  if (!child) return <NoChild />;
  if (!child.class) return <EmptyState icon={UtensilsCrossed} title="Bé chưa xếp lớp" description="Thực đơn hiện theo nhóm tuổi của lớp." />;
  const menu = data?.items?.[0]?.menu;
  const monday = dayjs(weekOf).startOf('isoWeek');
  const todayDow = dayjs().isoWeekday();
  const thisWeek = monday.isSame(dayjs().startOf('isoWeek'), 'day');
  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onRetry={reload} />
      <div className="card flex items-center justify-between p-3">
        <IconButton label="Tuần trước" icon={ChevronLeft} onClick={() => setWeekOf(monday.subtract(1, 'week').format('YYYY-MM-DD'))} />
        <div className="text-center"><p className="font-medium">{formatWeek(monday)}</p><p className="text-xs text-ink-soft">{AGE_GROUP_LABEL[ageGroup]}{thisWeek ? ' · Tuần này' : ''}</p></div>
        <IconButton label="Tuần sau" icon={ChevronRight} onClick={() => setWeekOf(monday.add(1, 'week').format('YYYY-MM-DD'))} />
      </div>
      {loading ? (
        <Skeleton className="h-64 rounded-card" />
      ) : !menu ? (
        <EmptyState icon={UtensilsCrossed} title="Chưa có thực đơn tuần này" description="Nhà trường sẽ công bố sau khi duyệt." />
      ) : (
        <ul className="space-y-2">
          {[1, 2, 3, 4, 5].map((d) => {
            const day = menu.days?.find((x) => x.dayOfWeek === d);
            const isToday = thisWeek && d === todayDow;
            return (
              <li key={d} className={`card p-4 ${isToday ? 'border-leaf' : ''}`}>
                <div className="flex items-center justify-between"><p className="font-display text-base font-semibold">{DAY_LABEL[d]}</p><span className="text-xs text-ink-soft tabular-nums">{monday.add(d - 1, 'day').format('DD/MM')}{isToday && <Chip tone="leaf" className="ml-2">Hôm nay</Chip>}</span></div>
                {day ? (
                  <dl className="mt-2 grid grid-cols-[56px_1fr] gap-y-1 text-sm">
                    <dt className="text-ink-soft">Sáng</dt><dd>{day.breakfast?.join(', ') || '—'}</dd>
                    <dt className="text-ink-soft">Trưa</dt><dd>{day.lunch?.join(', ') || '—'}</dd>
                    <dt className="text-ink-soft">Xế</dt><dd>{day.snack?.join(', ') || '—'}</dd>
                    {day.note && <><dt className="text-ink-soft">Ghi chú</dt><dd className="text-ink-soft">{day.note}</dd></>}
                  </dl>
                ) : <p className="mt-1 text-sm text-ink-soft">Chưa có món.</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ====================== TĂNG TRƯỞNG ====================== */
export function ParentGrowthPage() {
  const { child, childId } = useSelectedChild();
  const { data, loading, error, reload } = useFetch(() => healthRecordApi.student(childId), [childId], { enabled: !!childId });
  const [metric, setMetric] = useState('weight');
  if (!child) return <NoChild />;
  const last = latestRecord(data || []); // cùng lần đo với nhận định dưới biểu đồ
  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onRetry={reload} />
      {last && (
        <div className="grid grid-cols-2 gap-2">
          {[['Cân nặng', formatKg(last.weight)], ['Chiều cao', formatCm(last.height)]].map(([l, v]) => (
            <div key={l} className="card p-3 text-center"><p className="text-xs text-ink-soft">{l}</p><p className="font-display text-xl font-bold tabular-nums">{v}</p><p className="text-[11px] text-ink-soft">Đo ngày {formatDate(last.measuredAt)}</p></div>
          ))}
        </div>
      )}
      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-base">Biểu đồ tăng trưởng</h2><Tabs items={[{ value: 'weight', label: 'Cân nặng' }, { value: 'height', label: 'Chiều cao' }]} value={metric} onChange={setMetric} className="border-0" /></div>
        {loading ? <Skeleton className="h-60" /> : data?.length ? <GrowthChart records={data} dateOfBirth={child.dateOfBirth} gender={child.gender} metric={metric} audience="parent" /> : <p className="py-6 text-center text-sm text-ink-soft">Cô chưa đo lần nào. Dữ liệu sẽ hiện khi lớp cân đo định kỳ.</p>}
      </section>
      {data?.length > 0 && (
        <section className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-xs text-ink-soft"><tr><th className="px-3 py-2">Ngày đo</th><th className="px-3 py-2 text-right">Cao (cm)</th><th className="px-3 py-2 text-right">Nặng (kg)</th></tr></thead>
            <tbody className="divide-y divide-line">{[...data].reverse().map((r) => <tr key={r._id}><td className="px-3 py-2 tabular-nums">{formatDate(r.measuredAt)}{r.note && <span className="block text-xs text-ink-soft">{r.note}</span>}</td><td className="px-3 py-2 text-right tabular-nums">{formatNumber(r.height)}</td><td className="px-3 py-2 text-right tabular-nums">{formatNumber(r.weight)}</td></tr>)}</tbody>
          </table>
        </section>
      )}
    </div>
  );
}

/* ====================== ĐƠN XIN NGHỈ ====================== */
function LeaveFormModal({ child, leave, onClose, onSaved }) {
  const [fromDate, setFromDate] = useState(leave ? toInputDate(leave.fromDate) : toInputDate(dayjs().add(1, 'day')));
  const [toDate, setToDate] = useState(leave ? toInputDate(leave.toDate) : toInputDate(dayjs().add(1, 'day')));
  const [reason, setReason] = useState(leave?.reason || '');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setErr('');
    if (!fromDate || !toDate) return setErr('Chọn ngày nghỉ.');
    if (toDate < fromDate) return setErr('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
    if (reason.trim().length < 3) return setErr('Nhập lý do, tối thiểu 3 ký tự.');
    setLoading(true);
    try {
      if (leave) await leaveRequestApi.update(leave._id, { fromDate, toDate, reason: reason.trim() });
      else await leaveRequestApi.create({ student: child._id, fromDate, toDate, reason: reason.trim() });
      toast.success(leave ? 'Đã sửa đơn xin nghỉ' : 'Đã gửi đơn xin nghỉ');
      onSaved();
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal open onClose={onClose} size="sm" title={leave ? 'Sửa đơn xin nghỉ' : 'Xin nghỉ cho bé'} description={`${child.fullName} · ${child.class?.name || ''}`} footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button onClick={submit} loading={loading}>{leave ? 'Lưu đơn' : 'Gửi đơn nghỉ'}</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <DatePicker label="Từ ngày" value={fromDate} clearable={false} onChange={(v) => { if (!v) return; setFromDate(v); if (toDate < v) setToDate(v); }} />
          <DatePicker label="Đến ngày" value={toDate} min={fromDate} clearable={false} onChange={(v) => v && setToDate(v)} />
        </div>
        <Textarea label="Lý do" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="vd: Bé bị sốt, gia đình cho nghỉ theo dõi" />
        <p className="text-xs text-ink-soft">Cô sẽ duyệt và ghi "Vắng có phép" cho các ngày này.</p>
        <FormError message={err} />
      </div>
    </Modal>
  );
}

export function ParentLeaveRequestsPage() {
  const { child, childId } = useSelectedChild();
  const { data, loading, error, reload } = useFetch(() => leaveRequestApi.my({ student: childId }), [childId], { enabled: !!childId });
  const [form, setForm] = useState(undefined);
  const [del, setDel] = useState(null);
  if (!child) return <NoChild />;
  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onRetry={reload} />
      <Button icon={Plus} className="w-full md:w-auto" onClick={() => setForm(null)} disabled={!child.class}>Xin nghỉ cho bé</Button>
      {loading ? <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-24 rounded-card" />)}</div> : !data?.length ? (
        <EmptyState icon={FileText} title="Chưa có đơn xin nghỉ" description="Khi bé cần nghỉ, gửi đơn để cô biết trước." />
      ) : (
        <ul className="space-y-2">
          {data.map((l) => (
            <li key={l._id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-medium tabular-nums">{leaveRange(l)}</p><p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{l.reason}</p></div>
                <StatusChip map={LEAVE_STATUS} value={l.status} />
              </div>
              {l.status !== 'pending' && l.reviewNote && <p className="mt-2 text-sm"><span className="text-ink-soft">Cô phản hồi:</span> {l.reviewNote}</p>}
              {l.status === 'pending' && (
                <div className="mt-3 flex justify-end gap-2">
                  <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setForm(l)}>Sửa</Button>
                  <Button size="sm" variant="ghost" icon={Trash2} className="text-berry" onClick={() => setDel(l)}>Huỷ đơn</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {form !== undefined && <LeaveFormModal key={form?._id || 'new'} child={child} leave={form} onClose={() => setForm(undefined)} onSaved={reload} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} danger title="Huỷ đơn xin nghỉ" confirmLabel="Huỷ đơn" message={del ? `Huỷ đơn nghỉ ${leaveRange(del)}?` : ''} onConfirm={() => leaveRequestApi.remove(del._id).then(() => { toast.success('Đã huỷ đơn'); reload(); }).catch((e) => toast.error(errorMessage(e)))} />
    </div>
  );
}

/* ====================== DẶN THUỐC ====================== */
const emptyMed = () => ({ name: '', dosage: '', time: '', note: '' });
function MedicineFormModal({ child, onClose, onSaved }) {
  const [meds, setMeds] = useState([emptyMed()]);
  const [fromDate, setFromDate] = useState(toInputDate(new Date()));
  const [toDate, setToDate] = useState(toInputDate(new Date()));
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (i, patch) => setMeds((m) => m.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const submit = async () => {
    setErr('');
    const clean = meds.map((m) => ({ name: m.name.trim(), dosage: m.dosage.trim(), time: m.time.trim(), note: m.note.trim() || undefined }));
    if (clean.some((m) => !m.name || !m.dosage || !m.time)) return setErr('Mỗi loại thuốc cần tên, liều lượng và thời điểm uống.');
    if (toDate < fromDate) return setErr('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
    setLoading(true);
    try {
      await medicineNoteApi.create({ student: child._id, medicines: clean, fromDate, toDate });
      toast.success('Đã gửi dặn thuốc cho cô');
      onSaved();
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Dặn thuốc cho bé" description={`${child.fullName}. Nhớ ghi tên bé lên túi thuốc và gửi cô vào buổi sáng.`} footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button onClick={submit} loading={loading}>Gửi dặn thuốc</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <DatePicker label="Từ ngày" value={fromDate} clearable={false} onChange={(v) => { if (!v) return; setFromDate(v); if (toDate < v) setToDate(v); }} />
          <DatePicker label="Đến ngày" value={toDate} min={fromDate} clearable={false} onChange={(v) => v && setToDate(v)} />
        </div>
        {meds.map((m, i) => (
          <fieldset key={i} className="relative rounded-card border border-line p-3">
            <legend className="px-1 text-xs font-medium text-ink-soft">Thuốc {i + 1}</legend>
            {meds.length > 1 && <button type="button" onClick={() => setMeds((a) => a.filter((_, idx) => idx !== i))} className="absolute right-2 top-2 text-ink-soft" aria-label="Bỏ thuốc này"><X size={16} /></button>}
            <div className="grid grid-cols-2 gap-2">
              <Input className="col-span-2" placeholder="Tên thuốc *" value={m.name} onChange={(e) => set(i, { name: e.target.value })} aria-label="Tên thuốc" />
              <Input placeholder="Liều lượng * (vd: 5ml)" value={m.dosage} onChange={(e) => set(i, { dosage: e.target.value })} aria-label="Liều lượng" />
              <Input placeholder="Khi nào * (vd: Sau ăn trưa)" value={m.time} onChange={(e) => set(i, { time: e.target.value })} aria-label="Thời điểm" />
              <Input className="col-span-2" placeholder="Ghi chú (không bắt buộc)" value={m.note} onChange={(e) => set(i, { note: e.target.value })} aria-label="Ghi chú" />
            </div>
          </fieldset>
        ))}
        {meds.length < 10 && <Button size="sm" variant="ghost" icon={Plus} onClick={() => setMeds((a) => [...a, emptyMed()])}>Thêm loại thuốc</Button>}
        <FormError message={err} />
      </div>
    </Modal>
  );
}

export function ParentMedicineNotesPage() {
  const { child, childId } = useSelectedChild();
  const { data, loading, error, reload } = useFetch(medicineNoteApi.my, [childId], { enabled: !!childId });
  const [creating, setCreating] = useState(false);
  const [cancel, setCancel] = useState(null);
  if (!child) return <NoChild />;
  const mine = (data || []).filter((m) => (m.student?._id || m.student) === childId);
  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onRetry={reload} />
      <Button icon={Plus} className="w-full md:w-auto" onClick={() => setCreating(true)} disabled={!child.class}>Dặn thuốc cho bé</Button>
      {loading ? <Skeleton className="h-40 rounded-card" /> : !mine.length ? (
        <EmptyState icon={Pill} title="Chưa có dặn thuốc" description="Khi bé cần uống thuốc ở lớp, gửi dặn thuốc để cô xác nhận và ghi lại từng lần cho uống." />
      ) : (
        <ul className="space-y-3">
          {mine.map((m) => (
            <MedicineCard key={m._id} note={{ ...m, parent: null }} actions={m.status === 'pending' ? <Button size="sm" variant="ghost" icon={Trash2} className="text-berry" onClick={() => setCancel(m)}>Huỷ dặn thuốc</Button> : null} />
          ))}
        </ul>
      )}
      {creating && <MedicineFormModal child={child} onClose={() => setCreating(false)} onSaved={reload} />}
      <ConfirmDialog open={!!cancel} onClose={() => setCancel(null)} danger title="Huỷ dặn thuốc" confirmLabel="Huỷ dặn thuốc" message="Cô sẽ không cho bé uống theo dặn này nữa." onConfirm={() => medicineNoteApi.cancel(cancel._id).then(() => { toast.success('Đã huỷ dặn thuốc'); reload(); }).catch((e) => toast.error(errorMessage(e)))} />
    </div>
  );
}
