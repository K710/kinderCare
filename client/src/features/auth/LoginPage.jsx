import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sprout } from 'lucide-react';
import { Button, Input } from '../../components/ui/index.js';
import { useAuth } from '../../hooks/useAuth.js';
import { errorMessage } from '../../api/axios.js';
import { ROLE_HOME } from '../../utils/constants.js';
import { PATHS } from '../../router/paths.js';

const schema = z.object({
  identifier: z.string().trim().min(1, 'Nhập email hoặc số điện thoại'),
  password: z.string().min(1, 'Nhập mật khẩu'),
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const user = await login(values.identifier, values.password);
      if (user.mustChangePassword) return navigate(PATHS.changePassword, { replace: true });
      const from = location.state?.from?.pathname;
      // Chỉ quay lại trang đích nếu đúng khu vực của vai trò
      navigate(from && from.startsWith(ROLE_HOME[user.role]) ? from : ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      const code = err?.response?.data?.code;
      setServerError(
        code === 'LOGIN_LOCKED'
          ? 'Tài khoản tạm khoá do đăng nhập sai nhiều lần. Thử lại sau 15 phút.'
          : code === 'ACCOUNT_LOCKED'
            ? 'Tài khoản đã bị khoá. Liên hệ nhà trường để được hỗ trợ.'
            : errorMessage(err, 'Email/số điện thoại hoặc mật khẩu chưa đúng.'),
      );
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-leaf-soft text-leaf">
            <Sprout size={28} strokeWidth={1.75} aria-hidden />
          </span>
          <h1 className="text-2xl">KinderCare</h1>
          <p className="mt-1 text-sm text-ink-soft">Sổ liên lạc mầm non</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-6" noValidate>
          <Input
            label="Email hoặc số điện thoại"
            autoComplete="username"
            inputMode="email"
            placeholder="vd: 0901234567"
            error={formState.errors.identifier?.message}
            {...register('identifier')}
          />
          <Input
            label="Mật khẩu"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            error={formState.errors.password?.message}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="touch flex items-center justify-center rounded-btn text-ink-soft hover:text-ink"
                aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPw ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
              </button>
            }
            {...register('password')}
          />

          {serverError && (
            <p role="alert" className="rounded-btn bg-berry-soft px-3 py-2 text-sm text-berry">
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Đăng nhập
          </Button>
          <p className="text-center text-xs text-ink-soft">Quên mật khẩu? Liên hệ nhà trường để được cấp lại.</p>
        </form>
      </div>
    </main>
  );
}
