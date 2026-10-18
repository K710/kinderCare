import { Notification } from '../models/Notification.js';
import { Class } from '../models/Class.js';
import { Student } from '../models/Student.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildPagination } from '../utils/paginate.js';
import { ROLES } from '../config/constants.js';
import { emitToUsers, emitToClass, emitToRole, emitToAll } from '../sockets/emitter.js';

// Lớp liên quan tới user để nhận thông báo scope=class
async function userClassIds(user) {
  if (user.role === ROLES.TEACHER) {
    return (await Class.find({ teachers: user.id, isActive: true }).select('_id').lean()).map((c) => c._id);
  }
  if (user.role === ROLES.PARENT) {
    const kids = await Student.find({ parents: user.id, status: 'active', class: { $ne: null } }).select('class').lean();
    return [...new Set(kids.map((k) => k.class.toString()))];
  }
  return [];
}

// Điều kiện "thông báo dành cho tôi"
async function mineFilter(user) {
  const classes = await userClassIds(user);
  return {
    $or: [
      { scope: 'all' },
      { scope: 'role', targetRole: user.role },
      { scope: 'class', targetClass: { $in: classes } },
      { scope: 'user', targetUsers: user.id },
    ],
  };
}

export async function listMine(user, query) {
  const pg = parsePagination(query, { defaultLimit: 20 });
  const filter = await mineFilter(user);
  if (query.unread) filter.readBy = { $ne: user.id };
  const [docs, total] = await Promise.all([
    Notification.find(filter).populate('sender', 'fullName avatar role').sort('-createdAt').skip(pg.skip).limit(pg.limit).lean(),
    Notification.countDocuments(filter),
  ]);
  // Trả cờ isRead thay vì lộ toàn bộ readBy
  const items = docs.map(({ readBy, ...n }) => ({ ...n, isRead: readBy.some((id) => id.equals(user.id)) }));
  return { items, pagination: buildPagination(pg, total) };
}

export async function unreadCount(user) {
  const filter = await mineFilter(user);
  filter.readBy = { $ne: user.id };
  return Notification.countDocuments(filter);
}

export async function markRead(user, id) {
  const filter = { _id: id, ...(await mineFilter(user)) };
  const n = await Notification.findOneAndUpdate(filter, { $addToSet: { readBy: user.id } }, { new: true });
  if (!n) throw ApiError.notFound('Không tìm thấy thông báo');
  return { _id: n._id, isRead: true };
}

export async function markAllRead(user) {
  const filter = await mineFilter(user);
  filter.readBy = { $ne: user.id };
  const res = await Notification.updateMany(filter, { $addToSet: { readBy: user.id } });
  return { updated: res.modifiedCount };
}

// Tạo + đẩy socket. Dùng chung cho API và các service khác (payment, leave, medicine…)
export async function notify({ title, body, type = 'system', scope, targetRole, targetClass, targetUsers, link = '', sender = null }) {
  const n = await Notification.create({ title, body, type, scope, targetRole, targetClass, targetUsers, link, sender });
  const payload = { ...n.toObject(), isRead: false };
  delete payload.readBy;
  if (scope === 'all') emitToAll('notification:new', payload);
  else if (scope === 'role') emitToRole(targetRole, 'notification:new', payload);
  else if (scope === 'class') emitToClass(targetClass, 'notification:new', payload);
  else if (scope === 'user') emitToUsers(targetUsers.map(String), 'notification:new', payload);
  return n;
}

// Thông báo tới PH của 1 bé (tiện ích cho leave/medicine/payment)
export async function notifyParentsOfStudent(studentId, data) {
  const st = await Student.findById(studentId).select('parents').lean();
  if (!st?.parents?.length) return null;
  return notify({ ...data, scope: 'user', targetUsers: st.parents });
}

// API tạo thủ công: A/P mọi scope; T chỉ scope class của lớp mình (checkOwnership đã kiểm targetClass)
export async function createManual(user, data) {
  if (user.role === ROLES.TEACHER && data.scope !== 'class') {
    throw ApiError.forbidden('Giáo viên chỉ gửi thông báo cho lớp mình phụ trách');
  }
  return notify({ ...data, type: data.type || (data.scope === 'class' ? 'class' : 'school'), sender: user.id });
}

export async function remove(id) {
  const n = await Notification.findByIdAndDelete(id);
  if (!n) throw ApiError.notFound('Không tìm thấy thông báo');
}
