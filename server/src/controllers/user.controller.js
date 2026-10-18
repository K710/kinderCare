import * as svc from '../services/user.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.list(req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});

export const getById = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.getById(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  sendCreated(res, await svc.create(req.body), 'Tạo tài khoản thành công');
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.update(req.params.id, req.body, req.user.id), 'Cập nhật thành công');
});

export const setStatus = asyncHandler(async (req, res) => {
  const user = await svc.setStatus(req.params.id, req.body.isActive, req.user.id);
  sendSuccess(res, user, req.body.isActive ? 'Đã mở khoá tài khoản' : 'Đã khoá tài khoản');
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await svc.resetPassword(req.params.id, req.body.newPassword);
  sendSuccess(res, result, 'Đã đặt lại mật khẩu'); // tempPassword chỉ hiện 1 lần
});

export const listTeachers = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.listTeachers(req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});

export const listParents = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.listParents(req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});
