import { useEffect, useState } from 'react';
import { HeartPulse, Save, LineChart } from 'lucide-react';
import { classApi } from '../../api/class.api.js';
import { healthRecordApi } from '../../api/healthRecord.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useMyClasses } from '../../hooks/useMyClasses.js';
import { toast } from '../../stores/toast.store.js';
import { Avatar, Button, Input, Skeleton, EmptyState, IconButton, DatePicker } from '../../components/ui/index.js';
import { ClassSelect } from '../../components/shared/ClassSelect.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { formatDateFull, formatAge, toInputDate, formatNumber } from '../../utils/format.js';
import { StudentProfileModal } from './MyClassPage.jsx';

const bmi = (h, w) => (h && w ? +(w / (h / 100) ** 2).toFixed(1) : null);

// Đo chiều cao / cân nặng cả lớp một ngày; bé đã có bản ghi ngày đó sẽ được cập nhật
export default function HealthPage() {
  const { classes, loading: lc, selectedId, select } = useMyClasses();
  const [date, setDate] = useState(toInputDate(new Date()));
  const { data: students, loading, error, reload } = useFetch(() => classApi.students(selectedId), [selectedId], { enabled: !!selectedId });
  const [rows, setRows] = useState({});
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => setRows({}), [selectedId, date]);
  const set = (id, patch) => setRows((r) => ({ ...r, [id]: { ...(r[id] || {}), ...patch } }));
  const filled = (students || []).filter((s) => rows[s._id]?.height && rows[s._id]?.weight);

  const save = async () => {
    const records = [];
    for (const s of filled) {
      const h = Number(rows[s._id].height);
      const w = Number(rows[s._id].weight);
      if (h < 30 || h > 200) return toast.error(`${s.fullName}: chiều cao phải từ 30 đến 200 cm.`);
      if (w < 1 || w > 100) return toast.error(`${s.fullName}: cân nặng phải từ 1 đến 100 kg.`);
      records.push({ student: s._id, height: h, weight: w, note: rows[s._id].note?.trim() || undefined });
    }
    if (!records.length) return toast.warning('Nhập chiều cao và cân nặng cho ít nhất 1 bé');
    setSaving(true);
    try {
      const r = await healthRecordApi.bulk({ class: selectedId, measuredAt: date, records });
      toast.success(`Đã lưu ${r.total} lần đo (${r.created} mới, ${r.updated} cập nhật)`);
      setRows({});
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!lc && !classes.length) return <EmptyState icon={HeartPulse} title="Bạn chưa được phân công lớp" />;

  return (
    <div className="pb-24">
      <PageHeader
        description={`Ngày đo: ${formatDateFull(date)}. Bỏ trống bé không đo hôm nay.`}
        actions={<><ClassSelect classes={classes} value={selectedId} onChange={select} /><DatePicker value={date} max={toInputDate(new Date())} clearable={false} onChange={(v) => v && setDate(v)} aria-label="Ngày đo" className="w-44" /></>}
      />
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />
      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-card" />)}</div>
      ) : !students?.length ? (
        <EmptyState icon={HeartPulse} title="Lớp chưa có học sinh" />
      ) : (
        <ul className="card divide-y divide-line">
          <li className="hidden grid-cols-[1fr_110px_110px_70px_1fr_44px] gap-3 px-4 py-2 text-xs font-medium text-ink-soft md:grid"><span>Bé</span><span>Cao (cm)</span><span>Nặng (kg)</span><span>BMI</span><span>Ghi chú</span><span /></li>
          {students.map((s) => {
            const r = rows[s._id] || {};
            const b = bmi(Number(r.height), Number(r.weight));
            return (
              <li key={s._id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 p-3 md:grid-cols-[1fr_110px_110px_70px_1fr_44px] md:px-4">
                <div className="flex min-w-0 items-center gap-2"><Avatar name={s.fullName} src={s.avatar} size="sm" /><div className="min-w-0"><p className="truncate text-sm font-medium">{s.fullName}</p><p className="text-xs text-ink-soft">{formatAge(s.dateOfBirth)}</p></div></div>
                <IconButton label="Xem biểu đồ tăng trưởng" icon={LineChart} size="sm" onClick={() => setProfile(s._id)} className="md:order-last" />
                <Input type="number" inputMode="decimal" step="0.1" min={30} max={200} placeholder="cm" value={r.height || ''} onChange={(e) => set(s._id, { height: e.target.value })} aria-label={`Chiều cao ${s.fullName}`} />
                <Input type="number" inputMode="decimal" step="0.1" min={1} max={100} placeholder="kg" value={r.weight || ''} onChange={(e) => set(s._id, { weight: e.target.value })} aria-label={`Cân nặng ${s.fullName}`} />
                <span className="text-sm tabular-nums text-ink-soft">{b ? `BMI ${formatNumber(b)}` : ''}</span>
                <Input placeholder="Ghi chú" value={r.note || ''} onChange={(e) => set(s._id, { note: e.target.value })} aria-label={`Ghi chú ${s.fullName}`} className="col-span-2 md:col-span-1" />
              </li>
            );
          })}
        </ul>
      )}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:left-16 lg:left-60">
        <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 py-3 md:px-6">
          <p className="text-sm">Đã nhập <strong className="font-display text-lg tabular-nums">{filled.length}/{students?.length || 0}</strong> bé</p>
          <Button icon={Save} onClick={save} loading={saving} disabled={!filled.length}>Lưu lần đo</Button>
        </div>
      </div>
      <StudentProfileModal studentId={profile} onClose={() => setProfile(null)} />
    </div>
  );
}
