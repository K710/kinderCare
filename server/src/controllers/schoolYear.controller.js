import * as svc from '../services/schoolYear.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => sendSuccess(res, await svc.list()));
export const getCurrent = asyncHandler(async (req, res) => sendSuccess(res, await svc.getCurrent()));
export const getById = asyncHandler(async (req, res) => sendSuccess(res, await svc.getById(req.params.id)));

export const create = asyncHandler(async (req, res) =>
  sendCreated(res, await svc.create(req.body), 'Tạo năm học thành công'),
);
export const update = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.update(req.params.id, req.body), 'Cập nhật thành công'),
);
export const setCurrent = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.setCurrent(req.params.id), 'Đã đặt làm năm học hiện tại'),
);
export const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.id);
  sendSuccess(res, null, 'Đã xoá năm học');
});
