import * as svc from '../services/tuition.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.list(req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});
export const my = asyncHandler(async (req, res) => sendSuccess(res, await svc.my(req.user.id, req.query)));
export const getById = asyncHandler(async (req, res) => sendSuccess(res, await svc.getById(req.params.id)));
export const create = asyncHandler(async (req, res) => sendCreated(res, await svc.create(req.user, req.body), 'Đã tạo học phí'));
export const bulkCreate = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.bulkCreate(req.user, req.body), 'Đã tạo học phí cho lớp'),
);
export const update = asyncHandler(async (req, res) => sendSuccess(res, await svc.update(req.params.id, req.body, req.user), 'Đã cập nhật'));
export const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.id);
  sendSuccess(res, null, 'Đã xoá học phí');
});
export const summary = asyncHandler(async (req, res) => sendSuccess(res, await svc.summary(req.query)));
