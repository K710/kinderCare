import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, KeyRound, LogOut, Bell, ChevronRight, Baby } from 'lucide-react';
import { authApi } from '../../api/auth.api.js';
import { uploadApi } from '../../api/upload.api.js';
import { errorMessage } from '../../api/axios.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { toast } from '../../stores/toast.store.js';
import { Avatar, Button, Input, Modal } from '../../components/ui/index.js';
import { FormError } from '../../components/shared/FormError.jsx';
import { PATHS } from '../../router/paths.js';
import { formatAge } from '../../utils/format.js';
import { compressImage, validateImage, ACCEPT_IMAGES } from '../../utils/image.js';

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên tối thiểu 2 ký tự.').max(100),
  phone: z.union([z.string().trim().regex(/^(0|\+84)\d{9,10}$/, 'Số điện thoại chưa đúng, cần 10 chữ số.'), z.literal('')]),
});
const pwSchema = z
  .object({ currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại.'), newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự.').max(72), confirm: z.string() })
  .refine((d) => d.newPassword === d.confirm, { message: 'Hai mật khẩu chưa khớp.', path: ['confirm'] })
  .refine((d) => d.newPassword !== d.currentPassword, { message: 'Mật khẩu mới phải khác mật khẩu hiện tại.', path: ['newPassword'] });

function PasswordModal({ open, onClose }) {
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clearSession);
  const [err, setErr] = useState('');
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(pwSchema), defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });
  const submit = async (v) => {
    setErr('');
    try {
      await authApi.changePassword(v.currentPassword, v.newPassword);
      toast.success('Đã đổi mật khẩu, mời đăng nhập lại');
      clearSession();
      navigate('/login', { replace: true });
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Đổi mật khẩu" description="Đổi xong, mọi thiết bị sẽ đăng xuất và cần đăng nhập lại." footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button type="submit" form="pw-form" loading={formState.isSubmitting}>Đổi mật khẩu</Button></>}>
      <form id="pw-form" onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
        <Input label="Mật khẩu hiện tại" type="password" autoComplete="current-password" error={formState.errors.currentPassword?.message} {...register('currentPassword')} />
        <Input label="Mật khẩu mới" type="password" autoComplete="new-password" error={formState.errors.newPassword?.message} {...register('newPassword')} />
        <Input label="Nhập lại mật khẩu mới" type="password" autoComplete="new-password" error={formState.errors.confirm?.message} {...register('confirm')} />
        <FormError message={err} />
      </form>
    </Modal>
  );
}

// Tài khoản PH: ảnh đại diện, tên, SĐT, danh sách con, đổi mật khẩu, đăng xuất
export default function AccountPage() {
  const { user, logout } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const [pw, setPw] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(profileSchema), values: { fullName: user?.fullName || '', phone: user?.phone || '' } });

  const save = async (v) => {
    setErr('');
    try {
      const payload = { fullName: v.fullName };
      if (v.phone) payload.phone = v.phone;
      const updated = await authApi.updateMe(payload);
      setUser({ ...user, ...updated, children: user.children });
      toast.success('Đã lưu thông tin');
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  const changeAvatar = async (file) => {
    if (!file) return;
    const bad = validateImage(file);
    if (bad) return toast.error(bad);
    setUploading(true);
    try {
      const { url } = await uploadApi.image(await compressImage(file, { maxSize: 800 }));
      const updated = await authApi.updateMe({ avatar: url });
      setUser({ ...user, ...updated, children: user.children });
      toast.success('Đã đổi ảnh đại diện');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };
  const onLogout = async () => {
    await logout();
    toast.success('Đã đăng xuất');
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer">
            <Avatar src={user?.avatar} name={user?.fullName} role="parent" size="xl" />
            <span className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-ink-soft"><Camera size={16} aria-hidden /></span>
            <input type="file" accept={ACCEPT_IMAGES} className="sr-only" onChange={(e) => { changeAvatar(e.target.files[0]); e.target.value = ''; }} disabled={uploading} aria-label="Đổi ảnh đại diện" />
          </label>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">{user?.fullName}</p>
            <p className="truncate text-sm text-ink-soft">{user?.email}</p>
            {uploading && <p className="text-xs text-ink-soft">Đang tải ảnh…</p>}
          </div>
        </div>
        <form onSubmit={handleSubmit(save)} className="mt-4 space-y-3" noValidate>
          <Input label="Họ và tên" error={formState.errors.fullName?.message} {...register('fullName')} />
          <Input label="Số điện thoại" inputMode="tel" error={formState.errors.phone?.message} {...register('phone')} />
          <FormError message={err} />
          <Button type="submit" loading={formState.isSubmitting} disabled={!formState.isDirty} className="w-full md:w-auto">Lưu thông tin</Button>
        </form>
      </section>

      <section className="card p-4">
        <h2 className="text-base">Con của tôi</h2>
        {user?.children?.length ? (
          <ul className="mt-2 divide-y divide-line">
            {user.children.map((c) => (
              <li key={c._id} className="flex items-center gap-3 py-2.5">
                <Avatar src={c.avatar} name={c.fullName} />
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{c.fullName}{c.nickname ? ` (${c.nickname})` : ''}</p><p className="text-xs text-ink-soft">{c.class?.name || 'Chưa xếp lớp'} · {formatAge(c.dateOfBirth)}</p></div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft"><Baby size={16} aria-hidden /> Chưa có bé nào được gắn với tài khoản.</p>
        )}
      </section>

      <section className="card divide-y divide-line">
        <Link to={PATHS.parent.notifications} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-paper"><Bell size={18} className="text-ink-soft" aria-hidden /><span className="flex-1">Thông báo</span><ChevronRight size={16} className="text-ink-soft" aria-hidden /></Link>
        <button type="button" onClick={() => setPw(true)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-paper"><KeyRound size={18} className="text-ink-soft" aria-hidden /><span className="flex-1">Đổi mật khẩu</span><ChevronRight size={16} className="text-ink-soft" aria-hidden /></button>
        <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-berry hover:bg-paper"><LogOut size={18} aria-hidden /><span className="flex-1">Đăng xuất</span></button>
      </section>
      <PasswordModal open={pw} onClose={() => setPw(false)} />
    </div>
  );
}
