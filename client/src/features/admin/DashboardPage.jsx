import { Users, Lock, ScrollText, UserCheck } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch.js';
import { dashboardApi } from '../../api/dashboard.api.js';
import { StatTile, DataTable, Avatar } from '../../components/ui/index.js';
import { RoleChip } from '../../components/shared/RoleChip.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { ROLE_LABEL } from '../../utils/constants.js';
import { fromNow, formatDateTime } from '../../utils/format.js';

export default function AdminDashboardPage() {
  const { data, loading, error, reload } = useFetch(dashboardApi.admin, []);
  const roles = data?.usersByRole || {};

  return (
    <>
      <PageHeader description="Tình hình tài khoản và hoạt động hệ thống." />
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatTile label="Tổng tài khoản" value={data?.totalUsers ?? 0} icon={Users} tone="leaf" loading={loading} />
        <StatTile label="Đang hoạt động" value={(data?.totalUsers ?? 0) - (data?.lockedUsers ?? 0)} icon={UserCheck} tone="sky" loading={loading} />
        <StatTile label="Bị khoá" value={data?.lockedUsers ?? 0} icon={Lock} tone={data?.lockedUsers ? 'peach' : 'muted'} loading={loading} />
        <StatTile label="Nhật ký hôm nay" value={data?.auditLogsToday ?? 0} icon={ScrollText} tone="sun" loading={loading} hint="Thao tác được ghi lại" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="card p-4">
          <h2 className="text-lg">Theo vai trò</h2>
          <ul className="mt-3 divide-y divide-line">
            {Object.entries(ROLE_LABEL).map(([role, label]) => (
              <li key={role} className="flex items-center justify-between py-2.5">
                <RoleChip role={role} />
                <span className="font-display text-lg font-semibold tabular-nums">{loading ? '–' : (roles[role] ?? 0)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-3 text-lg">Đăng nhập gần đây</h2>
          <DataTable
            loading={loading}
            rows={data?.recentLogins || []}
            emptyTitle="Chưa có ai đăng nhập"
            columns={[
              {
                key: 'fullName',
                title: 'Người dùng',
                render: (u) => (
                  <div className="flex items-center gap-3">
                    <Avatar name={u.fullName} role={u.role} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.fullName}</p>
                      <p className="truncate text-xs text-ink-soft">{u.email}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'role', title: 'Vai trò', card: 'chip', render: (u) => <RoleChip role={u.role} /> },
              {
                key: 'lastLoginAt',
                title: 'Lần cuối',
                render: (u) => (
                  <span title={formatDateTime(u.lastLoginAt)} className="text-ink-soft">
                    {fromNow(u.lastLoginAt)}
                  </span>
                ),
              },
            ]}
          />
        </section>
      </div>
    </>
  );
}
