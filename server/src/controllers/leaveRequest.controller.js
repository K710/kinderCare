import * as svc from '../services/leaveRequest.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.list(req.user, req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});
export const my = asyncHandler(async (req, res) => sendSuccess(res, await svc.my(req.user.id, req.query)));
export const getById = asyncHandler(async (req, res) => sendSuccess(res, await svc.getById(req.resource)));
export const create = asyncHandler(async (req, res) => sendCreated(res, await svc.create(req.user, req.body), 'Đã gửi đơn xin nghỉ'));
export const update = asyncHandler(async (req, res) => sendSuccess(res, await svc.update(req.resource, req.user, req.body), 'Đã cập nhật đơn'));
export const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.resource, req.user);
  sendSuccess(res, null, 'Đã huỷ đơn');
});
export const approve = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.approve(req.resource, req.user, req.body.note), 'Đã duyệt đơn nghỉ'),
);
export const reject = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.reject(req.resource, req.user, req.body.note), 'Đã từ chối đơn nghỉ'),
);
