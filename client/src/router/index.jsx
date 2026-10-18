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
import AdminDashboardPage from '../features/admin/DashboardPage.jsx';
import UsersPage from '../features/admin/UsersPage.jsx';
import SchoolYearsPage from '../features/admin/SchoolYearsPage.jsx';
import AuditLogsPage from '../features/admin/AuditLogsPage.jsx';
import NotificationsPage from '../features/notifications/NotificationsPage.jsx';
import PrincipalDashboardPage from '../features/principal/DashboardPage.jsx';
import ClassesPage from '../features/principal/ClassesPage.jsx';
import ClassDetailPage from '../features/principal/ClassDetailPage.jsx';
import StudentsPage from '../features/principal/StudentsPage.jsx';
import TeachersPage from '../features/principal/TeachersPage.jsx';
import MenusPage from '../features/principal/MenusPage.jsx';
import LessonPlansPage from '../features/principal/LessonPlansPage.jsx';
import TuitionsPage from '../features/principal/TuitionsPage.jsx';
import ReconcilePage from '../features/principal/ReconcilePage.jsx';
import TeacherDashboardPage from '../features/teacher/DashboardPage.jsx';
import MyClassPage from '../features/teacher/MyClassPage.jsx';
import AttendancePage from '../features/teacher/AttendancePage.jsx';
import DailyReportsPage from '../features/teacher/DailyReportsPage.jsx';
import AlbumsPage from '../features/teacher/AlbumsPage.jsx';
import TeacherLessonPlansPage from '../features/teacher/LessonPlansPage.jsx';
import HealthPage from '../features/teacher/HealthPage.jsx';
import LeaveRequestsPage from '../features/teacher/LeaveRequestsPage.jsx';
import MedicineNotesPage from '../features/teacher/MedicineNotesPage.jsx';
import ChatPage from '../features/chat/ChatPage.jsx';
import TodayPage from '../features/parent/TodayPage.jsx';
import CalendarPage from '../features/parent/CalendarPage.jsx';
import ParentTuitionsPage from '../features/parent/TuitionsPage.jsx';
import PaymentPage, { TuitionReceiptPage } from '../features/parent/PaymentPage.jsx';
import AccountPage from '../features/parent/AccountPage.jsx';
import { ParentAlbumsPage, ParentMenuPage, ParentGrowthPage, ParentLeaveRequestsPage, ParentMedicineNotesPage } from '../features/parent/MorePages.jsx';

// "/" → trang chủ theo vai trò (hoặc /login)
function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  return <Navigate to={token && user ? ROLE_HOME[user.role] : PATHS.login} replace />;
}

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
          { path: 'notifications', element: <NotificationsPage /> },
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
          { index: true, element: <PrincipalDashboardPage /> },
          { path: 'classes', element: <ClassesPage /> },
          { path: 'classes/:id', element: <ClassDetailPage /> },
          { path: 'students', element: <StudentsPage /> },
          { path: 'teachers', element: <TeachersPage /> },
          { path: 'menus', element: <MenusPage /> },
          { path: 'lesson-plans', element: <LessonPlansPage /> },
          { path: 'tuitions', element: <TuitionsPage /> },
          { path: 'reconcile', element: <ReconcilePage /> },
          { path: 'notifications', element: <NotificationsPage /> },
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
          { index: true, element: <TeacherDashboardPage /> },
          { path: 'class', element: <MyClassPage /> },
          { path: 'attendance', element: <AttendancePage /> },
          { path: 'daily-reports', element: <DailyReportsPage /> },
          { path: 'albums', element: <AlbumsPage /> },
          { path: 'lesson-plans', element: <TeacherLessonPlansPage /> },
          { path: 'health', element: <HealthPage /> },
          { path: 'leave-requests', element: <LeaveRequestsPage /> },
          { path: 'medicine-notes', element: <MedicineNotesPage /> },
          { path: 'chat', element: <ChatPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
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
          { index: true, element: <TodayPage /> },
          { path: 'calendar', element: <CalendarPage /> },
          { path: 'chat', element: <ChatPage /> },
          { path: 'tuitions', element: <ParentTuitionsPage /> },
          { path: 'tuitions/:id', element: <TuitionReceiptPage /> },
          { path: 'tuitions/:id/pay', element: <PaymentPage /> },
          { path: 'account', element: <AccountPage /> },
          { path: 'albums', element: <ParentAlbumsPage /> },
          { path: 'menu', element: <ParentMenuPage /> },
          { path: 'growth', element: <ParentGrowthPage /> },
          { path: 'leave-requests', element: <ParentLeaveRequestsPage /> },
          { path: 'leave-requests/:id', element: <ParentLeaveRequestsPage /> },
          { path: 'medicine-notes', element: <ParentMedicineNotesPage /> },
          { path: 'medicine-notes/:id', element: <ParentMedicineNotesPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
        ],
      },
    ],
  },

  { path: PATHS.forbidden, element: <Forbidden403 /> },
  { path: '*', element: <NotFound404 /> },
]);
