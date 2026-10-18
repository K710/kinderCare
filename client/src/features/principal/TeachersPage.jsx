import { Link } from 'react-router-dom';
import { userApi } from '../../api/user.api.js';
import { useFetch, useDebounce } from '../../hooks/useFetch.js';
import { usePagination } from '../../hooks/usePagination.js';
import { SearchInput, DataTable, Chip, Avatar } from '../../components/ui/index.js';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { PATHS } from '../../router/paths.js';
import { fromNow, formatDateTime, teacherFull } from '../../utils/format.js';

// Danh sách giáo viên + lớp phụ trách (tài khoản do quản trị viên quản lý)
export default function TeachersPage() {
  const { setPage, filters, setFilters, params } = usePagination({ search: '' });
  const search = useDebounce(filters.search);
  const { data, loading, error, reload } = useFetch(() => userApi.teachers({ ...params, search }), [params.page, search]);

  return (
    <>
      <PageHeader description="Giáo viên đang hoạt động và lớp đang phụ trách. Tạo tài khoản mới do quản trị viên thực hiện." />
      <div className="mb-4 md:max-w-sm">
        <SearchInput value={filters.search} onChange={(v) => setFilters({ search: v })} placeholder="Tìm theo tên, email, số điện thoại" />
      </div>
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      <DataTable
        loading={loading}
        rows={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyTitle={filters.search ? 'Không có giáo viên khớp tìm kiếm' : 'Chưa có giáo viên'}
        emptyDescription={!filters.search ? 'Nhờ quản trị viên tạo tài khoản giáo viên trước.' : undefined}
        columns={[
          {
            key: 'fullName',
            title: 'Giáo viên',
            render: (t) => (
              <div className="flex items-center gap-3">
                <Avatar src={t.avatar} name={t.fullName} role="teacher" size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.honorific ? teacherFull(t) : t.fullName}</p>
                  <p className="truncate text-xs text-ink-soft">{t.email}</p>
                </div>
              </div>
            ),
          },
          { key: 'phone', title: 'Số điện thoại', render: (t) => <span className="tabular-nums">{t.phone || '—'}</span> },
          {
            key: 'classes',
            title: 'Lớp phụ trách',
            card: 'chip',
            render: (t) =>
              t.classes?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {t.classes.map((c) => (
                    <Link key={c._id} to={PATHS.principal.classDetail(c._id)} onClick={(e) => e.stopPropagation()}>
                      <Chip tone="leaf">{c.name}</Chip>
                    </Link>
                  ))}
                </div>
              ) : (
                <Chip tone="muted">Chưa phân lớp</Chip>
              ),
          },
          {
            key: 'lastLoginAt',
            title: 'Đăng nhập',
            render: (t) =>
              t.lastLoginAt ? (
                <span className="text-ink-soft" title={formatDateTime(t.lastLoginAt)}>
                  {fromNow(t.lastLoginAt)}
                </span>
              ) : (
                <span className="text-ink-soft">Chưa</span>
              ),
          },
        ]}
      />
    </>
  );
}
