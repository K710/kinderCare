import mongoose from 'mongoose';
import { Message, conversationIdOf } from '../models/Message.js';
import { Student } from '../models/Student.js';
import { Class } from '../models/Class.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../config/constants.js';
import { emitToUsers } from '../sockets/emitter.js';

const USER_FIELDS = 'fullName avatar role phone';

// Danh bạ: T → PH của các bé trong lớp mình (kèm bé); PH → GV lớp của các con (kèm bé)
export async function contacts(user) {
  if (user.role === ROLES.TEACHER) {
    const classIds = (await Class.find({ teachers: user.id, isActive: true }).select('_id').lean()).map((c) => c._id);
    const students = await Student.find({ class: { $in: classIds }, status: 'active' })
      .select('fullName avatar class parents')
      .populate('parents', USER_FIELDS)
      .populate('class', 'name')
      .lean();
    const map = new Map();
    for (const s of students) {
      for (const p of s.parents) {
        const key = p._id.toString();
        if (!map.has(key)) map.set(key, { user: p, students: [] });
        map.get(key).students.push({ _id: s._id, fullName: s.fullName, avatar: s.avatar, class: s.class });
      }
    }
    return [...map.values()];
  }
  if (user.role === ROLES.PARENT) {
    const kids = await Student.find({ parents: user.id, status: 'active', class: { $ne: null } })
      .select('fullName avatar class')
      .populate({ path: 'class', select: 'name teachers', populate: { path: 'teachers', select: USER_FIELDS } })
      .lean();
    const map = new Map();
    for (const k of kids) {
      for (const t of k.class?.teachers || []) {
        const key = t._id.toString();
        if (!map.has(key)) map.set(key, { user: t, students: [] });
        map.get(key).students.push({ _id: k._id, fullName: k.fullName, avatar: k.avatar, class: { _id: k.class._id, name: k.class.name } });
      }
    }
    return [...map.values()];
  }
  return [];
}

// T ↔ PH chỉ chat được khi có bé chung (GV dạy lớp của con)
export async function canChat(user, otherId) {
  const other = await User.findById(otherId).select('role isActive').lean();
  if (!other || !other.isActive) return false;
  const pair = [user.role, other.role].sort().join(',');
  if (pair !== 'parent,teacher') return false;
  const teacherId = user.role === ROLES.TEACHER ? user.id : otherId;
  const parentId = user.role === ROLES.PARENT ? user.id : otherId;
  const classIds = (await Class.find({ teachers: teacherId, isActive: true }).select('_id').lean()).map((c) => c._id);
  return !!(await Student.exists({ parents: parentId, class: { $in: classIds }, status: 'active' }));
}

// Danh sách hội thoại: tin cuối + số chưa đọc, kèm người đối thoại
export async function conversations(user) {
  const me = new mongoose.Types.ObjectId(user.id);
  const rows = await Message.aggregate([
    { $match: { $or: [{ sender: me }, { receiver: me }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$conversationId',
        last: { $first: '$$ROOT' },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ['$receiver', me] }, { $eq: ['$readAt', null] }] }, 1, 0] } },
      },
    },
    { $sort: { 'last.createdAt': -1 } },
  ]);
  const otherIds = rows.map((r) => (r.last.sender.equals(me) ? r.last.receiver : r.last.sender));
  const users = await User.find({ _id: { $in: otherIds } }).select(USER_FIELDS).lean();
  const umap = new Map(users.map((u) => [u._id.toString(), u]));
  return rows.map((r, i) => ({
    conversationId: r._id,
    user: umap.get(otherIds[i].toString()) || null,
    lastMessage: { content: r.last.content, attachments: r.last.attachments, sender: r.last.sender, createdAt: r.last.createdAt },
    unread: r.unread,
  }));
}

// Lịch sử với 1 người, phân trang cursor (?before=ISO), mới nhất trước
export async function history(user, otherId, { before, limit = 30 }) {
  if (!(await canChat(user, otherId))) throw ApiError.forbidden('Bạn không thể trao đổi với người này');
  const filter = { conversationId: conversationIdOf(user.id, otherId) };
  if (before) filter.createdAt = { $lt: before };
  const items = await Message.find(filter).populate('student', 'fullName avatar').sort('-createdAt').limit(limit).lean();
  return { items, hasMore: items.length === limit };
}

export async function send(user, { receiver, student, content = '', attachments = [] }) {
  if (receiver === user.id) throw ApiError.badRequest('Không thể tự nhắn cho mình');
  if (!(await canChat(user, receiver))) throw ApiError.forbidden('Bạn không thể trao đổi với người này');
  const msg = await Message.create({
    conversationId: conversationIdOf(user.id, receiver),
    sender: user.id,
    receiver,
    student,
    content,
    attachments,
  });
  const payload = msg.toObject();
  emitToUsers([receiver], 'message:new', payload);
  return msg;
}

// Đánh dấu đã đọc toàn bộ tin người kia gửi cho tôi
export async function markRead(user, otherId) {
  const readAt = new Date();
  const res = await Message.updateMany(
    { conversationId: conversationIdOf(user.id, otherId), receiver: user.id, readAt: null },
    { $set: { readAt } },
  );
  if (res.modifiedCount) emitToUsers([otherId], 'message:read', { conversationId: conversationIdOf(user.id, otherId), readAt, by: user.id });
  return { updated: res.modifiedCount, readAt };
}

export async function unreadTotal(user) {
  return Message.countDocuments({ receiver: user.id, readAt: null });
}
