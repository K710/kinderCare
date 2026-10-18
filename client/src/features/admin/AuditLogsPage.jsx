import { useState } from 'react';
import { auditLogApi } from '../../api/auditLog.api.js';
import { useFetch } from '../../hooks/useFetch.js';
import { usePagination } from '../../hooks/usePagination.js';
import { Select, Input, DataTable, Chip, Modal, Button, Avatar, DatePicker } from '../../components/ui/index.js';
import { RoleChip } from '../../components/shared/RoleChip.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { formatDateTime } from '../../utils/format.js';

// Nhãn tiếng Việt cho action (fallback: giữ nguyên mã)
const ACTION_LABEL = {
  LOGIN: 'Đăng nhập', LOGOUT: 'Đăng xuất', REGISTER: 'Tạo tài khoản', CHANGE_PASSWORD: 'Đổi mật khẩu',
  CREATE_USER: 'Tạo tài khoản', UPDATE_USER: 'Sửa tài khoản', SET_USER_STATUS: 'Khoá / mở khoá', RESET_PASSWORD: 'Đặt lại mật khẩu',
  CREATE_SCHOOL_YEAR: 'Tạo năm học', UPDATE_SCHOOL_YEAR: 'Sửa năm học', SET_CURRENT_SCHOOL_YEAR: 'Đặt năm học hiện tại', DELETE_SCHOOL_YEAR: 'Xoá năm học',
  CREATE_CLASS: 'Tạo lớp', UPDATE_CLASS: 'Sửa lớp', DELETE_CLASS: 'Xoá lớp', SET_CLASS_TEACHERS: 'Gán giáo viên', ADD_CLASS_STUDENTS: 'Thêm học sinh vào lớp',
  CREATE_STUDENT: 'Tạo hồ sơ bé', UPDATE_STUDENT: 'Sửa hồ sơ bé', SET_STUDENT_PARENTS: 'Gán phụ huynh', SET_STUDENT_STATUS: 'Đổi trạng thái bé',
  CREATE_TUITION: 'Tạo học phí', BULK_CREATE_TUITION: 'Tạo học phí cả lớp', UPDATE_TUITION: 'Sửa học phí', ADJUST_TUITION: 'Điều chỉnh học phí có tiền', DELETE_TUITION: 'Xoá học phí',
  SEPAY_WEBHOOK: 'Webhook SePay', ASSIGN_PAYMENT: 'Gán giao dịch', UNASSIGN_PAYMENT: 'Gỡ gán giao dịch', MANUAL_PAYMENT: 'Thu tiền mặt', DELETE_CASH_PAYMENT: 'Xoá tiền mặt',
  SEND_NOTIFICATION: 'Gửi thông báo',
};
const statusTone = (s) => (s >= 500 ? 'berry' : s >= 400 ? 'peach' : 'leaf');

export default function AuditLogsPage() {
  const { setPage, filters, setFilters, params } = usePagination({ action: '', from: '', to: '' }, 25);
  const { data, loading, error, reload } = useFetch(() => auditLogApi.list(params), [params.page, params.action, params.from, params.to]);
  const { data: actions } = useFetch(auditLogApi.actions, []);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (row) => {
    setDetailLoading(true);
    setDetail(row);
    try {
      setDetail(await auditLogApi.get(row._id));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <PageHeader description="Mọi thao tác quan trọng được ghi lại và tự xoá sau 180 ngày." />

      {/* Mobile: select full hàng, 2 ô ngày cạnh nhau */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-[1fr_180px_180px]">
        <Select
          className="col-span-2 md:col-span-1"
          value={filters.action}
          onChange={(e) => setFilters({ action: e.target.value })}
          placeholder="Mọi hành động"
          options={(actions || []).sort().map((a) => ({ value: a, label: ACTION_LABEL[a] ? `${ACTION_LABEL[a]} (${a})` : a }))}
          aria-label="Lọc hành động"
        />
        <DatePicker value={filters.from} onChange={(v) => setFilters({ from: v })} placeholder="Từ ngày" aria-label="Từ ngày" />
        <DatePicker value={filters.to.slice(0, 10)} onChange={(v) => setFilters({ to: v ? `${v}T23:59:59` : '' })} placeholder="Đến ngày" aria-label="Đến ngày" />
      </div>

      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      <DataTable
        loading={loading}
        rows={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowClick={openDetail}
        emptyTitle="Không có nhật ký khớp bộ lọc"
        columns={[
          { key: 'createdAt', title: 'Thời gian', className: 'whitespace-nowrap', card: 'meta', render: (l) => <span className="tabular-nums text-ink-soft">{formatDateTime(l.createdAt)}</span> },
          {
            key: 'user',
            title: 'Người thực hiện',
            render: (l) =>
              l.user ? (
                <div className="flex items-center gap-2">
                  <Avatar name={l.user.fullName} role={l.user.role} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.user.fullName}</p>
                    <RoleChip role={l.user.role} />
                  </div>
                </div>
              ) : (
                <Chip tone="muted">Hệ thống / ẩn danh</Chip>
              ),
          },
          {
            key: 'action',
            title: 'Hành động',
            card: 'header',
            render: (l) => (
              <div>
                <p className="font-medium">{ACTION_LABEL[l.action] || l.action}</p>
                <p className="text-xs text-ink-soft">{l.resource}</p>
              </div>
            ),
          },
          { key: 'path', title: 'Yêu cầu', render: (l) => <code className="text-xs text-ink-soft">{l.method} {l.path}</code> },
          { key: 'statusCode', title: 'Kết quả', card: 'chip', render: (l) => <Chip tone={statusTone(l.statusCode)}>{l.statusCode}</Chip> },
          { key: 'ip', title: 'IP', className: 'hidden lg:table-cell', card: false, render: (l) => <span className="text-xs text-ink-soft tabular-nums">{l.ip}</span> },
        ]}
      />

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? ACTION_LABEL[detail.action] || detail.action : ''}
        description={detail ? `${formatDateTime(detail.createdAt)} · ${detail.user?.fullName || 'Hệ thống'}` : ''}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Đóng
          </Button>
        }
      >
        {detail && (
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
            <dt className="text-ink-soft">Yêu cầu</dt>
            <dd>
              <code className="text-xs">{detail.method} {detail.path}</code>
            </dd>
            <dt className="text-ink-soft">Kết quả</dt>
            <dd>
              <Chip tone={statusTone(detail.statusCode)}>{detail.statusCode}</Chip>
            </dd>
            <dt className="text-ink-soft">IP</dt>
            <dd className="tabular-nums">{detail.ip || '—'}</dd>
            <dt className="text-ink-soft">Thiết bị</dt>
            <dd className="break-all text-xs text-ink-soft">{detail.userAgent || '—'}</dd>
            <dt className="text-ink-soft">Dữ liệu</dt>
            <dd>
              <pre className="max-h-80 overflow-auto rounded-btn bg-paper p-3 text-xs">
                {detailLoading ? 'Đang tải…' : JSON.stringify(detail.payload ?? null, null, 2)}
              </pre>
            </dd>
          </dl>
        )}
      </Modal>
    </>
  );
}
