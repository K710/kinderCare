import * as svc from '../services/medicineNote.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.list(req.user, req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});
export const my = asyncHandler(async (req, res) => sendSuccess(res, await svc.my(req.user.id, req.query)));
export const getById = asyncHandler(async (req, res) => sendSuccess(res, await svc.getById(req.resource)));
export const create = asyncHandler(async (req, res) => sendCreated(res, await svc.create(req.user, req.body), 'Đã gửi dặn thuốc'));
export const update = asyncHandler(async (req, res) => sendSuccess(res, await svc.update(req.resource, req.user, req.body), 'Đã cập nhật'));
export const cancel = asyncHandler(async (req, res) => sendSuccess(res, await svc.cancel(req.resource, req.user), 'Đã huỷ dặn thuốc'));
export const confirm = asyncHandler(async (req, res) => sendSuccess(res, await svc.confirm(req.resource, req.user), 'Đã xác nhận nhận thuốc'));
export const addLog = asyncHandler(async (req, res) => sendSuccess(res, await svc.addLog(req.resource, req.user, req.body), 'Đã ghi nhận cho uống'));
export const done = asyncHandler(async (req, res) => sendSuccess(res, await svc.done(req.resource), 'Đã hoàn tất'));
