import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { ROLE_HOME } from '../utils/constants.js';
import { Button } from '../components/ui/index.js';

export default function Forbidden403() {
  const { role } = useAuth();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-peach-soft text-peach">
        <ShieldAlert size={32} strokeWidth={1.5} aria-hidden />
      </span>
      <h1>Bạn không có quyền xem trang này</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">Trang này dành cho vai trò khác. Quay về trang chủ của bạn để tiếp tục.</p>
      <Button className="mt-6" onClick={() => (window.location.href = role ? ROLE_HOME[role] : '/login')}>
        Về trang chủ
      </Button>
      <Link to="/login" className="mt-3 text-sm text-sky hover:underline">
        Đăng nhập tài khoản khác
      </Link>
    </main>
  );
}
