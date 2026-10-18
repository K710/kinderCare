import * as svc from '../services/dailyReport.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listByClass = asyncHandler(async (req, res) => sendSuccess(res, await svc.listByClass(req.query)));
export const listByStudent = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.listByStudent(req.params.studentId, req.query)),
);
export const getById = asyncHandler(async (req, res) => sendSuccess(res, await svc.getById(req.resource._id)));
export const create = asyncHandler(async (req, res) =>
  sendCreated(res, await svc.create(req.user, req.body), 'Đã tạo nhận xét'),
);
export const bulkCreate = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.bulkCreate(req.user, req.body), 'Đã lưu nhận xét cho lớp'),
);
export const update = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.update(req.resource, req.body), 'Đã cập nhật'),
);
export const markSeen = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.markSeen(req.resource), 'Đã đánh dấu đã xem'),
);
export const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.resource);
  sendSuccess(res, null, 'Đã xoá nhận xét');
});
