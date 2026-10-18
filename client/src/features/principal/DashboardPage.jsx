import { Link } from 'react-router-dom';
import { Baby, ClipboardCheck, Wallet, ClipboardList, UtensilsCrossed, BookOpen, FileText, Pill, ChevronRight } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch.js';
import { dashboardApi } from '../../api/dashboard.api.js';
import { menuApi } from '../../api/menu.api.js';
import { lessonPlanApi } from '../../api/lessonPlan.api.js';
import { StatTile, Chip, Skeleton } from '../../components/ui/index.js';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { AttendanceTrendChart } from '../../components/shared/AttendanceTrendChart.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { PATHS } from '../../router/paths.js';
import { formatMoney, formatWeek, formatDateFull } from '../../utils/format.js';
import { AGE_GROUP_LABEL } from '../../utils/constants.js';

// Dashboard HT: StatTile (sĩ số, đi học hôm nay %, đã thu tháng này, chờ duyệt) + biểu đồ 30 ngày + việc cần duyệt
export default function PrincipalDashboardPage() {
  const { data, loading, error, reload } = useFetch(dashboardApi.principal, []);
  const { data: menus, loading: lm } = useFetch(() => menuApi.list({ status: 'pending', limit: 5 }), []);
  const { data: plans, loading: lp } = useFetch(() => lessonPlanApi.list({ status: 'pending', limit: 5 }), []);

  const att = data?.attendanceToday;
  const pct = att?.total ? Math.round(((att.present + att.late) / att.total) * 100) : 0;
  const pending = data?.pending || {};
  // Chờ duyệt = việc của HT (thực đơn, kế hoạch). Đơn nghỉ / dặn thuốc do GV xử lý → mục Theo dõi
  const pendingTotal = (pending.menus || 0) + (pending.lessonPlans || 0);
  const tuition = data?.tuitionThisMonth;

  return (
    <>
      <PageHeader description={formatDateFull(new Date())} />
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatTile label="Sĩ số toàn trường" value={data?.totals?.students ?? 0} icon={Baby} tone="leaf" loading={loading} hint={data ? `${data.totals.classes} lớp · ${data.totals.teachers} giáo viên` : undefined} />
        <StatTile label="Đi học hôm nay" value={`${pct}%`} icon={ClipboardCheck} tone={pct >= 80 ? 'leaf' : 'sun'} loading={loading} hint={att ? `${att.marked}/${att.total} đã điểm danh` : undefined} />
        <StatTile label="Đã thu tháng này" value={formatMoney(tuition?.totalPaid)} icon={Wallet} tone="sky" loading={loading} hint={tuition ? `Còn ${formatMoney(tuition.remaining)}` : undefined} />
        <StatTile label="Chờ duyệt" value={pendingTotal} icon={ClipboardList} tone={pendingTotal ? 'peach' : 'muted'} loading={loading} hint={data ? `${pending.menus} thực đơn · ${pending.lessonPlans} kế hoạch` : undefined} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg">Chuyên cần 30 ngày</h2>
            <span className="text-xs text-ink-soft">Bỏ qua Thứ Bảy, Chủ Nhật</span>
          </div>
          <AttendanceTrendChart data={data?.attendanceTrend} loading={loading} />
        </section>

        <section className="card p-4">
          <h2 className="text-lg">Việc cần duyệt</h2>
          <ul className="mt-3 divide-y divide-line">
            <PendingRow to={`${PATHS.principal.menus}?status=pending`} icon={UtensilsCrossed} label="Thực đơn chờ duyệt" count={pending.menus} loading={loading} />
            <PendingRow to={`${PATHS.principal.lessonPlans}?status=pending`} icon={BookOpen} label="Kế hoạch giảng dạy chờ duyệt" count={pending.lessonPlans} loading={loading} />
          </ul>

          <h3 className="mt-5 text-base">Theo dõi</h3>
          <p className="text-xs text-ink-soft">Giáo viên xử lý, hiệu trưởng chỉ theo dõi.</p>
          <ul className="mt-1 divide-y divide-line">
            <PendingRow icon={FileText} label="Đơn xin nghỉ chờ cô duyệt" count={pending.leaveRequests} loading={loading} />
            <PendingRow icon={Pill} label="Dặn thuốc chờ cô xác nhận" count={pending.medicineNotes} loading={loading} />
          </ul>

          <h3 className="mt-5 text-base">Mới gửi duyệt</h3>
          {lm || lp ? (
            <div className="mt-2 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {(menus?.data || []).map((m) => (
                <li key={m._id}>
                  <Link to={`${PATHS.principal.menus}?status=pending`} className="flex items-center gap-2 rounded-btn px-2 py-1.5 hover:bg-paper">
                    <UtensilsCrossed size={16} className="shrink-0 text-ink-soft" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      Thực đơn {formatWeek(m.weekStart)} · {AGE_GROUP_LABEL[m.ageGroup]}
                    </span>
                  </Link>
                </li>
              ))}
              {(plans?.data || []).map((p) => (
                <li key={p._id}>
                  <Link to={`${PATHS.principal.lessonPlans}?status=pending`} className="flex items-center gap-2 rounded-btn px-2 py-1.5 hover:bg-paper">
                    <BookOpen size={16} className="shrink-0 text-ink-soft" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      {p.class?.name}: {p.theme || formatWeek(p.weekStart)}
                    </span>
                  </Link>
                </li>
              ))}
              {!menus?.data?.length && !plans?.data?.length && <li className="px-2 text-ink-soft">Không có gì chờ duyệt. Tuyệt!</li>}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function PendingRow({ to, icon: Icon, label, count = 0, loading }) {
  const inner = (
    <>
      <Icon size={18} strokeWidth={1.75} className="shrink-0 text-ink-soft" aria-hidden />
      <span className="min-w-0 flex-1 text-sm">{label}</span>
      {loading ? <Skeleton className="h-5 w-8" /> : <Chip tone={count ? 'sun' : 'muted'}>{count}</Chip>}
      {to && <ChevronRight size={16} className="text-ink-soft" aria-hidden />}
    </>
  );
  return (
    <li>
      {to ? (
        <Link to={to} className="-mx-2 flex items-center gap-3 rounded-btn px-2 py-2.5 hover:bg-paper">
          {inner}
        </Link>
      ) : (
        <div className="-mx-2 flex items-center gap-3 px-2 py-2.5">{inner}</div>
      )}
    </li>
  );
}
