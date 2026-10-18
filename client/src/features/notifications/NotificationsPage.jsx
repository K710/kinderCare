import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, CheckCheck, Trash2, Bell } from 'lucide-react';
import { notificationApi } from '../../api/notification.api.js';
import { classApi } from '../../api/class.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { usePagination } from '../../hooks/usePagination.js';
import { useAuth } from '../../hooks/useAuth.js';
import { toast } from '../../stores/toast.store.js';
import { Button, Input, Select, Textarea, Chip, Pagination, Skeleton, EmptyState, IconButton, ConfirmDialog, Tabs } from '../../components/ui/index.js';
import { FormError } from '../../components/shared/FormError.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { ROLE_LABEL, NOTIFICATION_TYPE_LABEL } from '../../utils/constants.js';
import { fromNow, formatDateTime } from '../../utils/format.js';

const schema = z
  .object({
    title: z.string().trim().min(1, 'Nhập tiêu đề.').max(200, 'Tiêu đề tối đa 200 ký tự.'),
    body: z.string().trim().min(1, 'Nhập nội dung.').max(2000, 'Nội dung tối đa 2000 ký tự.'),
    scope: z.enum(['all', 'role', 'class']),
    targetRole: z.string().optional(),
    targetClass: z.string().optional(),
    type: z.enum(['system', 'school', 'class', 'payment', 'leave', 'medicine', 'report']),
  })
  .superRefine((d, ctx) => {
    if (d.scope === 'role' && !d.targetRole) ctx.addIssue({ code: 'custom', path: ['targetRole'], message: 'Chọn vai trò nhận.' });
    if (d.scope === 'class' && !d.targetClass) ctx.addIssue({ code: 'custom', path: ['targetClass'], message: 'Chọn lớp nhận.' });
  });

/* ---------- Soạn thông báo (admin / hiệu trưởng) ---------- */
function ComposeCard({ onSent }) {
  const { data: classes } = useFetch(() => classApi.list({ limit: 100 }).then((r) => r.data), []);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState, watch, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { title: '', body: '', scope: 'all', targetRole: '', targetClass: '', type: 'school' },
  });
  const scope = watch('scope');

  const submit = async (v) => {
    setServerError('');
    const payload = { title: v.title, body: v.body, scope: v.scope, type: v.type };
    if (v.scope === 'role') payload.targetRole = v.targetRole;
    if (v.scope === 'class') payload.targetClass = v.targetClass;
    try {
      await notificationApi.create(payload);
      toast.success('Đã gửi thông báo');
      reset();
      onSent?.();
    } catch (e) {
      setServerError(errorMessage(e));
    }
  };

  return (
    <section className="card p-4">
      <h2 className="text-lg">Gửi thông báo</h2>
      <p className="mt-0.5 text-sm text-ink-soft">Người nhận thấy ngay trên chuông thông báo.</p>
      <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-4" noValidate>
        <Input label="Tiêu đề" placeholder="vd: Nghỉ lễ Giỗ Tổ 10/3" error={formState.errors.title?.message} {...register('title')} />
        <Textarea label="Nội dung" rows={4} error={formState.errors.body?.message} {...register('body')} />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Gửi đến"
            options={[
              { value: 'all', label: 'Toàn trường' },
              { value: 'role', label: 'Theo vai trò' },
              { value: 'class', label: 'Theo lớp' },
            ]}
            {...register('scope')}
          />
          {scope === 'role' && <Select label="Vai trò" placeholder="Chọn vai trò" options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))} error={formState.errors.targetRole?.message} {...register('targetRole')} />}
          {scope === 'class' && <Select label="Lớp" placeholder="Chọn lớp" options={(classes || []).map((c) => ({ value: c._id, label: c.name }))} error={formState.errors.targetClass?.message} {...register('targetClass')} />}
          {scope === 'all' && <Select label="Loại" options={Object.entries(NOTIFICATION_TYPE_LABEL).map(([value, label]) => ({ value, label }))} {...register('type')} />}
        </div>
        {scope !== 'all' && <Select label="Loại" options={Object.entries(NOTIFICATION_TYPE_LABEL).map(([value, label]) => ({ value, label }))} {...register('type')} />}
        <FormError message={serverError} />
        <Button type="submit" icon={Send} loading={formState.isSubmitting} className="w-full md:w-auto">
          Gửi thông báo
        </Button>
      </form>
    </section>
  );
}

/* ---------- Danh sách thông báo của tôi (mọi vai trò) ---------- */
export function NotificationList({ canDelete = false, refreshKey = 0 }) {
  const [unread, setUnread] = useState('');
  const { page, setPage, params } = usePagination({}, 15);
  const { data, loading, error, reload, setData } = useFetch(() => notificationApi.list({ ...params, unread: unread || undefined }), [params.page, unread, refreshKey]);
  const [del, setDel] = useState(null);

  const markRead = async (n) => {
    if (n.isRead) return;
    setData((d) => ({ ...d, data: d.data.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)) }));
    notificationApi.markRead(n._id).catch(() => {});
  };
  const markAll = () => notificationApi.markAllRead().then(() => { toast.success('Đã đánh dấu tất cả là đã đọc'); reload(); }).catch((e) => toast.error(errorMessage(e)));

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Tabs items={[{ value: '', label: 'Tất cả' }, { value: 'true', label: 'Chưa đọc' }]} value={unread} onChange={(v) => { setUnread(v); setPage(1); }} />
        <Button size="sm" variant="ghost" icon={CheckCheck} onClick={markAll}>
          Đọc tất cả
        </Button>
      </div>
      <ErrorBanner message={error} onRetry={reload} className="mb-3" />
      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-card" />)}</div>
      ) : !data?.data?.length ? (
        <EmptyState icon={Bell} title={unread ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'} description="Thông báo từ nhà trường và hệ thống sẽ hiện ở đây." />
      ) : (
        <ul className="card divide-y divide-line">
          {data.data.map((n) => (
            <li key={n._id} className={`flex gap-3 p-4 ${n.isRead ? '' : 'bg-leaf-soft/30'}`} onClick={() => markRead(n)}>
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-sun'}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-sm ${n.isRead ? 'font-medium' : 'font-semibold'}`}>{n.title}</p>
                  <Chip tone="muted">{NOTIFICATION_TYPE_LABEL[n.type] || n.type}</Chip>
                </div>
                <p className="mt-0.5 whitespace-pre-line text-sm text-ink-soft">{n.body}</p>
                <p className="mt-1 text-xs text-ink-soft" title={formatDateTime(n.createdAt)}>
                  {n.sender ? `${n.sender.fullName} · ` : ''}{fromNow(n.createdAt)}
                </p>
              </div>
              {canDelete && <IconButton label="Xoá thông báo" icon={Trash2} danger size="sm" onClick={(e) => { e.stopPropagation(); setDel(n); }} />}
            </li>
          ))}
        </ul>
      )}
      {data?.pagination && (
        <div className="mt-3 flex justify-end">
          <Pagination {...data.pagination} page={page} onChange={setPage} />
        </div>
      )}
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        danger
        title="Xoá thông báo"
        confirmLabel="Xoá"
        message={del ? `Xoá "${del.title}" khỏi tất cả người nhận?` : ''}
        onConfirm={() => notificationApi.remove(del._id).then(() => { toast.success('Đã xoá thông báo'); reload(); }).catch((e) => toast.error(errorMessage(e)))}
      />
    </section>
  );
}

// Trang thông báo của admin / hiệu trưởng: soạn + danh sách
export default function NotificationsPage() {
  const { role } = useAuth();
  const [key, setKey] = useState(0);
  const canSend = role === 'admin' || role === 'principal';
  return (
    <>
      <PageHeader description={canSend ? 'Gửi thông báo toàn trường, theo vai trò hoặc theo lớp.' : 'Thông báo bạn nhận được.'} />
      <div className={canSend ? 'grid gap-4 lg:grid-cols-5' : ''}>
        {canSend && (
          <div className="lg:col-span-2">
            <ComposeCard onSent={() => setKey((k) => k + 1)} />
          </div>
        )}
        <div className={canSend ? 'lg:col-span-3' : ''}>
          <NotificationList canDelete={canSend} refreshKey={key} />
        </div>
      </div>
    </>
  );
}
