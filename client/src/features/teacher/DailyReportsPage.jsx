import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { NotebookPen, Check, Pencil, Trash2, ImagePlus, X } from 'lucide-react';
import { dailyReportApi } from '../../api/dailyReport.api.js';
import { uploadApi } from '../../api/upload.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useMyClasses } from '../../hooks/useMyClasses.js';
import { toast } from '../../stores/toast.store.js';
import { Avatar, Button, Input, Textarea, Modal, Skeleton, EmptyState, Chip, ConfirmDialog, IconButton } from '../../components/ui/index.js';
import { ClassSelect } from '../../components/shared/ClassSelect.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { MEAL_LABEL, SLEEP_LABEL, MOOD_LABEL } from '../../utils/constants.js';
import { formatDateFull, toInputDate } from '../../utils/format.js';

const MEALS = [
  { key: 'breakfast', label: 'Sáng' },
  { key: 'lunch', label: 'Trưa' },
  { key: 'snack', label: 'Xế' },
];

// Nhóm chip chọn 1 giá trị
function ChipGroup({ label, options, value, onChange, allowClear = true }) {
  return (
    <div>
      {label && <p className="mb-1 text-xs font-medium text-ink-soft">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(options).map(([v, text]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(value === v && allowClear ? undefined : v)}
            aria-pressed={value === v}
            className={clsx('touch md:min-h-9 rounded-full border px-3 py-1 text-sm transition-colors', value === v ? 'border-leaf bg-leaf-soft font-medium text-leaf-dark' : 'border-line bg-surface text-ink hover:bg-paper')}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

const emptyForm = () => ({ meals: {}, sleep: {}, mood: undefined, toilet: '', activities: '', comment: '', photos: [] });
const toForm = (r) => (r ? { meals: r.meals || {}, sleep: r.sleep || {}, mood: r.mood, toilet: r.toilet ?? '', activities: (r.activities || []).join(', '), comment: r.comment || '', photos: r.photos || [] } : emptyForm());
// Chỉ gửi trường có giá trị
function toPayload(f) {
  const p = {};
  const meals = Object.fromEntries(Object.entries(f.meals).filter(([, v]) => v));
  if (Object.keys(meals).length) p.meals = meals;
  const sleep = {};
  if (f.sleep.quality) sleep.quality = f.sleep.quality;
  if (f.sleep.duration !== '' && f.sleep.duration != null) sleep.duration = Number(f.sleep.duration);
  if (Object.keys(sleep).length) p.sleep = sleep;
  if (f.mood) p.mood = f.mood;
  if (f.toilet !== '' && f.toilet != null) p.toilet = Number(f.toilet);
  const acts = String(f.activities || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (acts.length) p.activities = acts;
  if (f.comment?.trim()) p.comment = f.comment.trim();
  if (f.photos?.length) p.photos = f.photos;
  return p;
}

/* ---------- Form nội dung nhận xét (dùng cho cả lớp & từng bé) ---------- */
function ReportFields({ form, setForm, withPhotos = false }) {
  const [uploading, setUploading] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const upload = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const res = await uploadApi.images([...files].slice(0, 10 - (form.photos?.length || 0)));
      set({ photos: [...(form.photos || []), ...res.map((r) => r.url)] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {MEALS.map((m) => <ChipGroup key={m.key} label={`Bữa ${m.label.toLowerCase()}`} options={MEAL_LABEL} value={form.meals[m.key]} onChange={(v) => set({ meals: { ...form.meals, [m.key]: v } })} />)}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <ChipGroup label="Giấc ngủ trưa" options={SLEEP_LABEL} value={form.sleep.quality} onChange={(v) => set({ sleep: { ...form.sleep, quality: v } })} />
        <Input label="Ngủ (phút)" type="number" inputMode="numeric" min={0} max={600} step={15} value={form.sleep.duration ?? ''} onChange={(e) => set({ sleep: { ...form.sleep, duration: e.target.value } })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <ChipGroup label="Tâm trạng" options={MOOD_LABEL} value={form.mood} onChange={(v) => set({ mood: v })} />
        <Input label="Đi vệ sinh (lần)" type="number" inputMode="numeric" min={0} max={20} value={form.toilet} onChange={(e) => set({ toilet: e.target.value })} />
      </div>
      <Input label="Hoạt động" placeholder="Cách nhau bằng dấu phẩy, vd: Vẽ tranh, Hát múa" value={form.activities} onChange={(e) => set({ activities: e.target.value })} />
      <Textarea label="Lời nhắn của cô" rows={3} placeholder="vd: Hôm nay bé rất ngoan, ăn hết suất và tự xúc cơm." value={form.comment} onChange={(e) => set({ comment: e.target.value })} />
      {withPhotos && (
        <div>
          <p className="mb-1 text-sm font-medium">Ảnh kèm (tối đa 10)</p>
          <div className="flex flex-wrap gap-2">
            {(form.photos || []).map((u) => (
              <span key={u} className="relative">
                <img src={u} alt="" className="h-16 w-16 rounded-photo object-cover" />
                <button type="button" onClick={() => set({ photos: form.photos.filter((x) => x !== u) })} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white" aria-label="Bỏ ảnh"><X size={12} /></button>
              </span>
            ))}
            {(form.photos?.length || 0) < 10 && (
              <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-photo border border-dashed border-line text-ink-soft hover:bg-paper">
                <ImagePlus size={20} aria-hidden />
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload(e.target.files)} disabled={uploading} />
              </label>
            )}
          </div>
          {uploading && <p className="mt-1 text-xs text-ink-soft">Đang tải ảnh…</p>}
        </div>
      )}
    </div>
  );
}

/* ---------- Trang ---------- */
export default function DailyReportsPage() {
  const { classes, loading: lc, selectedId, select } = useMyClasses();
  const [date, setDate] = useState(toInputDate(new Date()));
  const { data, loading, error, reload } = useFetch(() => dailyReportApi.list({ class: selectedId, date }), [selectedId, date], { enabled: !!selectedId && !!date });
  const [bulkForm, setBulkForm] = useState(emptyForm());
  const [picked, setPicked] = useState(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [edit, setEdit] = useState(null); // { student, report }
  const [del, setDel] = useState(null);

  useEffect(() => {
    if (data) setPicked(new Set(data.items.filter((it) => !it.report).map((it) => it.student._id))); // mặc định chọn bé chưa có nhận xét
  }, [data]);

  const items = data?.items || [];
  const done = items.filter((it) => it.report).length;
  const togglePick = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const applyBulk = async () => {
    const payload = toPayload(bulkForm);
    if (!Object.keys(payload).length) return toast.warning('Chọn ít nhất 1 nội dung để áp dụng');
    if (!picked.size) return toast.warning('Chọn ít nhất 1 bé');
    setBulkSaving(true);
    try {
      const r = await dailyReportApi.bulk({ class: selectedId, date, students: [...picked], ...payload });
      toast.success(`Đã áp dụng cho ${r.total} bé (${r.created} mới, ${r.updated} cập nhật)`);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBulkSaving(false);
    }
  };

  if (!lc && !classes.length) return <EmptyState icon={NotebookPen} title="Bạn chưa được phân công lớp" />;

  return (
    <>
      <PageHeader
        description={`${formatDateFull(date)} · Đã viết ${done}/${items.length} bé`}
        actions={
          <>
            <ClassSelect classes={classes} value={selectedId} onChange={select} />
            <Input type="date" value={date} max={toInputDate(new Date())} onChange={(e) => setDate(e.target.value)} aria-label="Ngày" className="w-40" />
          </>
        }
      />
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      <section className="card mb-4 p-4">
        <h2 className="text-base">Áp dụng nhanh cho cả lớp</h2>
        <p className="mt-0.5 text-sm text-ink-soft">Chọn nội dung chung rồi áp dụng cho các bé đã tick, sau đó sửa riêng từng bé.</p>
        <div className="mt-3"><ReportFields form={bulkForm} setForm={setBulkForm} /></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p className="text-sm text-ink-soft">Đã chọn <strong>{picked.size}</strong>/{items.length} bé ·{' '}
            <button type="button" className="text-sky hover:underline" onClick={() => setPicked(new Set(items.map((i) => i.student._id)))}>Chọn tất cả</button> ·{' '}
            <button type="button" className="text-sky hover:underline" onClick={() => setPicked(new Set())}>Bỏ chọn</button>
          </p>
          <Button icon={Check} onClick={applyBulk} loading={bulkSaving} disabled={!items.length}>Áp dụng cho {picked.size} bé</Button>
        </div>
      </section>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-card" />)}</div>
      ) : !items.length ? (
        <EmptyState icon={NotebookPen} title="Lớp chưa có học sinh" />
      ) : (
        <ul className="card divide-y divide-line">
          {items.map(({ student: s, report: r }) => (
            <li key={s._id} className="flex items-center gap-3 p-3">
              <input type="checkbox" className="h-5 w-5 shrink-0 rounded border-line accent-leaf" checked={picked.has(s._id)} onChange={() => togglePick(s._id)} aria-label={`Chọn ${s.fullName}`} />
              <Avatar name={s.fullName} src={s.avatar} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.fullName}</p>
                {r ? (
                  <p className="truncate text-xs text-ink-soft">
                    {[r.meals?.lunch && `Trưa: ${MEAL_LABEL[r.meals.lunch]}`, r.sleep?.quality && SLEEP_LABEL[r.sleep.quality], r.mood && MOOD_LABEL[r.mood], r.comment].filter(Boolean).join(' · ') || 'Đã có nhận xét'}
                  </p>
                ) : (
                  <p className="text-xs text-ink-soft">Chưa có nhận xét</p>
                )}
              </div>
              {r ? <Chip tone="leaf" icon={Check}>Đã viết</Chip> : <Chip tone="muted">Chưa</Chip>}
              <IconButton label={r ? 'Sửa nhận xét' : 'Viết nhận xét'} icon={r ? Pencil : NotebookPen} size="sm" onClick={() => setEdit({ student: s, report: r })} />
              {r && <IconButton label="Xoá nhận xét" icon={Trash2} danger size="sm" onClick={() => setDel({ student: s, report: r })} />}
            </li>
          ))}
        </ul>
      )}

      {edit && <EditModal key={edit.student._id} item={edit} date={date} onClose={() => setEdit(null)} onSaved={reload} />}
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        danger
        title="Xoá nhận xét"
        confirmLabel="Xoá"
        message={del ? `Xoá nhận xét ngày này của ${del.student.fullName}? Phụ huynh sẽ không còn thấy.` : ''}
        onConfirm={() => dailyReportApi.remove(del.report._id).then(() => { toast.success('Đã xoá nhận xét'); reload(); }).catch((e) => toast.error(errorMessage(e)))}
      />
    </>
  );
}

function EditModal({ item, date, onClose, onSaved }) {
  const [form, setForm] = useState(toForm(item.report));
  const [loading, setLoading] = useState(false);
  const save = async () => {
    const payload = toPayload(form);
    setLoading(true);
    try {
      if (item.report) await dailyReportApi.update(item.report._id, payload);
      else await dailyReportApi.create({ student: item.student._id, date, ...payload });
      toast.success(`Đã lưu nhận xét cho ${item.student.fullName}`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal open onClose={onClose} size="lg" title={`Nhận xét · ${item.student.fullName}`} description={formatDateFull(date)} footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save} loading={loading}>Lưu nhận xét</Button></>}>
      <ReportFields form={form} setForm={setForm} withPhotos />
    </Modal>
  );
}
