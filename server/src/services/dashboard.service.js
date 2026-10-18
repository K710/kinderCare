import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import { Class } from '../models/Class.js';
import { Attendance } from '../models/Attendance.js';
import { DailyReport } from '../models/DailyReport.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { MedicineNote } from '../models/MedicineNote.js';
import { Menu } from '../models/Menu.js';
import { LessonPlan } from '../models/LessonPlan.js';
import { Tuition } from '../models/Tuition.js';
import { AuditLog } from '../models/AuditLog.js';
import { todayKey, monthKey } from '../utils/date.js';
import { summary as tuitionSummary } from './tuition.service.js';
import { unreadCount as notifUnread } from './notification.service.js';
import { unreadTotal as messageUnread } from './message.service.js';

// Đếm điểm danh hôm nay theo trạng thái cho 1 tập lớp (null = toàn trường)
async function attendanceToday(classIds) {
  const today = todayKey();
  const match = { date: today };
  if (classIds) match.class = { $in: classIds };
  const rows = await Attendance.aggregate([{ $match: match }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of rows) counts[r._id] = r.n;
  const studentFilter = { status: 'active' };
  if (classIds) studentFilter.class = { $in: classIds };
  else studentFilter.class = { $ne: null };
  const total = await Student.countDocuments(studentFilter);
  const marked = Object.values(counts).reduce((a, b) => a + b, 0);
  return { date: today, total, marked, unmarked: Math.max(0, total - marked), ...counts };
}

export async function principal() {
  const month = monthKey();
  const [students, teachers, classes, attendance, tuition, leave, medicine, menus, plans] = await Promise.all([
    Student.countDocuments({ status: 'active' }),
    User.countDocuments({ role: 'teacher', isActive: true }),
    Class.countDocuments({ isActive: true }),
    attendanceToday(null),
    tuitionSummary({ month }),
    LeaveRequest.countDocuments({ status: 'pending' }),
    MedicineNote.countDocuments({ status: 'pending' }),
    Menu.countDocuments({ status: 'pending' }),
    LessonPlan.countDocuments({ status: 'pending' }),
  ]);
  return {
    totals: { students, teachers, classes },
    attendanceToday: attendance,
    tuitionThisMonth: tuition,
    pending: { leaveRequests: leave, medicineNotes: medicine, menus, lessonPlans: plans },
  };
}

export async function teacher(user) {
  const classes = await Class.find({ teachers: user.id, isActive: true }).select('name ageGroup room').lean();
  const classIds = classes.map((c) => c._id);
  const today = todayKey();

  const [studentCounts, attendance, reportsToday, leave, medicine] = await Promise.all([
    Student.aggregate([{ $match: { class: { $in: classIds }, status: 'active' } }, { $group: { _id: '$class', n: { $sum: 1 } } }]),
    attendanceToday(classIds),
    DailyReport.countDocuments({ class: { $in: classIds }, date: today }),
    LeaveRequest.countDocuments({ class: { $in: classIds }, status: 'pending' }),
    MedicineNote.countDocuments({ class: { $in: classIds }, status: { $in: ['pending', 'confirmed'] }, fromDate: { $lte: today }, toDate: { $gte: today } }),
  ]);
  const countMap = new Map(studentCounts.map((s) => [s._id.toString(), s.n]));
  return {
    classes: classes.map((c) => ({ ...c, studentCount: countMap.get(c._id.toString()) || 0 })),
    attendanceToday: attendance,
    dailyReportsToday: { done: reportsToday, total: attendance.total },
    pending: { leaveRequests: leave, medicineNotesToday: medicine },
    unreadMessages: await messageUnread(user),
    unreadNotifications: await notifUnread(user),
  };
}

export async function parent(user) {
  const today = todayKey();
  const kids = await Student.find({ parents: user.id, status: 'active' }).select('fullName nickname avatar class').populate('class', 'name').lean();
  const kidIds = kids.map((k) => k._id);
  const [att, reports, tuitions] = await Promise.all([
    Attendance.find({ student: { $in: kidIds }, date: today }).lean(),
    DailyReport.find({ student: { $in: kidIds }, date: today }).select('student mood meals sleep comment parentSeenAt').lean(),
    Tuition.find({ student: { $in: kidIds }, status: { $in: ['unpaid', 'partial', 'overdue'] } }).select('student month amount paidAmount status dueDate paymentCode').lean(),
  ]);
  const children = kids.map((k) => {
    const id = k._id.toString();
    const due = tuitions.filter((t) => t.student.toString() === id);
    return {
      ...k,
      attendanceToday: att.find((a) => a.student.toString() === id) || null,
      reportToday: reports.find((r) => r.student.toString() === id) || null,
      tuitionDue: { count: due.length, amount: due.reduce((s, t) => s + (t.amount - t.paidAmount), 0), items: due },
    };
  });
  return {
    date: today,
    children,
    unreadNotifications: await notifUnread(user),
    unreadMessages: await messageUnread(user),
  };
}

export async function admin() {
  const [byRole, locked, recentLogins, auditToday] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
    User.countDocuments({ isActive: false }),
    User.find({ lastLoginAt: { $ne: null } }).select('fullName email role lastLoginAt').sort('-lastLoginAt').limit(10).lean(),
    AuditLog.countDocuments({ createdAt: { $gte: todayKey() } }),
  ]);
  const roles = { admin: 0, principal: 0, teacher: 0, parent: 0 };
  for (const r of byRole) roles[r._id] = r.n;
  return { usersByRole: roles, totalUsers: Object.values(roles).reduce((a, b) => a + b, 0), lockedUsers: locked, recentLogins, auditLogsToday: auditToday };
}
