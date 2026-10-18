import { LeaveRequest } from '../models/LeaveRequest.js';
import { Attendance } from '../models/Attendance.js';
import { Student } from '../models/Student.js';
import { Class } from '../models/Class.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildPagination } from '../utils/paginate.js';
import { toDateKey, eachDay } from '../utils/date.js';
import { ROLES } from '../config/constants.js';
import { notify } from './notification.service.js';
import { formatVN } from '../utils/date.js';

const POP = [
  { path: 'student', select: 'fullName nickname avatar' },
  { path: 'class', select: 'name' },
  { path: 'parent', select: 'fullName phone avatar' },
  { path: 'reviewedBy', select: 'fullName' },
];

export async function list(user, query) {
  const pg = parsePagination(query, { defaultSort: '-fromDate' });
  const filter = {};
  if (user.role === ROLES.TEACHER) {
    const mine = (await Class.find({ teachers: user.id }).select('_id').lean()).map((c) => c._id);
    filter.class = query.class || { $in: mine };
  } else if (query.class) filter.class = query.class;
  if (query.status) filter.status = query.status;
  if (query.student) filter.student = query.student;

  const [items, total] = await Promise.all([
    LeaveRequest.find(filter).populate(POP).sort(pg.sort).skip(pg.skip).limit(pg.limit),
    LeaveRequest.countDocuments(filter),
  ]);
  return { items, pagination: buildPagination(pg, total) };
}

export function my(parentId, query) {
  const filter = { parent: parentId };
  if (query.status) filter.status = query.status;
  if (query.student) filter.student = query.student;
  return LeaveRequest.find(filter).populate(POP).sort('-fromDate');
}

export const getById = (doc) => LeaveRequest.findById(doc._id).populate(POP);

async function assertNoOverlap(student, from, to, excludeId) {
  const filter = { student, status: { $ne: 'rejected' }, fromDate: { $lte: to }, toDate: { $gte: from } };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await LeaveRequest.exists(filter)) throw ApiError.conflict('Bé đã có đơn nghỉ trùng khoảng ngày này');
}

export async function create(user, data) {
  const st = await Student.findById(data.student).select('class status');
  if (!st || st.status !== 'active' || !st.class) throw ApiError.badRequest('Học sinh không hợp lệ hoặc chưa xếp lớp');
  const fromDate = toDateKey(data.fromDate);
  const toDate = toDateKey(data.toDate);
  await assertNoOverlap(data.student, fromDate, toDate);
  const doc = await LeaveRequest.create({ ...data, fromDate, toDate, class: st.class, parent: user.id });
  return getById(doc);
}

// PH chỉ sửa đơn của mình khi còn chờ duyệt
function assertOwnPending(doc, user) {
  if (!doc.parent.equals(user.id)) throw ApiError.forbidden('Không phải đơn của bạn');
  if (doc.status !== 'pending') throw ApiError.badRequest('Đơn đã được xử lý, không thể thay đổi');
}

export async function update(doc, user, data) {
  assertOwnPending(doc, user);
  if (data.fromDate) data.fromDate = toDateKey(data.fromDate);
  if (data.toDate) data.toDate = toDateKey(data.toDate);
  const from = data.fromDate || doc.fromDate;
  const to = data.toDate || doc.toDate;
  if (to < from) throw ApiError.badRequest('Ngày kết thúc phải ≥ ngày bắt đầu');
  await assertNoOverlap(doc.student, from, to, doc._id);
  Object.assign(doc, data);
  await doc.save();
  return getById(doc);
}

export async function remove(doc, user) {
  assertOwnPending(doc, user);
  await doc.deleteOne();
}

// Duyệt → tạo Attendance `excused` cho các ngày trong khoảng (bỏ T7/CN, không ghi đè bản ghi đã có)
export async function approve(doc, user, note = '') {
  if (doc.status !== 'pending') throw ApiError.badRequest('Đơn đã được xử lý');
  doc.status = 'approved';
  doc.reviewedBy = user.id;
  doc.reviewedAt = new Date();
  doc.reviewNote = note;
  await doc.save();

  const days = eachDay(doc.fromDate, doc.toDate, { skipWeekend: true });
  let created = 0;
  if (days.length) {
    const ops = days.map((date) => ({
      updateOne: {
        filter: { student: doc.student, date },
        update: { $setOnInsert: { class: doc.class, status: 'excused', note: 'Nghỉ có phép', markedBy: user.id } },
        upsert: true,
      },
    }));
    const res = await Attendance.bulkWrite(ops, { ordered: false });
    created = res.upsertedCount;
  }
  const full = await getById(doc);
  await notify({
    title: 'Đơn xin nghỉ đã được duyệt',
    body: `Đơn nghỉ của bé ${full.student.fullName} (${formatVN(doc.fromDate)} – ${formatVN(doc.toDate)}) đã được giáo viên duyệt.`,
    type: 'leave', scope: 'user', targetUsers: [doc.parent], link: `/parent/leave-requests/${doc._id}`, sender: user.id,
  });
  return { request: full, attendanceCreated: created, days: days.length };
}

export async function reject(doc, user, note) {
  if (doc.status !== 'pending') throw ApiError.badRequest('Đơn đã được xử lý');
  doc.status = 'rejected';
  doc.reviewedBy = user.id;
  doc.reviewedAt = new Date();
  doc.reviewNote = note;
  await doc.save();
  const full = await getById(doc);
  await notify({
    title: 'Đơn xin nghỉ bị từ chối',
    body: `Đơn nghỉ của bé ${full.student.fullName} bị từ chối: ${note}`,
    type: 'leave', scope: 'user', targetUsers: [doc.parent], link: `/parent/leave-requests/${doc._id}`, sender: user.id,
  });
  return full;
}
