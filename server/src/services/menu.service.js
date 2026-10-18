import { Menu } from '../models/Menu.js';
import { Class } from '../models/Class.js';
import { Student } from '../models/Student.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildPagination } from '../utils/paginate.js';
import { weekStartKey } from '../utils/date.js';
import { ROLES } from '../config/constants.js';
import * as approval from './approval.service.js';

const USER_FIELDS = 'fullName avatar';

export async function list(query) {
  const pg = parsePagination(query, { defaultSort: '-weekStart' });
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.ageGroup) filter.ageGroup = query.ageGroup;
  if (query.weekStart) filter.weekStart = weekStartKey(query.weekStart);
  const [items, total] = await Promise.all([
    Menu.find(filter).populate('createdBy', USER_FIELDS).populate('approvedBy', USER_FIELDS).sort(pg.sort).skip(pg.skip).limit(pg.limit),
    Menu.countDocuments(filter),
  ]);
  return { items, pagination: buildPagination(pg, total) };
}

// Nhóm tuổi liên quan tới user: T = lớp phụ trách, PH = lớp của con
async function relevantAgeGroups(user) {
  if (user.role === ROLES.TEACHER) {
    return (await Class.find({ teachers: user.id, isActive: true }).select('ageGroup').lean()).map((c) => c.ageGroup);
  }
  if (user.role === ROLES.PARENT) {
    const kids = await Student.find({ parents: user.id, status: 'active', class: { $ne: null } }).populate('class', 'ageGroup').lean();
    return kids.map((k) => k.class?.ageGroup).filter(Boolean);
  }
  return null;
}

// Thực đơn tuần (mặc định tuần hiện tại) đã duyệt. Trả theo nhóm tuổi: riêng nhóm nếu có, không thì bản 'all'
export async function current(user, { date, ageGroup }) {
  const weekStart = weekStartKey(date || new Date());
  const approved = await Menu.find({ weekStart, status: 'approved' }).lean();
  const byGroup = new Map(approved.map((m) => [m.ageGroup, m]));

  let groups;
  if (ageGroup) groups = [ageGroup];
  else groups = (await relevantAgeGroups(user)) || ['nha_tre', 'mam', 'choi', 'la'];
  groups = [...new Set(groups)];

  const items = groups.map((g) => ({ ageGroup: g, menu: byGroup.get(g) || byGroup.get('all') || null }));
  return { weekStart, items };
}

export async function getById(id, user) {
  const m = await Menu.findById(id).populate('createdBy', USER_FIELDS).populate('approvedBy', USER_FIELDS);
  if (!m) throw ApiError.notFound('Không tìm thấy thực đơn');
  // GV/PH chỉ xem bản đã duyệt
  if ([ROLES.TEACHER, ROLES.PARENT].includes(user.role) && m.status !== 'approved') {
    throw ApiError.forbidden('Thực đơn chưa được duyệt');
  }
  return m;
}

export async function create(user, data) {
  const weekStart = weekStartKey(data.weekStart);
  const ageGroup = data.ageGroup || 'all';
  if (await Menu.exists({ weekStart, ageGroup })) throw ApiError.conflict('Tuần này đã có thực đơn cho nhóm tuổi này');
  return Menu.create({ ...data, weekStart, ageGroup, createdBy: user.id });
}

async function load(id) {
  const m = await Menu.findById(id);
  if (!m) throw ApiError.notFound('Không tìm thấy thực đơn');
  return m;
}

export async function update(id, data) {
  const m = await load(id);
  approval.assertEditable(m);
  if (data.ageGroup && data.ageGroup !== m.ageGroup) {
    if (await Menu.exists({ weekStart: m.weekStart, ageGroup: data.ageGroup, _id: { $ne: id } })) {
      throw ApiError.conflict('Tuần này đã có thực đơn cho nhóm tuổi này');
    }
  }
  Object.assign(m, data);
  approval.touchAfterEdit(m);
  await m.save();
  return m;
}

export async function submit(id) {
  const m = await load(id);
  if (!m.days.length) throw ApiError.badRequest('Thực đơn chưa có ngày nào');
  approval.submit(m);
  await m.save();
  return m;
}

export async function approve(id, user) {
  const m = await load(id);
  approval.approve(m, user.id);
  await m.save();
  return m;
}

export async function reject(id, user, reason) {
  const m = await load(id);
  approval.reject(m, user.id, reason);
  await m.save();
  return m;
}

export async function remove(id) {
  const m = await load(id);
  if (m.status === 'approved') throw ApiError.badRequest('Không xoá thực đơn đã duyệt');
  await m.deleteOne();
}
