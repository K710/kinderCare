import {
  LayoutDashboard, Users, CalendarRange, ScrollText, School, Baby, GraduationCap, UtensilsCrossed, BookOpen, Wallet,
  Scale, Bell, ClipboardCheck, NotebookPen, Images, HeartPulse, FileText, Pill, MessageCircle, Home, CalendarDays, UserRound,
} from 'lucide-react';
import { PATHS } from './paths.js';

// Menu thanh bên theo vai trò (viết thường kiểu câu)
export const MENUS = {
  admin: [
    { label: 'Tổng quan', to: PATHS.admin.root, icon: LayoutDashboard, end: true },
    { label: 'Tài khoản', to: PATHS.admin.users, icon: Users },
    { label: 'Năm học', to: PATHS.admin.schoolYears, icon: CalendarRange },
    { label: 'Nhật ký hệ thống', to: PATHS.admin.auditLogs, icon: ScrollText },
  ],
  principal: [
    { label: 'Tổng quan', to: PATHS.principal.root, icon: LayoutDashboard, end: true },
    { label: 'Lớp học', to: PATHS.principal.classes, icon: School },
    { label: 'Học sinh', to: PATHS.principal.students, icon: Baby },
    { label: 'Giáo viên', to: PATHS.principal.teachers, icon: GraduationCap },
    { label: 'Thực đơn', to: PATHS.principal.menus, icon: UtensilsCrossed },
    { label: 'Kế hoạch giảng dạy', to: PATHS.principal.lessonPlans, icon: BookOpen },
    { label: 'Học phí', to: PATHS.principal.tuitions, icon: Wallet },
    { label: 'Đối soát', to: PATHS.principal.reconcile, icon: Scale },
    { label: 'Thông báo', to: PATHS.principal.notifications, icon: Bell },
  ],
  teacher: [
    { label: 'Tổng quan', to: PATHS.teacher.root, icon: LayoutDashboard, end: true },
    { label: 'Lớp của tôi', to: PATHS.teacher.myClass, icon: School },
    { label: 'Điểm danh', to: PATHS.teacher.attendance, icon: ClipboardCheck },
    { label: 'Nhận xét ngày', to: PATHS.teacher.reports, icon: NotebookPen },
    { label: 'Album ảnh', to: PATHS.teacher.albums, icon: Images },
    { label: 'Kế hoạch giảng dạy', to: PATHS.teacher.lessonPlans, icon: BookOpen },
    { label: 'Chiều cao, cân nặng', to: PATHS.teacher.health, icon: HeartPulse },
    { label: 'Đơn xin nghỉ', to: PATHS.teacher.leaveRequests, icon: FileText },
    { label: 'Dặn thuốc', to: PATHS.teacher.medicineNotes, icon: Pill },
    { label: 'Tin nhắn', to: PATHS.teacher.chat, icon: MessageCircle },
  ],
};

// Tab dưới cho phụ huynh (mobile): Hôm nay, Lịch, Tin nhắn, Học phí, Tài khoản
export const PARENT_TABS = [
  { label: 'Hôm nay', to: PATHS.parent.root, icon: Home, end: true },
  { label: 'Lịch', to: PATHS.parent.calendar, icon: CalendarDays },
  { label: 'Tin nhắn', to: PATHS.parent.chat, icon: MessageCircle },
  { label: 'Học phí', to: PATHS.parent.tuitions, icon: Wallet },
  { label: 'Tài khoản', to: PATHS.parent.account, icon: UserRound },
];

// Tìm tiêu đề trang theo đường dẫn hiện tại
export function titleFor(role, pathname) {
  const items = role === 'parent' ? PARENT_TABS : MENUS[role] || [];
  const exact = items.find((m) => m.to === pathname);
  if (exact) return exact.label;
  const prefix = items.filter((m) => !m.end && pathname.startsWith(m.to)).sort((a, b) => b.to.length - a.to.length)[0];
  return prefix?.label || 'KinderCare';
}
