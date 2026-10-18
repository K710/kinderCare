import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { Button, Input } from '../../components/ui/index.js';
import { authApi } from '../../api/auth.api.js';
import { errorMessage } from '../../api/axios.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { toast } from '../../stores/toast.store.js';
import { ROLE_HOME } from '../../utils/constants.js';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại (mật khẩu tạm).'),
    newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự.').max(72),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, { message: 'Hai mật khẩu chưa khớp.', path: ['confirm'] })
  .refine((d) => d.newPassword !== d.currentPassword, { message: 'Mật khẩu mới phải khác mật khẩu hiện tại.', path: ['newPassword'] });

// Bắt buộc đổi mật khẩu sau lần đăng nhập đầu / sau khi được đặt lại. Đổi xong server đăng xuất mọi thiết bị → đăng nhập lại.
export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(schema), defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });

  const onSubmit = async (v) => {
    setServerError('');
    try {
      await authApi.changePassword(v.currentPassword, v.newPassword);
      toast.success('Đã đổi mật khẩu, mời đăng nhập lại');
      clearSession();
      navigate('/login', { replace: true, state: { from: { pathname: ROLE_HOME[user?.role] || '/' } } });
    } catch (err) {
      setServerError(errorMessage(err));
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-sun-soft text-[#8A6100]">
            <KeyRound size={28} strokeWidth={1.75} aria-hidden />
          </span>
          <h1 className="text-2xl">Đổi mật khẩu để tiếp tục</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Xin chào {user?.fullName}. Bạn đang dùng mật khẩu tạm, hãy đặt mật khẩu riêng trước khi vào ứng dụng.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-6" noValidate>
          <Input label="Mật khẩu hiện tại" type="password" autoComplete="current-password" error={formState.errors.currentPassword?.message} {...register('currentPassword')} />
          <Input label="Mật khẩu mới" type="password" autoComplete="new-password" error={formState.errors.newPassword?.message} {...register('newPassword')} />
          <Input label="Nhập lại mật khẩu mới" type="password" autoComplete="new-password" error={formState.errors.confirm?.message} {...register('confirm')} />
          {serverError && (
            <p role="alert" className="rounded-btn bg-berry-soft px-3 py-2 text-sm text-berry">
              {serverError}
            </p>
          )}
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Đổi mật khẩu
          </Button>
        </form>
      </div>
    </main>
  );
}
