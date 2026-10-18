import { useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import clsx from 'clsx';
import { Check, Clock, FileCheck, UserX, CircleDashed, Save, MoreHorizontal } from 'lucide-react';
import { attendanceApi } from '../../api/attendance.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useMyClasses } from '../../hooks/useMyClasses.js';
import { toast } from '../../stores/toast.store.js';
import { Avatar, Button, Input, Textarea, Modal, Skeleton, EmptyState, Chip, DatePicker, ConfirmDialog } from '../../components/ui/index.js';
import { ClassSelect } from '../../components/shared/ClassSelect.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { ATTENDANCE_STATUS } from '../../utils/constants.js';
import { formatDateFull, toInputDate } from '../../utils/format.js';

// Kiểu thẻ theo trạng thái (DESIGN: có mặt leaf, đi muộn sky, có phép sun, không phép peach)
const STYLE = {
  present: { icon: Check, card: 'border-leaf bg-leaf-soft/60', badge: 'bg-leaf text-white' },
  late: { icon: Clock, card: 'border-sky bg-sky-soft/60', badge: 'bg-sky text-white' },
  excused: { icon: FileCheck, card: 'border-sun bg-sun-soft/70', badge: 'bg-sun text-ink' },
  absent: { icon: UserX, card: 'border-peach bg-peach-soft/70', badge: 'bg-peach text-white' },
  unmarked: { icon: CircleDashed, card: 'border-line bg-surface', badge: 'bg-paper text-ink-soft' },
};
const ORDER = ['present', 'late', 'excused', 'absent'];

/* ---------- Thẻ học sinh: chạm = có mặt / bỏ, giữ 450ms hoặc nút ⋯ = chọn trạng thái ---------- */
function StudentCard({ item, onTap, onMenu }) {
  const status = item.status || 'unmarked';
  const S = STYLE[status];
  const timer = useRef(null);
  const longPressed = useRef(false);

  const start = () => {
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      onMenu();
    }, 450);
  };
  const cancel = () => clearTimeout(timer.current);
  const click = () => {
    if (longPressed.current) return; // đã mở menu bằng giữ
    onTap();
  };

  return (
    <div className={clsx('relative rounded-card border-2 transition-colors select-none', S.card)}>
      <button
        type="button"
        onClick={click}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => { e.preventDefault(); onMenu(); }}
        className="flex w-full flex-col items-center gap-2 p-3 pt-4 text-center"
        aria-label={`${item.student.fullName}: ${ATTENDANCE_STATUS[status].label}. Chạm để đánh dấu có mặt, giữ để chọn trạng thái khác`}
      >
        <Avatar name={item.student.fullName} src={item.student.avatar} size="lg" />
        <span className="w-full truncate text-sm font-medium">{item.student.nickname || item.student.fullName}</span>
        <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', S.badge)}>
          <S.icon size={12} strokeWidth={2} aria-hidden /> {ATTENDANCE_STATUS[status].label}
        </span>
      </button>
      <button type="button" onClick={onMenu} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-btn text-ink-soft hover:bg-surface/80" aria-label={`Chọn trạng thái cho ${item.student.fullName}`}>
        <MoreHorizontal size={18} aria-hidden />
      </button>
      {item.note && <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-sun" title={item.note} aria-hidden />}
    </div>
  );
}

/* ---------- Chọn trạng thái + ghi chú ---------- */
function StatusSheet({ item, onClose, onPick }) {
  const [note, setNote] = useState(item?.note || '');
  if (!item) return null;
  return (
    <Modal open onClose={onClose} size="sm" title={item.student.fullName} description="Chọn trạng thái điểm danh">
      <div className="grid grid-cols-2 gap-2">
        {ORDER.map((st) => {
          const S = STYLE[st];
          return (
            <button key={st} type="button" onClick={() => onPick(st, note)} className={clsx('touch flex items-center gap-2 rounded-card border-2 px-3 py-3 text-sm font-medium', S.card, item.status === st && 'ring-2 ring-sky')}>
              <S.icon size={18} strokeWidth={1.75} aria-hidden /> {ATTENDANCE_STATUS[st].label}
            </button>
          );
        })}
      </div>
      <Textarea className="mt-3" label="Ghi chú" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="vd: Mẹ báo ốm, đi muộn 15 phút…" />
      <div className="mt-3 flex justify-between">
        <Button variant="ghost" onClick={() => onPick(null, '')}>Bỏ điểm danh</Button>
        <Button variant="secondary" onClick={() => onPick(item.status, note)}>Lưu ghi chú</Button>
      </div>
    </Modal>
  );
}

/* ---------- Trang điểm danh ---------- */
export default function AttendancePage() {
  const { classes, loading: lc, selected, selectedId, select } = useMyClasses();
  const [date, setDate] = useState(toInputDate(new Date()));
  const { data, loading, error, reload } = useFetch(() => attendanceApi.list({ class: selectedId, date }), [selectedId, date], { enabled: !!selectedId && !!date });
  const [items, setItems] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState(null);

  // Đồng bộ dữ liệu server → state cục bộ
  useEffect(() => {
    if (!data) return;
    setItems(data.items.map((it) => ({ student: it.student, status: it.attendance?.status || null, note: it.attendance?.note || '' })));
    setDirty(false);
  }, [data]);

  const setOne = (id, patch) => {
    setItems((arr) => arr.map((it) => (it.student._id === id ? { ...it, ...patch } : it)));
    setDirty(true);
  };
  const tap = (it) => setOne(it.student._id, { status: it.status === 'present' ? null : 'present' });
  const markAllPresent = () => {
    setItems((arr) => arr.map((it) => (it.status ? it : { ...it, status: 'present' })));
    setDirty(true);
  };

  // Rời trang khi chưa lưu: chặn điều hướng trong app + cảnh báo khi đóng tab
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  const marked = items.filter((it) => it.status).length;
  const counts = ORDER.reduce((acc, st) => ({ ...acc, [st]: items.filter((it) => it.status === st).length }), {});
  const isFuture = date > toInputDate(new Date());

  const save = async () => {
    const records = items.filter((it) => it.status).map((it) => ({ student: it.student._id, status: it.status, note: it.note || undefined }));
    if (!records.length) return toast.warning('Chưa đánh dấu bé nào');
    setSaving(true);
    try {
      await attendanceApi.bulk({ class: selectedId, date, records });
      toast.success(`Đã lưu điểm danh ${records.length}/${items.length} bé`);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!lc && !classes.length) return <EmptyState icon={UserX} title="Bạn chưa được phân công lớp" description="Liên hệ hiệu trưởng để được gán vào lớp phụ trách." />;

  return (
    <div className="pb-24">
      <PageHeader
        description={`${formatDateFull(date)}. Chạm 1 lần = có mặt, giữ hoặc bấm ⋯ để chọn đi muộn / vắng.`}
        actions={
          <>
            <ClassSelect classes={classes} value={selectedId} onChange={select} />
            <DatePicker value={date} max={toInputDate(new Date())} clearable={false} onChange={(v) => v && setDate(v)} aria-label="Ngày điểm danh" className="w-44" />
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ORDER.map((st) => <Chip key={st} tone={ATTENDANCE_STATUS[st].tone} icon={STYLE[st].icon}>{ATTENDANCE_STATUS[st].label}: {counts[st]}</Chip>)}
        <Chip tone="muted" icon={CircleDashed}>Chưa: {items.length - marked}</Chip>
        <Button size="sm" variant="secondary" icon={Check} onClick={markAllPresent} disabled={isFuture || !items.length} className="ml-auto">Tất cả có mặt</Button>
      </div>
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-card" />)}</div>
      ) : !items.length ? (
        <EmptyState icon={UserX} title="Lớp chưa có học sinh" description="Hiệu trưởng sẽ xếp bé vào lớp." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((it) => (
            <li key={it.student._id}>
              <StudentCard item={it} onTap={() => !isFuture && tap(it)} onMenu={() => !isFuture && setSheet(it)} />
            </li>
          ))}
        </ul>
      )}

      {/* Thanh dưới cố định: "Đã điểm danh 18/22 · Lưu điểm danh" */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:left-16 lg:left-60">
        <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 py-3 md:px-6">
          <p className="text-sm">
            Đã điểm danh <strong className="font-display text-lg tabular-nums">{marked}/{items.length}</strong>
            {dirty && <span className="ml-2 text-xs text-sun">● chưa lưu</span>}
          </p>
          <Button icon={Save} onClick={save} loading={saving} disabled={isFuture || !items.length}>Lưu điểm danh</Button>
        </div>
      </div>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        danger
        title="Rời trang điểm danh?"
        confirmLabel="Rời trang, bỏ thay đổi"
        message="Điểm danh hôm nay chưa được lưu. Rời trang sẽ mất các thay đổi vừa đánh dấu."
        onConfirm={() => blocker.proceed?.()}
      />
      {sheet && <StatusSheet item={items.find((x) => x.student._id === sheet.student._id)} onClose={() => setSheet(null)} onPick={(st, note) => { setOne(sheet.student._id, { status: st, note }); setSheet(null); }} />}
    </div>
  );
}
