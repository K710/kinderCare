import * as svc from '../services/class.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.list(req.user, req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});

export const getById = asyncHandler(async (req, res) => sendSuccess(res, await svc.getById(req.params.id)));
export const getStudents = asyncHandler(async (req, res) => sendSuccess(res, await svc.getStudents(req.params.id)));

export const create = asyncHandler(async (req, res) => sendCreated(res, await svc.create(req.body), 'Tạo lớp thành công'));
export const update = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.update(req.params.id, req.body), 'Cập nhật thành công'),
);
export const setTeachers = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.setTeachers(req.params.id, req.body.teachers), 'Đã cập nhật giáo viên'),
);
export const addStudents = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.addStudents(req.params.id, req.body.studentIds), 'Đã thêm học sinh vào lớp'),
);
export const removeStudent = asyncHandler(async (req, res) => {
  await svc.removeStudent(req.params.id, req.params.studentId);
  sendSuccess(res, null, 'Đã chuyển học sinh ra khỏi lớp');
});
export const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.id);
  sendSuccess(res, null, 'Đã xoá lớp');
});
