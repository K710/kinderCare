import { Link } from 'react-router-dom';
import { Baby, ClipboardCheck, NotebookPen, FileText, Pill, MessageCircle, Images, ChevronRight } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch.js';
import { dashboardApi } from '../../api/dashboard.api.js';
import { StatTile, Chip, Button } from '../../components/ui/index.js';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { PATHS } from '../../router/paths.js';
import { formatDateFull } from '../../utils/format.js';
import { AGE_GROUP_LABEL } from '../../utils/constants.js';

// Tổng quan GV: lớp mình, điểm danh hôm nay, nhận xét đã viết, đơn nghỉ / dặn thuốc chờ
export default function TeacherDashboardPage() {
  const { data, loading, error, reload } = useFetch(dashboardApi.teacher, []);
  const att = data?.attendanceToday;
  const rep = data?.dailyReportsToday;

  return (
    <>
      <PageHeader
        description={formatDateFull(new Date())}
        actions={
          <>
            <Link to={PATHS.teacher.attendance}><Button icon={ClipboardCheck}>Điểm danh hôm nay</Button></Link>
            <Link to={PATHS.teacher.reports}><Button variant="secondary" icon={NotebookPen}>Viết nhận xét</Button></Link>
          </>
        }
      />
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatTile label="Đã điểm danh" value={att ? `${att.marked}/${att.total}` : '–'} icon={ClipboardCheck} tone={att && att.unmarked === 0 && att.total ? 'leaf' : 'sun'} loading={loading} hint={att ? `${att.present + att.late} có mặt · ${att.absent + att.excused} vắng` : undefined} />
        <StatTile label="Nhận xét hôm nay" value={rep ? `${rep.done}/${rep.total}` : '–'} icon={NotebookPen} tone="sky" loading={loading} hint={rep && rep.done < rep.total ? `Còn ${rep.total - rep.done} bé` : 'Đã viết đủ'} />
        <StatTile label="Đơn nghỉ chờ duyệt" value={data?.pending?.leaveRequests ?? 0} icon={FileText} tone={data?.pending?.leaveRequests ? 'peach' : 'muted'} loading={loading} />
        <StatTile label="Dặn thuốc hôm nay" value={data?.pending?.medicineNotesToday ?? 0} icon={Pill} tone={data?.pending?.medicineNotesToday ? 'sun' : 'muted'} loading={loading} hint="Cần xác nhận / cho uống" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <h2 className="text-lg">Lớp của tôi</h2>
          {loading ? (
            <p className="mt-3 text-sm text-ink-soft">Đang tải…</p>
          ) : data?.classes?.length ? (
            <ul className="mt-3 divide-y divide-line">
              {data.classes.map((c) => (
                <li key={c._id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-leaf-soft text-leaf"><Baby size={20} strokeWidth={1.75} aria-hidden /></span>
                    <div>
                      <p className="font-display text-base font-semibold">{c.name}</p>
                      <p className="text-xs text-ink-soft">{AGE_GROUP_LABEL[c.ageGroup]}{c.room ? ` · Phòng ${c.room}` : ''} · {c.studentCount} bé</p>
                    </div>
                  </div>
                  <Link to={PATHS.teacher.myClass} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">Xem lớp <ChevronRight size={16} aria-hidden /></Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">Bạn chưa được phân công lớp nào. Liên hệ hiệu trưởng.</p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="text-lg">Việc hôm nay</h2>
          <ul className="mt-3 space-y-1">
            <Row to={PATHS.teacher.leaveRequests} icon={FileText} label="Duyệt đơn xin nghỉ" count={data?.pending?.leaveRequests} />
            <Row to={PATHS.teacher.medicineNotes} icon={Pill} label="Dặn thuốc cần xử lý" count={data?.pending?.medicineNotesToday} />
            <Row to={PATHS.teacher.chat} icon={MessageCircle} label="Tin nhắn chưa đọc" count={data?.unreadMessages} />
            <Row to={PATHS.teacher.albums} icon={Images} label="Đăng ảnh hoạt động" />
          </ul>
        </section>
      </div>
    </>
  );
}

function Row({ to, icon: Icon, label, count }) {
  return (
    <li>
      <Link to={to} className="-mx-2 flex items-center gap-3 rounded-btn px-2 py-2.5 hover:bg-paper">
        <Icon size={18} strokeWidth={1.75} className="shrink-0 text-ink-soft" aria-hidden />
        <span className="min-w-0 flex-1 text-sm">{label}</span>
        {count != null && <Chip tone={count ? 'sun' : 'muted'}>{count}</Chip>}
        <ChevronRight size={16} className="text-ink-soft" aria-hidden />
      </Link>
    </li>
  );
}
