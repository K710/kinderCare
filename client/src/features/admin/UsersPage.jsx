import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Lock, LockOpen, KeyRound } from 'lucide-react';
import { userApi } from '../../api/user.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch, useDebounce } from '../../hooks/useFetch.js';
import { usePagination } from '../../hooks/usePagination.js';
import { useAuth } from '../../hooks/useAuth.js';
import { toast } from '../../stores/toast.store.js';
import { Button, Input, Select, SearchInput, DataTable, Avatar, Chip, Modal, ConfirmDialog } from '../../components/ui/index.js';
import { RoleChip } from '../../components/shared/RoleChip.jsx';
import { TempPasswordModal } from '../../components/shared/TempPasswordModal.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { ROLE_LABEL, HONORIFIC_LABEL } from '../../utils/constants.js';
import { fromNow, formatDateTime } from '../../utils/format.js';

const ROLE_OPTIONS = Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }));
const phoneRule = z.string().trim().regex(/^(0|\+84)\d{9,10}$/, 'Số điện thoại chưa đúng, cần 10 chữ số bắt đầu bằng 0.');

const baseSchema = {
  fullName: z.string().trim().min(2, 'Họ tên tối thiểu 2 ký tự.').max(100),
  email: z.string().trim().toLowerCase().email('Email chưa đúng định dạng.'),
  phone: z.union([phoneRule, z.literal('')]),
  role: z.enum(['admin', 'principal', 'teacher', 'parent'], { message: 'Chọn vai trò.' }),
  honorific: z.enum(['co', 'thay', '']).optional(),
};
const createSchema = z.object(baseSchema); // mật khẩu tạm do server sinh, hiện 1 lần
const editSchema = z.object(baseSchema);

/* ---------- Modal tạo / sửa ---------- */
function UserFormModal({ open, onClose, user, onSaved, isSelf }) {
  const isEdit = !!user;
  const { register, handleSubmit, formState, reset, watch } = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    values: user
      ? { fullName: user.fullName, email: user.email, phone: user.phone || '', role: user.role, honorific: user.honorific || '' }
      : { fullName: '', email: '', phone: '', role: '', honorific: '' }, // bắt buộc chọn vai trò
  });
  const roleValue = watch('role');
  const [serverError, setServerError] = useState('');

  const submit = async (values) => {
    setServerError('');
    const payload = { ...values };
    if (!payload.phone) delete payload.phone;
    else if (isEdit) payload.phone = values.phone;
    if (isSelf) delete payload.role; // không tự đổi vai trò
    if (values.role !== 'teacher' || !payload.honorific) delete payload.honorific; // danh xưng chỉ cho GV
    try {
      const saved = isEdit ? await userApi.update(user._id, payload) : await userApi.create(payload);
      toast.success(isEdit ? 'Đã lưu thay đổi' : 'Đã tạo tài khoản');
      onSaved(saved, isEdit ? null : saved.tempPassword);
      reset();
      onClose();
    } catch (err) {
      setServerError(errorMessage(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Sửa tài khoản' : 'Tạo tài khoản'}
      description={isEdit ? user.email : 'Hệ thống sẽ tạo mật khẩu tạm và hiện một lần sau khi lưu.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" form="user-form" loading={formState.isSubmitting}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <Input label="Họ và tên" error={formState.errors.fullName?.message} {...register('fullName')} />
        <Input label="Email" type="email" autoComplete="off" error={formState.errors.email?.message} {...register('email')} />
        <Input label="Số điện thoại" inputMode="tel" placeholder="Không bắt buộc" error={formState.errors.phone?.message} {...register('phone')} />
        <Select
          label="Vai trò"
          options={ROLE_OPTIONS}
          placeholder={isEdit ? undefined : 'Chọn vai trò'}
          disabled={isSelf}
          hint={isSelf ? 'Bạn không thể tự đổi vai trò của mình.' : undefined}
          error={formState.errors.role?.message}
          {...register('role')}
        />
        {roleValue === 'teacher' && (
          <Select label="Danh xưng" options={Object.entries(HONORIFIC_LABEL).map(([value, label]) => ({ value, label }))} placeholder="Chọn cô / thầy" hint="Hiện trong lời nhắn gửi phụ huynh, vd: Lời nhắn của cô Lan" error={formState.errors.honorific?.message} {...register('honorific')} />
        )}
        {serverError && (
          <p role="alert" className="rounded-btn bg-berry-soft px-3 py-2 text-sm text-berry">
            {serverError}
          </p>
        )}
      </form>
    </Modal>
  );
}

/* ---------- Đặt lại mật khẩu: xác nhận → server sinh mật khẩu tạm → hiện 1 lần ---------- */
function ResetPasswordDialog({ user, onClose, onDone }) {
  return (
    <ConfirmDialog
      open={!!user}
      onClose={onClose}
      title="Đặt lại mật khẩu"
      confirmLabel="Đặt lại mật khẩu"
      message={`Hệ thống sẽ tạo mật khẩu tạm cho ${user?.fullName}. Mọi thiết bị của người này bị đăng xuất và họ phải đổi mật khẩu khi đăng nhập lại.`}
      onConfirm={async () => {
        try {
          const { tempPassword } = await userApi.resetPassword(user._id).then((r) => r.data);
          toast.success('Đã đặt lại mật khẩu');
          onDone(user, tempPassword);
        } catch (e) {
          toast.error(errorMessage(e));
        }
      }}
    />
  );
}

/* ---------- Trang ---------- */
export default function UsersPage() {
  const { user: me } = useAuth();
  const { page, setPage, filters, setFilters, params } = usePagination({ role: '', isActive: '', search: '' });
  const search = useDebounce(filters.search);
  const { data, loading, error, reload } = useFetch(() => userApi.list({ ...params, search }), [params.page, params.role, params.isActive, search]);

  const [formUser, setFormUser] = useState(undefined); // undefined: đóng, null: tạo mới, object: sửa
  const [resetUser, setResetUser] = useState(null);
  const [lockUser, setLockUser] = useState(null);
  const [tempPw, setTempPw] = useState(null); // { user, password, title } – hiện đúng 1 lần

  const onSaved = (saved, tempPassword) => {
    reload();
    if (tempPassword) setTempPw({ user: saved, password: tempPassword, title: 'Mật khẩu tạm của tài khoản mới' });
  };

  const toggleLock = async () => {
    const u = lockUser;
    await userApi.setStatus(u._id, !u.isActive).then(() => {
      toast.success(u.isActive ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản');
      reload();
    }).catch((e) => toast.error(errorMessage(e)));
  };

  return (
    <>
      <PageHeader
        description="Tạo, sửa, khoá tài khoản và đặt lại mật khẩu."
        actions={
          <Button icon={Plus} onClick={() => setFormUser(null)}>
            Tạo tài khoản
          </Button>
        }
      />

      {/* Mobile: ô tìm full hàng, 2 select lọc cạnh nhau */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-[1fr_180px_180px]">
        <SearchInput className="col-span-2 md:col-span-1" value={filters.search} onChange={(v) => setFilters({ search: v })} placeholder="Tìm theo tên, email, số điện thoại" />
        <Select value={filters.role} onChange={(e) => setFilters({ role: e.target.value })} options={ROLE_OPTIONS} placeholder="Mọi vai trò" aria-label="Lọc vai trò" />
        <Select
          value={filters.isActive}
          onChange={(e) => setFilters({ isActive: e.target.value })}
          options={[
            { value: 'true', label: 'Đang hoạt động' },
            { value: 'false', label: 'Bị khoá' },
          ]}
          placeholder="Mọi trạng thái"
          aria-label="Lọc trạng thái"
        />
      </div>

      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      <DataTable
        loading={loading}
        rows={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyTitle={filters.search || filters.role || filters.isActive ? 'Không có tài khoản khớp bộ lọc' : 'Chưa có tài khoản nào'}
        emptyDescription={!filters.search && !filters.role && !filters.isActive ? 'Tạo tài khoản đầu tiên cho hiệu trưởng hoặc giáo viên.' : undefined}
        columns={[
          {
            key: 'fullName',
            title: 'Người dùng',
            render: (u) => (
              <div className="flex items-center gap-3">
                <Avatar src={u.avatar} name={u.fullName} role={u.role} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {u.fullName}
                    {u._id === me?._id && <span className="ml-1 text-xs text-ink-soft">(bạn)</span>}
                  </p>
                  <p className="truncate text-xs text-ink-soft">{u.email}</p>
                </div>
              </div>
            ),
          },
          { key: 'phone', title: 'Số điện thoại', render: (u) => <span className="tabular-nums">{u.phone || '—'}</span> },
          { key: 'role', title: 'Vai trò', card: 'chip', render: (u) => <RoleChip role={u.role} /> },
          {
            key: 'isActive',
            title: 'Trạng thái',
            card: 'chip',
            render: (u) => (u.isActive ? <Chip tone="leaf">Hoạt động</Chip> : <Chip tone="berry" icon={Lock}>Bị khoá</Chip>),
          },
          {
            key: 'lastLoginAt',
            title: 'Đăng nhập',
            render: (u) =>
              u.lastLoginAt ? (
                <span className="text-ink-soft" title={formatDateTime(u.lastLoginAt)}>
                  {fromNow(u.lastLoginAt)}
                </span>
              ) : (
                <span className="text-ink-soft">Chưa</span>
              ),
          },
          {
            key: 'actions',
            title: '',
            align: 'right',
            actions: (u) => {
              const isMe = u._id === me?._id;
              return [
                { key: 'edit', label: 'Sửa', icon: Pencil, onClick: () => setFormUser(u) },
                { key: 'reset', label: 'Đặt lại mật khẩu', icon: KeyRound, onClick: () => setResetUser(u) },
                {
                  key: 'lock',
                  label: u.isActive ? 'Khoá' : 'Mở khoá',
                  tooltip: isMe ? 'Không thể tự khoá mình' : undefined,
                  icon: u.isActive ? Lock : LockOpen,
                  iconClassName: u.isActive ? undefined : 'text-leaf',
                  danger: u.isActive,
                  disabled: isMe,
                  onClick: () => setLockUser(u),
                },
              ];
            },
          },
        ]}
      />

      <UserFormModal open={formUser !== undefined} user={formUser || null} isSelf={formUser?._id === me?._id} onClose={() => setFormUser(undefined)} onSaved={onSaved} />
      <ResetPasswordDialog
        user={resetUser}
        onClose={() => setResetUser(null)}
        onDone={(u, password) => {
          setResetUser(null);
          setTempPw({ user: u, password, title: 'Mật khẩu tạm mới' });
        }}
      />
      <TempPasswordModal open={!!tempPw} onClose={() => setTempPw(null)} user={tempPw?.user} password={tempPw?.password} title={tempPw?.title} />
      <ConfirmDialog
        open={!!lockUser}
        onClose={() => setLockUser(null)}
        onConfirm={toggleLock}
        danger={lockUser?.isActive}
        title={lockUser?.isActive ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
        confirmLabel={lockUser?.isActive ? 'Khoá tài khoản' : 'Mở khoá'}
        message={
          lockUser?.isActive
            ? `${lockUser?.fullName} sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập được cho đến khi mở khoá.`
            : `${lockUser?.fullName} sẽ đăng nhập lại được bình thường.`
        }
      />
    </>
  );
}
