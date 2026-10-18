import { Student, STUDENT_PUBLIC_SELECT } from '../models/Student.js';
import { User } from '../models/User.js';
import { Class } from '../models/Class.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildPagination } from '../utils/paginate.js';
import { escapeRegex } from '../validators/common.validator.js';
import { ROLES } from '../config/constants.js';
import * as uploadService from './upload.service.js';

const PARENT_FIELDS = 'fullName phone email avatar';
const CLASS_FIELDS = 'name ageGroup schoolYear teachers';

async function assertParents(ids = []) {
  const unique = [...new Set(ids)];
  const n = await User.countDocuments({ _id: { $in: unique }, role: ROLES.PARENT, isActive: true });
  if (n !== unique.length) throw ApiError.badRequest('Có phụ huynh không hợp lệ hoặc đã bị khoá');
  return unique;
}

async function assertClass(classId) {
  if (!classId) return null;
  const cls = await Class.findById(classId).select('isActive capacity');
  if (!cls || !cls.isActive) throw ApiError.badRequest('Lớp không tồn tại hoặc đã ngừng hoạt động');
  const n = await Student.countDocuments({ class: classId, status: 'active' });
  if (n >= cls.capacity) throw ApiError.badRequest(`Lớp đã đủ sĩ số ${cls.capacity}`);
  return cls;
}

// Lớp mà giáo viên phụ trách (dùng lọc list)
async function teacherClassIds(teacherId) {
  const classes = await Class.find({ teachers: teacherId, isActive: true }).select('_id').lean();
  return classes.map((c) => c._id);
}

// A/P: tất cả; T: chỉ HS lớp mình. Không kèm trường nhạy cảm ở list.
export async function list(user, query) {
  const pg = parsePagination(query, { defaultSort: 'fullName' });
  const filter = {};

  if (user.role === ROLES.TEACHER) {
    const myClasses = await teacherClassIds(user.id);
    if (query.class) {
      if (!myClasses.some((id) => id.equals(query.class))) throw ApiError.forbidden('Bạn không phụ trách lớp này');
      filter.class = query.class;
    } else {
      filter.class = { $in: myClasses };
    }
  } else if (query.class) {
    filter.class = query.class;
  }

  if (query.unassigned) filter.class = null;
  filter.status = query.status || 'active';
  if (query.search) filter.fullName = new RegExp(escapeRegex(query.search), 'i');

  const [items, total] = await Promise.all([
    Student.find(filter)
      .select(STUDENT_PUBLIC_SELECT)
      .populate('class', 'name ageGroup')
      .populate('parents', PARENT_FIELDS)
      .sort(pg.sort)
      .skip(pg.skip)
      .limit(pg.limit),
    Student.countDocuments(filter),
  ]);
  return { items, pagination: buildPagination(pg, total) };
}

// Danh sách con của phụ huynh (mọi trạng thái, để xem lịch sử)
export function myChildren(parentId) {
  return Student.find({ parents: parentId })
    .populate({ path: 'class', select: CLASS_FIELDS, populate: { path: 'teachers', select: 'fullName phone avatar' } })
    .sort('fullName');
}

// Chi tiết đầy đủ (gồm trường nhạy cảm) – route đã qua checkOwnership nên người gọi đều có quyền
export async function getById(id) {
  const st = await Student.findById(id)
    .populate({ path: 'class', select: CLASS_FIELDS, populate: { path: 'teachers', select: 'fullName phone avatar' } })
    .populate('parents', PARENT_FIELDS);
  if (!st) throw ApiError.notFound('Không tìm thấy học sinh');
  return st;
}

export async function create(data) {
  data.parents = await assertParents(data.parents);
  await assertClass(data.class);
  const st = await Student.create(data);
  return getById(st._id);
}

export async function update(id, data) {
  const st = await Student.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  if (!st) throw ApiError.notFound('Không tìm thấy học sinh');
  return getById(id);
}

export async function setParents(id, parents) {
  const unique = await assertParents(parents);
  const st = await Student.findByIdAndUpdate(id, { $set: { parents: unique } }, { new: true });
  if (!st) throw ApiError.notFound('Không tìm thấy học sinh');
  return getById(id);
}

// Ra trường / nghỉ học → rời lớp để không chiếm sĩ số; quay lại active phải xếp lớp lại
export async function setStatus(id, status) {
  const st = await Student.findById(id);
  if (!st) throw ApiError.notFound('Không tìm thấy học sinh');
  st.status = status;
  if (status !== 'active') st.class = null;
  await st.save();
  return getById(id);
}

export async function updateAvatar(id, file) {
  const st = await Student.findById(id).select('avatar');
  if (!st) throw ApiError.notFound('Không tìm thấy học sinh');
  const { ref, key } = await uploadService.uploadBuffer(file.buffer, {
    folder: 'students',
    mimetype: file.mimetype,
    transformation: uploadService.AVATAR_TRANSFORM,
  });
  const old = st.avatar;
  await Student.updateOne({ _id: id }, { $set: { avatar: ref, avatarPublicId: key } });
  await uploadService.deleteByRef(old);
  return { avatar: ref }; // sendSuccess đổi thành link ký
}
