import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Check, X, Paperclip } from 'lucide-react';
import { lessonPlanApi } from '../../api/lessonPlan.api.js';
import { classApi } from '../../api/class.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { usePagination } from '../../hooks/usePagination.js';
import { toast } from '../../stores/toast.store.js';
import { Button, Select, DataTable, StatusChip, Modal, ConfirmDialog, Tabs, Avatar } from '../../components/ui/index.js';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { APPROVAL_STATUS, DAY_LABEL } from '../../utils/constants.js';
import { formatWeek, formatDateTime } from '../../utils/format.js';

const STATUS_TABS = [{ value: '', label: 'Tất cả' }, ...Object.entries(APPROVAL_STATUS).map(([value, s]) => ({ value, label: s.label }))];

/* ---------- Xem kế hoạch (dùng chung GV / HT) ---------- */
export function LessonPlanViewModal({ plan, onClose, footer }) {
  if (!plan) return null;
  return (
    <Modal open onClose={onClose} size="lg" title={plan.theme || `Kế hoạch ${formatWeek(plan.weekStart)}`} description={`${plan.class?.name || ''} · ${formatWeek(plan.weekStart)}${plan.teacher ? ` · ${plan.teacher.fullName}` : ''}`} footer={footer}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <StatusChip map={APPROVAL_STATUS} value={plan.status} />
        {plan.status === 'approved' && plan.approvedBy && <span className="text-ink-soft">Duyệt bởi {plan.approvedBy.fullName} · {formatDateTime(plan.approvedAt)}</span>}
        {plan.status === 'rejected' && plan.rejectReason && <span className="text-berry">Lý do: {plan.rejectReason}</span>}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((d) => {
          const day = (plan.days || []).find((x) => x.dayOfWeek === d);
          if (!day?.activities?.length) return null;
          return (
            <section key={d} className="rounded-card border border-line p-3">
              <h3 className="text-base">{DAY_LABEL[d]}</h3>
              <ul className="mt-2 space-y-2">
                {day.activities.map((a, i) => (
                  <li key={i} className="grid grid-cols-[72px_1fr] gap-2 text-sm">
                    <span className="tabular-nums text-ink-soft">{a.time || '—'}</span>
                    <div>
                      <p className="font-medium">{a.title}</p>
                      {a.goal && <p className="text-ink-soft">Mục tiêu: {a.goal}</p>}
                      {a.materials && <p className="text-ink-soft">Chuẩn bị: {a.materials}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {!(plan.days || []).some((d) => d.activities?.length) && <p className="text-sm text-ink-soft">Kế hoạch chưa có hoạt động nào.</p>}
        {plan.attachments?.length > 0 && (
          <div>
            <p className="text-sm font-medium">Tệp đính kèm</p>
            <ul className="mt-1 space-y-1">
              {plan.attachments.map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-sky hover:underline">
                    <Paperclip size={14} aria-hidden /> {u.split('/').pop()}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ---------- Trang HT: xem + duyệt / từ chối ---------- */
export default function LessonPlansPage() {
  const [sp] = useSearchParams();
  const { setPage, filters, setFilters, params } = usePagination({ status: sp.get('status') || '', class: '' });
  const { data: classes } = useFetch(() => classApi.list({ limit: 100 }).then((r) => r.data), []);
  const { data, loading, error, reload } = useFetch(() => lessonPlanApi.list(params), [params.page, params.status, params.class]);
  const [view, setView] = useState(null);
  const [reject, setReject] = useState(null);

  const run = (fn, ok) => fn().then(() => { toast.success(ok); reload(); setView(null); }).catch((e) => toast.error(errorMessage(e)));
  const footer = (p) =>
    p.status === 'pending' ? (
      <>
        <Button variant="danger" icon={X} onClick={() => { setView(null); setReject(p); }}>Từ chối</Button>
        <Button icon={Check} onClick={() => run(() => lessonPlanApi.approve(p._id), 'Đã duyệt kế hoạch')}>Duyệt</Button>
      </>
    ) : (
      <Button variant="secondary" onClick={() => setView(null)}>Đóng</Button>
    );

  return (
    <>
      <PageHeader description="Kế hoạch giảng dạy tuần do giáo viên gửi. Duyệt để phụ huynh xem được." />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs items={STATUS_TABS} value={filters.status} onChange={(v) => setFilters({ status: v })} className="flex-1" />
        <Select value={filters.class} onChange={(e) => setFilters({ class: e.target.value })} options={(classes || []).map((c) => ({ value: c._id, label: c.name }))} placeholder="Mọi lớp" aria-label="Lọc lớp" className="md:w-44" />
      </div>
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      <DataTable
        loading={loading}
        rows={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowClick={setView}
        emptyTitle={filters.status || filters.class ? 'Không có kế hoạch khớp bộ lọc' : 'Chưa có kế hoạch nào'}
        emptyDescription={!filters.status && !filters.class ? 'Giáo viên sẽ gửi kế hoạch tuần tại đây.' : undefined}
        columns={[
          { key: 'weekStart', title: 'Tuần', render: (p) => <div><p className="font-medium">{formatWeek(p.weekStart)}</p>{p.theme && <p className="truncate text-xs text-ink-soft">{p.theme}</p>}</div> },
          { key: 'class', title: 'Lớp', render: (p) => <span className="font-medium">{p.class?.name || '—'}</span> },
          {
            key: 'teacher',
            title: 'Giáo viên',
            render: (p) =>
              p.teacher ? (
                <span className="inline-flex items-center gap-2"><Avatar name={p.teacher.fullName} src={p.teacher.avatar} size="sm" />{p.teacher.fullName}</span>
              ) : '—',
          },
          { key: 'status', title: 'Trạng thái', card: 'chip', render: (p) => <StatusChip map={APPROVAL_STATUS} value={p.status} /> },
          {
            key: 'actions',
            title: '',
            align: 'right',
            actions: (p) => [
              { key: 'view', label: 'Xem', icon: Eye, onClick: () => setView(p) },
              { key: 'approve', label: 'Duyệt', icon: Check, hidden: p.status !== 'pending', onClick: () => run(() => lessonPlanApi.approve(p._id), 'Đã duyệt kế hoạch') },
              { key: 'reject', label: 'Từ chối', icon: X, danger: true, hidden: p.status !== 'pending', onClick: () => setReject(p) },
            ],
          },
        ]}
      />

      <LessonPlanViewModal plan={view} onClose={() => setView(null)} footer={view && footer(view)} />
      <ConfirmDialog
        open={!!reject}
        onClose={() => setReject(null)}
        danger
        requireReason
        reasonLabel="Lý do từ chối (giáo viên sẽ thấy)"
        title="Từ chối kế hoạch"
        confirmLabel="Từ chối"
        message={reject ? `Kế hoạch ${reject.class?.name} ${formatWeek(reject.weekStart)} sẽ trả về cho giáo viên sửa lại.` : ''}
        onConfirm={(reason) => run(() => lessonPlanApi.reject(reject._id, reason), 'Đã từ chối kế hoạch')}
      />
    </>
  );
}
