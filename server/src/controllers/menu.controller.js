import * as svc from '../services/menu.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.list(req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});
export const current = asyncHandler(async (req, res) => sendSuccess(res, await svc.current(req.user, req.query)));
export const getById = asyncHandler(async (req, res) => sendSuccess(res, await svc.getById(req.params.id, req.user)));
export const create = asyncHandler(async (req, res) => sendCreated(res, await svc.create(req.user, req.body), 'Đã tạo thực đơn'));
export const update = asyncHandler(async (req, res) => sendSuccess(res, await svc.update(req.params.id, req.body), 'Đã cập nhật'));
export const submit = asyncHandler(async (req, res) => sendSuccess(res, await svc.submit(req.params.id), 'Đã gửi duyệt'));
export const approve = asyncHandler(async (req, res) => sendSuccess(res, await svc.approve(req.params.id, req.user), 'Đã duyệt thực đơn'));
export const reject = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.reject(req.params.id, req.user, req.body.reason), 'Đã từ chối thực đơn'),
);
export const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.id);
  sendSuccess(res, null, 'Đã xoá thực đơn');
});
