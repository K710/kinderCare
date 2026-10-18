import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import { Class } from '../models/Class.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildPagination } from '../utils/paginate.js';
import { escapeRegex } from '../validators/common.validator.js';
import { ROLES } from '../config/constants.js';
import { generateTempPassword } from '../utils/password.js';

function searchFilter(search) {
  if (!search) return {};
  const rx = new RegExp(escapeRegex(search), 'i');
  return { $or: [{ fullName: rx }, { email: rx }, { phone: rx }] };
}

async function assertUnique({ email, phone }, excludeId) {
  const not = excludeId ? { _id: { $ne: excludeId } } : {};
  if (email && (await User.exists({ email, ...not }))) throw ApiError.conflict('Email đã được sử dụng');
  if (phone && (await User.exists({ phone, ...not }))) throw ApiError.conflict('Số điện thoại đã được sử dụng');
}

export async function list(query) {
  const pg = parsePagination(query);
  const filter = { ...searchFilter(query.search) };
  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive;

  const [items, total] = await Promise.all([
    User.find(filter).sort(pg.sort).skip(pg.skip).limit(pg.limit),
    User.countDocuments(filter),
  ]);
  return { items, pagination: buildPagination(pg, total) };
}

export async function getById(id) {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('Không tìm thấy tài khoản');
  return user;
}

// Admin đang hoạt động cuối cùng không được khoá / hạ vai trò
async function assertNotLastActiveAdmin(user, { message }) {
  if (user.role !== ROLES.ADMIN || !user.isActive) return;
  const others = await User.countDocuments({ _id: { $ne: user._id }, role: ROLES.ADMIN, isActive: true });
  if (others === 0) throw ApiError.badRequest(message, { code: 'LAST_ADMIN' });
}

// Tạo tài khoản: không truyền password → sinh mật khẩu tạm; luôn bắt đổi mật khẩu lần đầu
export async function create(data) {
  await assertUnique(data);
  const tempPassword = data.password || generateTempPassword();
  const user = await User.create({ ...data, password: tempPassword, mustChangePassword: true });
  return { ...user.toJSON(), tempPassword }; // tempPassword chỉ trả 1 lần tại đây
}

export async function update(id, data, actorId) {
  await assertUnique(data, id);
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('Không tìm thấy tài khoản');
  if (data.role && data.role !== user.role) {
    if (id === actorId) throw ApiError.badRequest('Không thể tự đổi vai trò của mình', { code: 'SELF_ROLE_CHANGE' });
    await assertNotLastActiveAdmin(user, { message: 'Đây là quản trị viên cuối cùng đang hoạt động, không thể đổi vai trò' });
  }
  Object.assign(user, data);
  await user.save();
  return user;
}

// Khoá tài khoản → thu hồi mọi refresh token để đăng xuất ngay
export async function setStatus(id, isActive, actorId) {
  if (id === actorId && !isActive) throw ApiError.badRequest('Không thể tự khoá tài khoản của mình', { code: 'SELF_LOCK' });
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('Không tìm thấy tài khoản');
  if (!isActive) {
    await assertNotLastActiveAdmin(user, { message: 'Đây là quản trị viên cuối cùng đang hoạt động, không thể khoá' });
    user.refreshTokens = [];
  }
  user.isActive = isActive;
  await user.save();
  return user;
}

// Đặt lại mật khẩu: không truyền → sinh tạm; bật mustChangePassword; đăng xuất mọi thiết bị
export async function resetPassword(id, newPassword) {
  const user = await User.findById(id).select('+password');
  if (!user) throw ApiError.notFound('Không tìm thấy tài khoản');
  const tempPassword = newPassword || generateTempPassword();
  user.password = tempPassword;
  user.mustChangePassword = true;
  user.refreshTokens = [];
  await user.save();
  return { tempPassword };
}

// Giáo viên kèm danh sách lớp đang phụ trách
export async function listTeachers(query) {
  const pg = parsePagination(query, { defaultSort: 'fullName' });
  const filter = { role: ROLES.TEACHER, isActive: true, ...searchFilter(query.search) };
  const [teachers, total] = await Promise.all([
    User.find(filter).sort(pg.sort).skip(pg.skip).limit(pg.limit).lean(),
    User.countDocuments(filter),
  ]);
  const ids = teachers.map((t) => t._id);
  const classes = await Class.find({ teachers: { $in: ids }, isActive: true }).select('name teachers').lean();
  const items = teachers.map((t) => ({
    ...t,
    classes: classes.filter((c) => c.teachers.some((x) => x.equals(t._id))).map((c) => ({ _id: c._id, name: c.name })),
  }));
  return { items, pagination: buildPagination(pg, total) };
}

// Phụ huynh kèm danh sách con (lấy từ Student.parents)
export async function listParents(query) {
  const pg = parsePagination(query, { defaultSort: 'fullName' });
  const filter = { role: ROLES.PARENT, isActive: true, ...searchFilter(query.search) };
  const [parents, total] = await Promise.all([
    User.find(filter).sort(pg.sort).skip(pg.skip).limit(pg.limit).lean(),
    User.countDocuments(filter),
  ]);
  const ids = parents.map((p) => p._id);
  const students = await Student.find({ parents: { $in: ids } }).select('fullName class parents status').lean();
  const items = parents.map((p) => ({
    ...p,
    children: students
      .filter((s) => s.parents.some((x) => x.equals(p._id)))
      .map((s) => ({ _id: s._id, fullName: s.fullName, class: s.class, status: s.status })),
  }));
  return { items, pagination: buildPagination(pg, total) };
}
