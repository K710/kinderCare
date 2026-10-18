import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Baby, Utensils, Moon, Smile } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch.js';
import { useSelectedChild } from '../../hooks/useSelectedChild.js';
import { attendanceApi } from '../../api/attendance.api.js';
import { dailyReportApi } from '../../api/dailyReport.api.js';
import { Chip, Skeleton, EmptyState, IconButton, StatusChip } from '../../components/ui/index.js';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { ATTENDANCE_STATUS, MEAL_LABEL, SLEEP_LABEL, MOOD_LABEL } from '../../utils/constants.js';
import { formatDateFull } from '../../utils/format.js';
import dayjs from '../../utils/dayjs.js';

const DOT = { present: 'bg-leaf', late: 'bg-sky', excused: 'bg-sun', absent: 'bg-peach' };

// Lịch tháng: điểm danh từng ngày + nhận xét của ngày được chọn
export default function CalendarPage() {
  const { child, childId } = useSelectedChild();
  const [sp] = useSearchParams();
  const initial = /^\d{4}-\d{2}-\d{2}$/.test(sp.get('day') || '') ? sp.get('day') : dayjs().format('YYYY-MM-DD');
  const [month, setMonth] = useState(initial.slice(0, 7));
  const [day, setDay] = useState(initial);
  const m = dayjs(`${month}-01`);
  const from = m.startOf('month').format('YYYY-MM-DD');
  const to = m.endOf('month').format('YYYY-MM-DD');

  const { data: att, loading, error, reload } = useFetch(() => attendanceApi.student(childId, { month }), [childId, month], { enabled: !!childId });
  const { data: reports } = useFetch(() => dailyReportApi.student(childId, { from, to }), [childId, month], { enabled: !!childId });

  if (!child) return <EmptyState icon={Baby} title="Chưa có thông tin bé" />;

  const byDay = new Map((att?.items || []).map((a) => [dayjs(a.date).format('YYYY-MM-DD'), a]));
  const repByDay = new Map((reports || []).map((r) => [dayjs(r.date).format('YYYY-MM-DD'), r]));
  const first = m.startOf('month');
  const offset = (first.isoWeekday() + 6) % 7; // Thứ 2 = cột đầu
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= m.daysInMonth(); d++) cells.push(first.date(d));
  const today = dayjs().format('YYYY-MM-DD');
  const sel = byDay.get(day);
  const rep = repByDay.get(day);

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onRetry={reload} />
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <IconButton label="Tháng trước" icon={ChevronLeft} onClick={() => setMonth(m.subtract(1, 'month').format('YYYY-MM'))} />
          <h2 className="text-base">Tháng {m.format('M/YYYY')}</h2>
          <IconButton label="Tháng sau" icon={ChevronRight} disabled={m.isSame(dayjs(), 'month')} onClick={() => setMonth(m.add(1, 'month').format('YYYY-MM'))} />
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-soft">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => <span key={d} className="py-1">{d}</span>)}
        </div>
        {loading ? (
          <Skeleton className="mt-1 h-56 w-full" />
        ) : (
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c) return <span key={`e${i}`} />;
              const key = c.format('YYYY-MM-DD');
              const a = byDay.get(key);
              const weekend = c.isoWeekday() > 5;
              const future = key > today;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDay(key)}
                  aria-label={`${c.format('DD/MM')}${a ? `, ${ATTENDANCE_STATUS[a.status].label}` : ''}`}
                  aria-pressed={day === key}
                  className={clsx(
                    'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-btn text-sm tabular-nums',
                    day === key ? 'bg-leaf-soft font-semibold text-leaf-dark ring-2 ring-leaf' : 'hover:bg-paper',
                    (weekend || future) && 'text-ink-soft/60',
                    key === today && 'font-bold',
                  )}
                >
                  {c.date()}
                  <span className={clsx('h-1.5 w-1.5 rounded-full', a ? DOT[a.status] : 'bg-transparent')} aria-hidden />
                </button>
              );
            })}
          </div>
        )}
        {att?.summary && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(ATTENDANCE_STATUS).filter(([k]) => k !== 'unmarked').map(([k, s]) => <Chip key={k} tone={s.tone}>{s.label}: {att.summary[k] ?? 0}</Chip>)}
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="text-base">{formatDateFull(day)}</h2>
        <div className="mt-2 flex items-center gap-2">
          {sel ? <StatusChip map={ATTENDANCE_STATUS} value={sel.status} /> : <Chip tone="muted">{dayjs(day).isoWeekday() > 5 ? 'Cuối tuần' : day > today ? 'Chưa đến' : 'Không có điểm danh'}</Chip>}
          {sel?.note && <span className="text-sm text-ink-soft">{sel.note}</span>}
        </div>
        {rep ? (
          <div className="mt-3 space-y-2 text-sm">
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              {rep.meals?.breakfast && <span><Utensils size={14} className="mr-1 inline" aria-hidden />Sáng: {MEAL_LABEL[rep.meals.breakfast]}</span>}
              {rep.meals?.lunch && <span><Utensils size={14} className="mr-1 inline" aria-hidden />Trưa: {MEAL_LABEL[rep.meals.lunch]}</span>}
              {rep.meals?.snack && <span><Utensils size={14} className="mr-1 inline" aria-hidden />Xế: {MEAL_LABEL[rep.meals.snack]}</span>}
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              {(rep.sleep?.quality || rep.sleep?.duration) && <span><Moon size={14} className="mr-1 inline" aria-hidden />Ngủ: {rep.sleep.duration ? `${rep.sleep.duration} phút` : ''} {rep.sleep.quality ? SLEEP_LABEL[rep.sleep.quality] : ''}</span>}
              {rep.mood && <span><Smile size={14} className="mr-1 inline" aria-hidden />{MOOD_LABEL[rep.mood]}</span>}
            </p>
            {rep.activities?.length > 0 && <p className="text-ink-soft">Hoạt động: {rep.activities.join(', ')}</p>}
            {rep.comment && <p className="whitespace-pre-line rounded-card bg-paper p-3">“{rep.comment}”</p>}
            {rep.photos?.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {rep.photos.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="h-20 w-20 shrink-0 rounded-photo object-cover" loading="lazy" /></a>)}
              </div>
            )}
            {rep.teacher && <p className="text-xs text-ink-soft">Cô {rep.teacher.fullName}</p>}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">Không có nhận xét ngày này.</p>
        )}
      </section>
    </div>
  );
}
