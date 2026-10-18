import { useState } from 'react';
import { Check, X, Phone, FileText } from 'lucide-react';
import { leaveRequestApi } from '../../api/leaveRequest.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useMyClasses } from '../../hooks/useMyClasses.js';
import { usePagination } from '../../hooks/usePagination.js';
import { toast } from '../../stores/toast.store.js';
import { DataTable, StatusChip, ConfirmDialog, Tabs, Avatar, EmptyState } from '../../components/ui/index.js';
import { ClassSelect } from '../../components/shared/ClassSelect.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { LEAVE_STATUS } from '../../utils/constants.js';
import { formatDate, formatDateTime } from '../../utils/format.js';
import dayjs from '../../utils/dayjs.js';

const TABS = [{ value: 'pending', label: 'Chờ duyệt' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'rejected', label: 'Từ chối' }, { value: '', label: 'Tất cả' }];
// "19/10 – 21/10/2026 (3 ngày)"
export function leaveRange(l) {
  const n = dayjs(l.toDate).diff(dayjs(l.fromDate), 'day') + 1;
  return `${dayjs(l.fromDate).isSame(l.toDate, 'day') ? formatDate(l.fromDate) : `${dayjs(l.fromDate).format('DD/MM')} – ${formatDate(l.toDate)}`} (${n} ngày)`;
}

export default function LeaveRequestsPage() {
  const { classes, loading: lc, selectedId, select } = useMyClasses();
  const { setPage, filters, setFilters, params } = usePagination({ status: 'pending' });
  const { data, loading, error, reload } = useFetch(() => leaveRequestApi.list({ ...params, class: selectedId }), [selectedId, params.page, params.status], { enabled: !!selectedId });
  const [approve, setApprove] = useState(null);
  const [reject, setReject] = useState(null);
  const run = (fn, ok) => fn().then(() => { toast.success(ok); reload(); }).catch((e) => toast.error(errorMessage(e)));

  if (!lc && !classes.length) return <EmptyState icon={FileText} title="Bạn chưa được phân công lớp" />;

  return (
    <>
      <PageHeader description="Duyệt đơn → tự ghi 'Vắng có phép' cho các ngày nghỉ (bỏ Thứ Bảy, Chủ Nhật)." actions={<ClassSelect classes={classes} value={selectedId} onChange={select} />} />
      <Tabs className="mb-4" items={TABS} value={filters.status} onChange={(v) => setFilters({ status: v })} />
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />
      <DataTable
        loading={loading}
        rows={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyTitle={filters.status === 'pending' ? 'Không có đơn chờ duyệt' : 'Không có đơn nào'}
        emptyDescription={filters.status === 'pending' ? 'Đơn xin nghỉ của phụ huynh sẽ hiện ở đây.' : undefined}
        columns={[
          { key: 'student', title: 'Bé', render: (l) => <div className="flex items-center gap-2"><Avatar name={l.student?.fullName} src={l.student?.avatar} size="sm" /><div className="min-w-0"><p className="truncate font-medium">{l.student?.fullName}</p><p className="text-xs text-ink-soft">{l.class?.name}</p></div></div> },
          { key: 'range', title: 'Ngày nghỉ', render: (l) => <span className="tabular-nums">{leaveRange(l)}</span> },
          { key: 'reason', title: 'Lý do', render: (l) => <p className="max-w-xs whitespace-pre-line text-sm">{l.reason}</p> },
          { key: 'parent', title: 'Phụ huynh', render: (l) => l.parent ? <span className="text-sm">{l.parent.fullName}{l.parent.phone && <a href={`tel:${l.parent.phone}`} className="ml-1 inline-flex items-center gap-0.5 text-xs text-sky tabular-nums" onClick={(e) => e.stopPropagation()}><Phone size={12} aria-hidden />{l.parent.phone}</a>}</span> : '—' },
          { key: 'status', title: 'Trạng thái', card: 'chip', render: (l) => <div className="flex flex-col items-start gap-0.5"><StatusChip map={LEAVE_STATUS} value={l.status} />{l.status !== 'pending' && l.reviewedAt && <span className="text-xs text-ink-soft">{formatDateTime(l.reviewedAt)}{l.reviewNote ? ` · ${l.reviewNote}` : ''}</span>}</div> },
          { key: 'actions', title: '', align: 'right', actions: (l) => [
            { key: 'approve', label: 'Duyệt', icon: Check, hidden: l.status !== 'pending', onClick: () => setApprove(l) },
            { key: 'reject', label: 'Từ chối', icon: X, danger: true, hidden: l.status !== 'pending', onClick: () => setReject(l) },
          ] },
        ]}
      />
      <ConfirmDialog open={!!approve} onClose={() => setApprove(null)} title="Duyệt đơn xin nghỉ" confirmLabel="Duyệt" message={approve ? `Bé ${approve.student?.fullName} nghỉ ${leaveRange(approve)}. Các ngày này sẽ được ghi "Vắng có phép" (không ghi đè điểm danh đã có).` : ''} onConfirm={() => run(() => leaveRequestApi.approve(approve._id), 'Đã duyệt đơn xin nghỉ')} />
      <ConfirmDialog open={!!reject} onClose={() => setReject(null)} danger requireReason reasonLabel="Lý do từ chối (phụ huynh sẽ thấy)" title="Từ chối đơn xin nghỉ" confirmLabel="Từ chối" message={reject ? `Từ chối đơn của bé ${reject.student?.fullName}?` : ''} onConfirm={(note) => run(() => leaveRequestApi.reject(reject._id, note), 'Đã từ chối đơn xin nghỉ')} />
    </>
  );
}
