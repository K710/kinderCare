import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../config/constants.js';
import { Class } from '../models/Class.js';
import { Student } from '../models/Student.js';

const isId = (v) => mongoose.isValidObjectId(v);

// Lấy giá trị từ params → query → body theo tên trường
function pick(req, keys) {
  for (const k of keys) {
    const v = req.params?.[k] ?? req.query?.[k] ?? req.body?.[k];
    if (v) return v;
  }
  return null;
}

/* ===== Hàm kiểm tra dùng chung (service cũng có thể gọi) ===== */

// Teacher có phụ trách lớp này không
export async function teacherOwnsClass(teacherId, classId) {
  if (!isId(classId)) return false;
  return !!(await Class.exists({ _id: classId, teachers: teacherId }));
}

// Parent có phải PH của bé này không
export async function parentOwnsStudent(parentId, studentId) {
  if (!isId(studentId)) return false;
  return !!(await Student.exists({ _id: studentId, parents: parentId }));
}

// Teacher có dạy bé này không (qua lớp hiện tại của bé)
export async function teacherOwnsStudent(teacherId, studentId) {
  if (!isId(studentId)) return false;
  const st = await Student.findById(studentId).select('class').lean();
  if (!st?.class) return false;
  return teacherOwnsClass(teacherId, st.class);
}

// Kiểm tra quyền truy cập 1 bé theo role. admin/principal luôn qua.
export async function canAccessStudent(user, studentId) {
  if (user.role === ROLES.ADMIN || user.role === ROLES.PRINCIPAL) return true;
  if (user.role === ROLES.TEACHER) return teacherOwnsStudent(user.id, studentId);
  if (user.role === ROLES.PARENT) return parentOwnsStudent(user.id, studentId);
  return false;
}

// Kiểm tra quyền truy cập 1 lớp theo role.
export async function canAccessClass(user, classId) {
  if (user.role === ROLES.ADMIN || user.role === ROLES.PRINCIPAL) return true;
  if (user.role === ROLES.TEACHER) return teacherOwnsClass(user.id, classId);
  if (user.role === ROLES.PARENT) {
    if (!isId(classId)) return false;
    return !!(await Student.exists({ class: classId, parents: user.id, status: 'active' }));
  }
  return false;
}

/* ===== Middleware ===== */

/**
 * checkOwnership({ student?: [keys], class?: [keys] })
 * - Tìm studentId / classId trong params/query/body theo keys.
 * - Teacher: phải phụ trách lớp (hoặc lớp của bé). Parent: phải là PH của bé (hoặc có con trong lớp).
 * - Không tìm thấy id nào → cho qua (service tự lọc theo lớp/con – vd GET list).
 * Mặc định keys: student = ['studentId','student'], class = ['classId','class'].
 */
export const checkOwnership = (opts = {}) => {
  const studentKeys = opts.student ?? ['studentId', 'student'];
  const classKeys = opts.class ?? ['classId', 'class'];

  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) throw ApiError.unauthorized();
      if (user.role === ROLES.ADMIN || user.role === ROLES.PRINCIPAL) return next();

      const studentId = pick(req, studentKeys);
      const classId = pick(req, classKeys);

      if (studentId) {
        if (!(await canAccessStudent(user, studentId))) {
          throw ApiError.forbidden('Bạn không có quyền với học sinh này');
        }
      }
      if (classId) {
        if (!(await canAccessClass(user, classId))) {
          throw ApiError.forbidden('Bạn không có quyền với lớp này');
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * checkResourceOwnership(Model, { studentField = 'student', classField = 'class', param = 'id' })
 * Dùng cho route /:id của bản ghi con (Attendance, DailyReport, LeaveRequest...):
 * tải bản ghi, kiểm tra quyền qua student/class của nó, gắn req.resource để controller khỏi query lại.
 */
export const checkResourceOwnership = (Model, { studentField = 'student', classField = 'class', param = 'id' } = {}) =>
  async (req, res, next) => {
    try {
      const id = req.params[param];
      if (!isId(id)) throw ApiError.notFound();
      const doc = await Model.findById(id);
      if (!doc) throw ApiError.notFound();

      const user = req.user;
      if (user.role !== ROLES.ADMIN && user.role !== ROLES.PRINCIPAL) {
        let ok = false;
        if (doc[studentField]) ok = await canAccessStudent(user, doc[studentField]);
        else if (doc[classField]) ok = await canAccessClass(user, doc[classField]);
        if (!ok) throw ApiError.forbidden('Bạn không có quyền với dữ liệu này');
      }
      req.resource = doc;
      next();
    } catch (err) {
      next(err);
    }
  };
