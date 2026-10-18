import { MedicineNote } from '../models/MedicineNote.js';
import { Student } from '../models/Student.js';
import { Class } from '../models/Class.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildPagination } from '../utils/paginate.js';
import { toDateKey } from '../utils/date.js';
import { ROLES } from '../config/constants.js';
import { notify } from './notification.service.js';

const POP = [
  { path: 'student', select: 'fullName nickname avatar allergies' },
  { path: 'class', select: 'name' },
  { path: 'parent', select: 'fullName phone avatar' },
  { path: 'confirmedBy', select: 'fullName' },
  { path: 'logs.givenBy', select: 'fullName' },
];

export async function list(user, query) {
  const pg = parsePagination(query, { defaultSort: '-fromDate' });
  const filter = {};
  if (user.role === ROLES.TEACHER) {
    const mine = (await Class.find({ teachers: user.id }).select('_id').lean()).map((c) => c._id);
    filter.class = query.class || { $in: mine };
  } else if (query.class) filter.class = query.class;
  if (query.status) filter.status = query.status;
  if (query.date) {
    const d = toDateKey(query.date);
    filter.fromDate = { $lte: d };
    filter.toDate = { $gte: d };
  }
  const [items, total] = await Promise.all([
    MedicineNote.find(filter).populate(POP).sort(pg.sort).skip(pg.skip).limit(pg.limit),
    MedicineNote.countDocuments(filter),
  ]);
  return { items, pagination: buildPagination(pg, total) };
}

export function my(parentId, query) {
  const filter = { parent: parentId };
  if (query.status) filter.status = query.status;
  return MedicineNote.find(filter).populate(POP).sort('-fromDate');
}

export const getById = (doc) => MedicineNote.findById(doc._id).populate(POP);

export async function create(user, data) {
  const st = await Student.findById(data.student).select('class status');
  if (!st || st.status !== 'active' || !st.class) throw ApiError.badRequest('Học sinh không hợp lệ hoặc chưa xếp lớp');
  const doc = await MedicineNote.create({
    ...data,
    fromDate: toDateKey(data.fromDate),
    toDate: toDateKey(data.toDate),
    class: st.class,
    parent: user.id,
  });
  return getById(doc);
}

function assertOwner(doc, user) {
  if (!doc.parent.equals(user.id)) throw ApiError.forbidden('Không phải dặn thuốc của bạn');
}

export async function update(doc, user, data) {
  assertOwner(doc, user);
  if (doc.status !== 'pending') throw ApiError.badRequest('Giáo viên đã xác nhận, không thể sửa. Hãy huỷ và tạo mới');
  if (data.fromDate) data.fromDate = toDateKey(data.fromDate);
  if (data.toDate) data.toDate = toDateKey(data.toDate);
  if ((data.toDate || doc.toDate) < (data.fromDate || doc.fromDate)) throw ApiError.badRequest('Ngày kết thúc phải ≥ ngày bắt đầu');
  Object.assign(doc, data);
  await doc.save();
  return getById(doc);
}

// PH huỷ khi chưa hoàn tất
export async function cancel(doc, user) {
  assertOwner(doc, user);
  if (!['pending', 'confirmed'].includes(doc.status)) throw ApiError.badRequest('Không thể huỷ ở trạng thái hiện tại');
  doc.status = 'cancelled';
  await doc.save();
  return getById(doc);
}

export async function confirm(doc, user) {
  if (doc.status !== 'pending') throw ApiError.badRequest('Chỉ xác nhận dặn thuốc đang chờ');
  doc.status = 'confirmed';
  doc.confirmedBy = user.id;
  doc.confirmedAt = new Date();
  await doc.save();
  const full = await getById(doc);
  await notify({
    title: 'Giáo viên đã nhận thuốc',
    body: `Dặn thuốc cho bé ${full.student.fullName} đã được giáo viên xác nhận.`,
    type: 'medicine', scope: 'user', targetUsers: [doc.parent], link: `/parent/medicine-notes/${doc._id}`, sender: user.id,
  });
  return full;
}

export async function addLog(doc, user, { givenAt, note }) {
  if (doc.status !== 'confirmed') throw ApiError.badRequest('Chỉ ghi nhận cho uống khi đã xác nhận');
  doc.logs.push({ givenAt: givenAt || new Date(), givenBy: user.id, note: note || '' });
  await doc.save();
  const full = await getById(doc);
  await notify({
    title: 'Bé đã được cho uống thuốc',
    body: `Bé ${full.student.fullName} đã uống thuốc${note ? `: ${note}` : ''}.`,
    type: 'medicine', scope: 'user', targetUsers: [doc.parent], link: `/parent/medicine-notes/${doc._id}`, sender: user.id,
  });
  return full;
}

export async function done(doc) {
  if (doc.status !== 'confirmed') throw ApiError.badRequest('Chỉ hoàn tất dặn thuốc đã xác nhận');
  doc.status = 'done';
  await doc.save();
  return getById(doc);
}
