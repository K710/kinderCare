import { useState } from 'react';
import { Phone, TriangleAlert, HeartPulse } from 'lucide-react';
import { classApi } from '../../api/class.api.js';
import { studentApi } from '../../api/student.api.js';
import { healthRecordApi } from '../../api/healthRecord.api.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useMyClasses } from '../../hooks/useMyClasses.js';
import { Avatar, Chip, Modal, Button, Skeleton, EmptyState, Tabs } from '../../components/ui/index.js';
import { ClassSelect } from '../../components/shared/ClassSelect.jsx';
import { GrowthChart } from '../../components/shared/GrowthChart.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { GENDER_LABEL, AGE_GROUP_LABEL } from '../../utils/constants.js';
import { formatDate, formatAge } from '../../utils/format.js';

/* ---------- Hồ sơ bé (GV lớp thấy dị ứng / lưu ý sức khoẻ) ---------- */
export function StudentProfileModal({ studentId, onClose }) {
  const { data: s, loading } = useFetch(() => studentApi.get(studentId), [studentId], { enabled: !!studentId });
  const { data: health } = useFetch(() => healthRecordApi.student(studentId), [studentId], { enabled: !!studentId });
  const [metric, setMetric] = useState('weight');
  if (!studentId) return null;
  const last = health?.length ? health[health.length - 1] : null;
  return (
    <Modal open onClose={onClose} size="lg" title={s?.fullName || 'Hồ sơ bé'} description={s ? `${GENDER_LABEL[s.gender]} · ${formatAge(s.dateOfBirth)} · ${s.class?.name || 'Chưa xếp lớp'}` : ''} footer={<Button variant="secondary" onClick={onClose}>Đóng</Button>}>
      {loading || !s ? (
        <div className="space-y-2"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-24 w-full" /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar name={s.fullName} src={s.avatar} size="xl" />
            <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-ink-soft">Tên ở nhà</dt><dd>{s.nickname || '—'}</dd>
              <dt className="text-ink-soft">Ngày sinh</dt><dd className="tabular-nums">{formatDate(s.dateOfBirth)}</dd>
              <dt className="text-ink-soft">Nhập học</dt><dd className="tabular-nums">{s.enrollDate ? formatDate(s.enrollDate) : '—'}</dd>
              <dt className="text-ink-soft">Lần đo gần nhất</dt><dd className="tabular-nums">{last ? `${last.height} cm · ${last.weight} kg` : '—'}</dd>
            </dl>
          </div>

          {(s.allergies?.length > 0 || s.medicalNotes) && (
            <div className="rounded-card border border-peach bg-peach-soft p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-[#B5412F]"><TriangleAlert size={16} aria-hidden /> Lưu ý sức khoẻ</p>
              {s.allergies?.length > 0 && <p className="mt-1">Dị ứng: <strong>{s.allergies.join(', ')}</strong></p>}
              {s.medicalNotes && <p className="mt-1 whitespace-pre-line">{s.medicalNotes}</p>}
            </div>
          )}

          <div>
            <p className="mb-1 text-sm font-medium">Phụ huynh</p>
            <ul className="divide-y divide-line rounded-card border border-line text-sm">
              {(s.parents || []).map((p) => (
                <li key={p._id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="flex items-center gap-2"><Avatar name={p.fullName} src={p.avatar} role="parent" size="sm" />{p.fullName}</span>
                  {p.phone && <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 text-sky tabular-nums"><Phone size={14} aria-hidden />{p.phone}</a>}
                </li>
              ))}
              {s.emergencyContact?.name && (
                <li className="flex items-center justify-between gap-2 px-3 py-2 text-ink-soft">
                  <span>Khẩn cấp: {s.emergencyContact.name}{s.emergencyContact.relation ? ` (${s.emergencyContact.relation})` : ''}</span>
                  {s.emergencyContact.phone && <a href={`tel:${s.emergencyContact.phone}`} className="inline-flex items-center gap-1 text-sky tabular-nums"><Phone size={14} aria-hidden />{s.emergencyContact.phone}</a>}
                </li>
              )}
            </ul>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-medium"><HeartPulse size={16} aria-hidden /> Tăng trưởng</p>
              <Tabs items={[{ value: 'weight', label: 'Cân nặng' }, { value: 'height', label: 'Chiều cao' }]} value={metric} onChange={setMetric} className="border-0" />
            </div>
            {health?.length ? (
              <GrowthChart records={health} dateOfBirth={s.dateOfBirth} gender={s.gender} metric={metric} height={220} />
            ) : (
              <p className="text-sm text-ink-soft">Chưa có lần đo nào. Vào "Chiều cao, cân nặng" để ghi nhận.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Trang lớp của tôi ---------- */
export default function MyClassPage() {
  const { classes, loading: lc, selected, selectedId, select } = useMyClasses();
  const { data: students, loading, error, reload } = useFetch(() => classApi.students(selectedId), [selectedId], { enabled: !!selectedId });
  const [profile, setProfile] = useState(null);

  if (!lc && !classes.length) {
    return <EmptyState icon={TriangleAlert} title="Bạn chưa được phân công lớp" description="Liên hệ hiệu trưởng để được gán vào lớp phụ trách." />;
  }

  return (
    <>
      <PageHeader
        description={selected ? `${AGE_GROUP_LABEL[selected.ageGroup]}${selected.room ? ` · Phòng ${selected.room}` : ''} · ${students?.length ?? 0}/${selected.capacity} bé` : undefined}
        actions={<ClassSelect classes={classes} value={selectedId} onChange={select} />}
      />
      {selected?.teachers?.length > 0 && (
        <p className="mb-4 text-sm text-ink-soft">Giáo viên: {selected.teachers.map((t) => t.fullName).join(', ')}</p>
      )}
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-card" />)}
        </div>
      ) : !students?.length ? (
        <EmptyState icon={TriangleAlert} title="Lớp chưa có học sinh" description="Hiệu trưởng sẽ xếp bé vào lớp." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {students.map((s) => (
            <li key={s._id}>
              <button type="button" onClick={() => setProfile(s._id)} className="card flex w-full flex-col items-center gap-2 p-4 text-center transition-colors hover:bg-paper">
                <Avatar name={s.fullName} src={s.avatar} size="lg" />
                <span className="w-full truncate font-display text-base font-semibold">{s.nickname || s.fullName}</span>
                <span className="text-xs text-ink-soft">{s.nickname ? s.fullName : formatAge(s.dateOfBirth)}</span>
                {s.allergies?.length > 0 && <Chip tone="peach" icon={TriangleAlert}>Dị ứng</Chip>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <StudentProfileModal studentId={profile} onClose={() => setProfile(null)} />
    </>
  );
}
