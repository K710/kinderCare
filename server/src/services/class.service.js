import { Class } from '../models/Class.js';
import { Student, STUDENT_PUBLIC_SELECT } from '../models/Student.js';
import { User } from '../models/User.js';
import { SchoolYear } from '../models/SchoolYear.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildPagination } from '../utils/paginate.js';
import { escapeRegex } from '../validators/common.validator.js';
import { ROLES } from '../config/constants.js';

const TEACHER_FIELDS = 'fullName email phone avatar honorific';

async function assertTeachers(ids = []) {
  if (!ids.length) return;
  const unique = [...new Set(ids)];
  const count = await User.countDocuments({ _id: { $in: unique }, role: ROLES.TEACHER, isActive: true });
  if (count !== unique.length) throw ApiError.badRequest('Có giáo viên không hợp lệ hoặc đã bị khoá');
}

// Gắn sĩ số hiện tại cho danh sách lớp
async function withStudentCount(classes) {
  if (!classes.length) return classes;
  const counts = await Student.aggregate([
    { $match: { class: { $in: classes.map((c) => c._id) }, status: 'active' } },
    { $group: { _id: '$class', n: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((c) => [c._id.toString(), c.n]));
  return classes.map((c) => ({ ...c, studentCount: map.get(c._id.toString()) || 0 }));
}

// A/P: tất cả lớp; T: chỉ lớp mình phụ trách
export async function list(user, query) {
  const pg = parsePagination(query, { defaultSort: 'name' });
  const filter = {};
  if (user.role === ROLES.TEACHER) filter.teachers = user.id;
  if (query.schoolYear) filter.schoolYear = query.schoolYear;
  if (query.ageGroup) filter.ageGroup = query.ageGroup;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  else filter.isActive = true;
  if (query.search) filter.name = new RegExp(escapeRegex(query.search), 'i');

  const [classes, total] = await Promise.all([
    Class.find(filter)
      .populate('teachers', TEACHER_FIELDS)
      .populate('schoolYear', 'name isCurrent')
      .sort(pg.sort)
      .skip(pg.skip)
      .limit(pg.limit)
      .lean(),
    Class.countDocuments(filter),
  ]);
  return { items: await withStudentCount(classes), pagination: buildPagination(pg, total) };
}

export async function getById(id) {
  const cls = await Class.findById(id)
    .populate('teachers', TEACHER_FIELDS)
    .populate('schoolYear', 'name startDate endDate isCurrent')
    .lean();
  if (!cls) throw ApiError.notFound('Không tìm thấy lớp');
  const [withCount] = await withStudentCount([cls]);
  return withCount;
}

// Học sinh trong lớp (không kèm trường nhạy cảm – trang chi tiết bé sẽ kiểm tra quyền riêng)
export async function getStudents(id) {
  if (!(await Class.exists({ _id: id }))) throw ApiError.notFound('Không tìm thấy lớp');
  return Student.find({ class: id, status: 'active' })
    .select(STUDENT_PUBLIC_SELECT)
    .populate('parents', 'fullName phone avatar')
    .sort('fullName');
}

export async function create(data) {
  if (!(await SchoolYear.exists({ _id: data.schoolYear }))) throw ApiError.notFound('Không tìm thấy năm học');
  if (await Class.exists({ schoolYear: data.schoolYear, name: data.name })) {
    throw ApiError.conflict('Tên lớp đã tồn tại trong năm học này');
  }
  await assertTeachers(data.teachers);
  const cls = await Class.create(data);
  return getById(cls._id);
}

export async function update(id, data) {
  const cls = await Class.findById(id);
  if (!cls) throw ApiError.notFound('Không tìm thấy lớp');
  if (data.name && data.name !== cls.name) {
    if (await Class.exists({ schoolYear: cls.schoolYear, name: data.name, _id: { $ne: id } })) {
      throw ApiError.conflict('Tên lớp đã tồn tại trong năm học này');
    }
  }
  Object.assign(cls, data);
  await cls.save();
  return getById(id);
}

export async function setTeachers(id, teachers) {
  await assertTeachers(teachers);
  const cls = await Class.findByIdAndUpdate(id, { $set: { teachers: [...new Set(teachers)] } }, { new: true });
  if (!cls) throw ApiError.notFound('Không tìm thấy lớp');
  return getById(id);
}

// Thêm nhiều bé vào lớp (bé đang ở lớp khác sẽ được chuyển sang)
export async function addStudents(id, studentIds) {
  const cls = await Class.findById(id);
  if (!cls) throw ApiError.notFound('Không tìm thấy lớp');
  if (!cls.isActive) throw ApiError.badRequest('Lớp đã ngừng hoạt động');

  const unique = [...new Set(studentIds)];
  const students = await Student.find({ _id: { $in: unique }, status: 'active' }).select('_id class');
  if (students.length !== unique.length) throw ApiError.badRequest('Có học sinh không tồn tại hoặc không còn học');

  const newcomers = students.filter((s) => !s.class || !s.class.equals(cls._id)).length;
  const current = await Student.countDocuments({ class: id, status: 'active' });
  if (current + newcomers > cls.capacity) {
    throw ApiError.badRequest(`Vượt sĩ số tối đa ${cls.capacity} (hiện ${current}, thêm ${newcomers})`);
  }

  await Student.updateMany({ _id: { $in: unique } }, { $set: { class: cls._id } });
  return { added: newcomers, total: current + newcomers };
}

export async function removeStudent(id, studentId) {
  const res = await Student.updateOne({ _id: studentId, class: id }, { $set: { class: null } });
  if (!res.matchedCount) throw ApiError.notFound('Học sinh không thuộc lớp này');
}

// Xoá mềm: chỉ khi lớp không còn học sinh đang học
export async function remove(id) {
  const cls = await Class.findById(id);
  if (!cls) throw ApiError.notFound('Không tìm thấy lớp');
  const n = await Student.countDocuments({ class: id, status: 'active' });
  if (n > 0) throw ApiError.badRequest(`Lớp còn ${n} học sinh, hãy chuyển lớp trước khi xoá`);
  cls.isActive = false;
  await cls.save();
}
