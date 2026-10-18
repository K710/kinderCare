import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from './ProtectedRoute.jsx';
import { PATHS } from './paths.js';
import { ROLE_HOME } from '../utils/constants.js';
import { useAuthStore } from '../stores/auth.store.js';
import LoginPage from '../features/auth/LoginPage.jsx';
import ChangePasswordPage from '../features/auth/ChangePasswordPage.jsx';
import Forbidden403 from '../pages/Forbidden403.jsx';
import NotFound404 from '../pages/NotFound404.jsx';
import { StaffLayout } from '../components/layout/StaffLayout.jsx';
import { ParentLayout } from '../components/layout/ParentLayout.jsx';
import ComingSoon from '../pages/ComingSoon.jsx';
import AdminDashboardPage from '../features/admin/DashboardPage.jsx';
import UsersPage from '../features/admin/UsersPage.jsx';
import SchoolYearsPage from '../features/admin/SchoolYearsPage.jsx';
import AuditLogsPage from '../features/admin/AuditLogsPage.jsx';

// "/" → trang chủ theo vai trò (hoặc /login)
function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  return <Navigate to={token && user ? ROLE_HOME[user.role] : PATHS.login} replace />;
}

const soon = (title) => ({ element: <ComingSoon title={title} /> });

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    element: <GuestRoute />,
    children: [{ path: PATHS.login, element: <LoginPage /> }],
  },
  // Bắt buộc đổi mật khẩu (mọi vai trò)
  {
    element: <ProtectedRoute />,
    children: [{ path: PATHS.changePassword, element: <ChangePasswordPage /> }],
  },

  // Admin
  {
    element: <ProtectedRoute roles={['admin']} />,
    children: [
      {
        path: PATHS.admin.root,
        element: <StaffLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'school-years', element: <SchoolYearsPage /> },
          { path: 'audit-logs', element: <AuditLogsPage /> },
          { path: 'notifications', ...soon('Thông báo') },
        ],
      },
    ],
  },

  // Hiệu trưởng
  {
    element: <ProtectedRoute roles={['principal']} />,
    children: [
      {
        path: PATHS.principal.root,
        element: <StaffLayout />,
        children: [
          { index: true, ...soon('Tổng quan') },
          { path: 'classes', ...soon('Lớp học') },
          { path: 'students', ...soon('Học sinh') },
          { path: 'teachers', ...soon('Giáo viên') },
          { path: 'menus', ...soon('Thực đơn') },
          { path: 'lesson-plans', ...soon('Kế hoạch giảng dạy') },
          { path: 'tuitions', ...soon('Học phí') },
          { path: 'reconcile', ...soon('Đối soát') },
          { path: 'notifications', ...soon('Thông báo') },
        ],
      },
    ],
  },

  // Giáo viên
  {
    element: <ProtectedRoute roles={['teacher']} />,
    children: [
      {
        path: PATHS.teacher.root,
        element: <StaffLayout />,
        children: [
          { index: true, ...soon('Tổng quan') },
          { path: 'class', ...soon('Lớp của tôi') },
          { path: 'attendance', ...soon('Điểm danh') },
          { path: 'daily-reports', ...soon('Nhận xét ngày') },
          { path: 'albums', ...soon('Album ảnh') },
          { path: 'lesson-plans', ...soon('Kế hoạch giảng dạy') },
          { path: 'health', ...soon('Chiều cao, cân nặng') },
          { path: 'leave-requests', ...soon('Đơn xin nghỉ') },
          { path: 'medicine-notes', ...soon('Dặn thuốc') },
          { path: 'chat', ...soon('Tin nhắn') },
        ],
      },
    ],
  },

  // Phụ huynh (mobile-first)
  {
    element: <ProtectedRoute roles={['parent']} />,
    children: [
      {
        path: PATHS.parent.root,
        element: <ParentLayout />,
        children: [
          { index: true, ...soon('Hôm nay') },
          { path: 'calendar', ...soon('Lịch') },
          { path: 'chat', ...soon('Tin nhắn') },
          { path: 'tuitions', ...soon('Học phí') },
          { path: 'account', ...soon('Tài khoản') },
          { path: 'albums', ...soon('Album ảnh') },
          { path: 'menu', ...soon('Thực đơn') },
          { path: 'growth', ...soon('Tăng trưởng') },
          { path: 'leave-requests', ...soon('Đơn xin nghỉ') },
          { path: 'medicine-notes', ...soon('Dặn thuốc') },
          { path: 'notifications', ...soon('Thông báo') },
        ],
      },
    ],
  },

  { path: PATHS.forbidden, element: <Forbidden403 /> },
  { path: '*', element: <NotFound404 /> },
]);
