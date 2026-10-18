import { LessonPlan } from '../models/LessonPlan.js';
import { Class } from '../models/Class.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildPagination } from '../utils/paginate.js';
import { weekStartKey } from '../utils/date.js';
import { ROLES } from '../config/constants.js';
import * as approval from './approval.service.js';
import { notify } from './notification.service.js';

const USER_FIELDS = 'fullName avatar';

export async function list(user, query) {
  const pg = parsePagination(query, { defaultSort: '-weekStart' });
  const filter = {};
  if (user.role === ROLES.TEACHER) {
    const mine = (await Class.find({ teachers: user.id }).select('_id').lean()).map((c) => c._id);
    filter.class = query.class ? query.class : { $in: mine }; // quyền với query.class đã kiểm ở checkOwnership
  } else if (query.class) filter.class = query.class;
  if (query.status) filter.status = query.status;
  if (query.weekStart) filter.weekStart = weekStartKey(query.weekStart);

  const [items, total] = await Promise.all([
    LessonPlan.find(filter)
      .populate('class', 'name ageGroup')
      .populate('teacher', USER_FIELDS)
      .populate('approvedBy', USER_FIELDS)
      .sort(pg.sort)
      .skip(pg.skip)
      .limit(pg.limit),
    LessonPlan.countDocuments(filter),
  ]);
  return { items, pagination: buildPagination(pg, total) };
}

// doc đã qua checkResourceOwnership; PH chỉ xem bản đã duyệt
export async function getById(doc, user) {
  if (user.role === ROLES.PARENT && doc.status !== 'approved') throw ApiError.forbidden('Kế hoạch chưa được duyệt');
  return LessonPlan.findById(doc._id).populate('class', 'name ageGroup').populate('teacher', USER_FIELDS).populate('approvedBy', USER_FIELDS);
}

export async function create(user, data) {
  const weekStart = weekStartKey(data.weekStart);
  if (await LessonPlan.exists({ class: data.class, weekStart })) throw ApiError.conflict('Lớp đã có kế hoạch cho tuần này');
  const p = await LessonPlan.create({ ...data, weekStart, teacher: user.id });
  return getById(p, user);
}

export async function update(doc, user, data) {
  approval.assertEditable(doc);
  Object.assign(doc, data);
  approval.touchAfterEdit(doc);
  await doc.save();
  return getById(doc, user);
}

export async function submit(doc, user) {
  if (!doc.days.some((d) => d.activities.length)) throw ApiError.badRequest('Kế hoạch chưa có hoạt động nào');
  approval.submit(doc);
  await doc.save();
  return getById(doc, user);
}

export async function approve(doc, user) {
  approval.approve(doc, user.id);
  await doc.save();
  await notify({
    title: 'Kế hoạch giảng dạy đã được duyệt', body: `Kế hoạch tuần ${doc.weekStart.toISOString().slice(0, 10)} đã được hiệu trưởng duyệt.`,
    type: 'school', scope: 'user', targetUsers: [doc.teacher], link: `/teacher/lesson-plans/${doc._id}`, sender: user.id,
  });
  return getById(doc, user);
}

export async function reject(doc, user, reason) {
  approval.reject(doc, user.id, reason);
  await doc.save();
  await notify({
    title: 'Kế hoạch giảng dạy bị từ chối', body: `Lý do: ${reason}`,
    type: 'school', scope: 'user', targetUsers: [doc.teacher], link: `/teacher/lesson-plans/${doc._id}`, sender: user.id,
  });
  return getById(doc, user);
}

export async function remove(doc) {
  if (doc.status === 'approved') throw ApiError.badRequest('Không xoá kế hoạch đã duyệt');
  await doc.deleteOne();
}
