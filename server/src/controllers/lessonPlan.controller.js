import * as svc from '../services/lessonPlan.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.list(req.user, req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});
export const getById = asyncHandler(async (req, res) => sendSuccess(res, await svc.getById(req.resource, req.user)));
export const create = asyncHandler(async (req, res) => sendCreated(res, await svc.create(req.user, req.body), 'Đã tạo kế hoạch'));
export const update = asyncHandler(async (req, res) => sendSuccess(res, await svc.update(req.resource, req.user, req.body), 'Đã cập nhật'));
export const submit = asyncHandler(async (req, res) => sendSuccess(res, await svc.submit(req.resource, req.user), 'Đã gửi duyệt'));
export const approve = asyncHandler(async (req, res) => sendSuccess(res, await svc.approve(req.resource, req.user), 'Đã duyệt kế hoạch'));
export const reject = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.reject(req.resource, req.user, req.body.reason), 'Đã từ chối kế hoạch'),
);
export const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.resource);
  sendSuccess(res, null, 'Đã xoá kế hoạch');
});
