import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { PageSkeleton } from '../components/ui/Skeleton.jsx';
import { PATHS } from './paths.js';

// Chờ bootstrap xong → chưa đăng nhập về /login (nhớ trang đích) → sai vai trò về /403
export function ProtectedRoute({ roles }) {
  const { isReady, isAuthenticated, role, user } = useAuth();
  const location = useLocation();

  if (!isReady) return <PageSkeleton />;
  if (!isAuthenticated) return <Navigate to={PATHS.login} state={{ from: location }} replace />;
  // Đang dùng mật khẩu tạm → phải đổi trước khi vào app
  if (user?.mustChangePassword && location.pathname !== PATHS.changePassword) return <Navigate to={PATHS.changePassword} replace />;
  if (roles && !roles.includes(role)) return <Navigate to={PATHS.forbidden} replace />;
  return <Outlet />;
}

// Đã đăng nhập thì không vào lại /login
export function GuestRoute() {
  const { isReady, isAuthenticated, role, user } = useAuth();
  if (!isReady) return <PageSkeleton />;
  if (isAuthenticated) return <Navigate to={user?.mustChangePassword ? PATHS.changePassword : `/${role}`} replace />;
  return <Outlet />;
}
