// Enum dùng chung giữa model, validator, service
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  TEACHER: 'teacher',
  PARENT: 'parent',
});
export const ROLE_LIST = Object.values(ROLES);

export const AGE_GROUPS = ['nha_tre', 'mam', 'choi', 'la'];
export const GENDERS = ['male', 'female'];
export const STUDENT_STATUS = ['active', 'graduated', 'left'];
export const ATTENDANCE_STATUS = ['present', 'absent', 'late', 'excused'];
export const APPROVAL_STATUS = ['draft', 'pending', 'approved', 'rejected'];
export const LEAVE_STATUS = ['pending', 'approved', 'rejected'];
export const MEDICINE_STATUS = ['pending', 'confirmed', 'done', 'cancelled'];
export const TUITION_STATUS = ['unpaid', 'partial', 'paid', 'overdue'];
export const PAYMENT_STATUS = ['matched', 'unmatched', 'manual'];
export const NOTIFICATION_TYPES = ['system', 'school', 'class', 'payment', 'leave', 'medicine', 'report'];
export const NOTIFICATION_SCOPES = ['all', 'role', 'class', 'user'];

export const MAX_REFRESH_TOKENS = 5; // số thiết bị đăng nhập đồng thời
export const REFRESH_COOKIE = 'kc_refresh';
export const TIMEZONE = 'Asia/Ho_Chi_Minh';
