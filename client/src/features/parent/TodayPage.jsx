import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, Utensils, Moon, Smile, Palette, Images, UtensilsCrossed, HeartPulse, FileText, Pill, Wallet, ChevronRight, Baby, CircleCheck } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch.js';
import { useSelectedChild } from '../../hooks/useSelectedChild.js';
import { dashboardApi } from '../../api/dashboard.api.js';
import { menuApi } from '../../api/menu.api.js';
import { dailyReportApi } from '../../api/dailyReport.api.js';
import { Timeline } from '../../components/ui/Timeline.jsx';
import { CalendarDays } from 'lucide-react';
import { Chip, Skeleton, EmptyState, StatusChip } from '../../components/ui/index.js';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PATHS } from '../../router/paths.js';
import { ATTENDANCE_STATUS, MEAL_LABEL, MOOD_LABEL, DAY_LABEL } from '../../utils/constants.js';
import { formatMoney, formatTime, formatSleep, childName, teacherShort } from '../../utils/format.js';
import dayjs from '../../utils/dayjs.js';

const mealText = (v) => (v ? MEAL_LABEL[v] : null);

// Trang chủ PH: dòng thời gian một ngày của bé + lời nhắn của cô + thực đơn hôm nay
export default function TodayPage() {
  const { child, childId } = useSelectedChild();
  const { data, loading, error, reload } = useFetch(dashboardApi.parent, []);
  const ageGroup = child?.class?.ageGroup;
  const { data: menuData } = useFetch(() => menuApi.current(ageGroup ? { ageGroup } : {}), [ageGroup], { enabled: !!child?.class });

  const me = data?.children?.find((c) => c._id === childId);
  const att = me?.attendanceToday;
  const rep = me?.reportToday;
  // Không có điểm danh lẫn nhận xét hôm nay → tìm ngày học gần nhất để dẫn sang Lịch
  const noData = !!data && !att && !rep;
  const { data: recent } = useFetch(() => dailyReportApi.student(childId, {}), [childId, noData], { enabled: !!childId && noData });
  const lastDay = recent?.find((r) => !dayjs(r.date).isSame(dayjs(), 'day'));

  // Đánh dấu PH đã xem nhận xét hôm nay
  useEffect(() => {
    if (rep && !rep.parentSeenAt) dailyReportApi.markSeen(rep._id).catch(() => {});
  }, [rep?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!child) return <EmptyState icon={Baby} title="Chưa có thông tin bé" description="Nhà trường chưa gắn bé vào tài khoản của bạn. Liên hệ cô giáo hoặc văn phòng." />;

  const dow = dayjs().isoWeekday();
  const todayMenu = menuData?.items?.[0]?.menu?.days?.find((d) => d.dayOfWeek === dow);
  const absent = att && att.status !== 'present' && att.status !== 'late';

  const items = [];
  if (att && !absent) {
    items.push({ key: 'in', time: att.checkInAt ? formatTime(att.checkInAt) : '07:30', title: att.status === 'late' ? 'Đến lớp (đi muộn)' : 'Đến lớp', icon: LogIn, state: 'done', detail: att.note || undefined });
  } else if (att && absent) {
    items.push({ key: 'absent', time: '—', title: ATTENDANCE_STATUS[att.status].label, icon: CircleCheck, state: 'done', detail: att.note || 'Cô đã ghi nhận bé nghỉ hôm nay.' });
  } else {
    items.push({ key: 'in', time: '07:30', title: 'Đến lớp', icon: LogIn, state: 'pending', detail: 'Cô chưa điểm danh.' });
  }
  if (!absent) {
    items.push({ key: 'bf', time: '08:00', title: 'Ăn sáng', icon: Utensils, state: mealText(rep?.meals?.breakfast) ? 'done' : 'pending', detail: mealText(rep?.meals?.breakfast) || (todayMenu?.breakfast?.length ? todayMenu.breakfast.join(', ') : undefined) });
    items.push({
      key: 'act', time: '09:00', title: 'Hoạt động', icon: Palette, state: rep?.activities?.length || rep?.photos?.length ? 'done' : 'pending',
      detail: rep?.activities?.length ? rep.activities.join(', ') : undefined,
      children: rep?.photos?.length ? (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {rep.photos.slice(0, 6).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Ảnh hoạt động" className="h-20 w-20 shrink-0 rounded-photo object-cover" loading="lazy" /></a>)}
        </div>
      ) : null,
    });
    items.push({ key: 'lunch', time: '11:00', title: 'Ăn trưa', icon: Utensils, state: mealText(rep?.meals?.lunch) ? 'done' : 'pending', detail: mealText(rep?.meals?.lunch) || (todayMenu?.lunch?.length ? todayMenu.lunch.join(', ') : undefined) });
    items.push({ key: 'nap', time: '12:00', title: 'Ngủ trưa', icon: Moon, state: formatSleep(rep?.sleep) ? 'done' : 'pending', detail: formatSleep(rep?.sleep) || undefined });
    items.push({ key: 'snack', time: '14:30', title: 'Ăn xế', icon: Utensils, state: mealText(rep?.meals?.snack) ? 'done' : 'pending', detail: mealText(rep?.meals?.snack) || (todayMenu?.snack?.length ? todayMenu.snack.join(', ') : undefined) });
    items.push({ key: 'out', time: att?.checkOutAt ? formatTime(att.checkOutAt) : '16:30', title: 'Về nhà', icon: LogOut, state: att?.checkOutAt ? 'done' : 'pending' });
  }

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onRetry={reload} />

      {me?.tuitionDue?.count > 0 && (
        <Link to={PATHS.parent.tuitions} className="flex items-center gap-3 rounded-card border border-sun bg-sun-soft px-4 py-3 text-sm">
          <Wallet size={20} className="shrink-0 text-[#8A6100]" aria-hidden />
          <span className="flex-1">Còn <strong>{formatMoney(me.tuitionDue.amount)}</strong> học phí chưa đóng ({me.tuitionDue.count} tháng).</span>
          <ChevronRight size={16} aria-hidden />
        </Link>
      )}

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg">Hôm nay của bé</h2>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {att ? <StatusChip map={ATTENDANCE_STATUS} value={att.status} /> : <Chip tone="muted">Chưa điểm danh</Chip>}
            {rep?.mood && <Chip tone={rep.mood === 'happy' ? 'leaf' : rep.mood === 'sick' ? 'peach' : rep.mood === 'sad' ? 'sun' : 'sky'} icon={Smile}>{MOOD_LABEL[rep.mood]}</Chip>}
          </div>
        </div>
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-5 w-3/5" /></div>
        ) : noData ? (
          <div className="rounded-card bg-paper px-4 py-6 text-center">
            <CalendarDays size={28} strokeWidth={1.5} className="mx-auto mb-2 text-ink-soft" aria-hidden />
            <p className="font-medium">{dow > 5 ? 'Hôm nay bé nghỉ học' : 'Hôm nay chưa có dữ liệu'}</p>
            <p className="mt-1 text-sm text-ink-soft">{dow > 5 ? 'Cuối tuần không có điểm danh và nhận xét.' : 'Cô chưa điểm danh. Nhận xét thường có sau giờ ngủ trưa.'}</p>
            {lastDay ? (
              <Link to={`${PATHS.parent.calendar}?day=${dayjs(lastDay.date).format('YYYY-MM-DD')}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky hover:underline">
                Xem ngày học gần nhất: {dayjs(lastDay.date).format('dddd DD/MM')} <ChevronRight size={16} aria-hidden />
              </Link>
            ) : (
              <Link to={PATHS.parent.calendar} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky hover:underline">Xem lịch của bé <ChevronRight size={16} aria-hidden /></Link>
            )}
          </div>
        ) : (
          <Timeline items={items} />
        )}
      </section>

      <section className="card p-4">
        <h2 className="text-base">{rep?.teacher ? `Lời nhắn của ${teacherShort(rep.teacher)}` : 'Lời nhắn của cô'}</h2>
        {loading ? <Skeleton className="mt-2 h-10 w-full" /> : rep?.comment ? (
          <>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">“{rep.comment}”</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">Cô chưa gửi lời nhắn hôm nay. Thường có sau giờ ngủ trưa.</p>
        )}
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base">Thực đơn hôm nay</h2>
          <Link to={PATHS.parent.menu} className="text-sm text-sky hover:underline">Cả tuần</Link>
        </div>
        {!child.class ? (
          <p className="mt-2 text-sm text-ink-soft">Bé chưa xếp lớp nên chưa có thực đơn.</p>
        ) : todayMenu ? (
          <dl className="mt-2 grid grid-cols-[64px_1fr] gap-y-1 text-sm">
            <dt className="text-ink-soft">Sáng</dt><dd>{todayMenu.breakfast?.join(', ') || '—'}</dd>
            <dt className="text-ink-soft">Trưa</dt><dd>{todayMenu.lunch?.join(', ') || '—'}</dd>
            <dt className="text-ink-soft">Xế</dt><dd>{todayMenu.snack?.join(', ') || '—'}</dd>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">{dow > 5 ? 'Cuối tuần không có thực đơn.' : `Chưa có thực đơn ${DAY_LABEL[dow]} tuần này.`}</p>
        )}
      </section>

      <nav aria-label="Lối tắt" className="grid grid-cols-4 gap-2">
        {[
          { to: PATHS.parent.albums, icon: Images, label: 'Album' },
          { to: PATHS.parent.growth, icon: HeartPulse, label: 'Tăng trưởng' },
          { to: PATHS.parent.leaveRequests, icon: FileText, label: 'Xin nghỉ' },
          { to: PATHS.parent.medicineNotes, icon: Pill, label: 'Dặn thuốc' },
        ].map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="card flex flex-col items-center gap-1.5 px-2 py-3 text-center text-xs font-medium hover:bg-paper">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-leaf-soft text-leaf"><Icon size={20} strokeWidth={1.75} aria-hidden /></span>
            {label}
          </Link>
        ))}
      </nav>
      <p className="text-center text-xs text-ink-soft"><UtensilsCrossed size={12} className="mr-1 inline" aria-hidden />Nhận xét được cô cập nhật trong ngày.</p>
    </div>
  );
}
