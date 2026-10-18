import * as svc from '../services/attendance.service.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listByClass = asyncHandler(async (req, res) => sendSuccess(res, await svc.listByClass(req.query)));
export const studentHistory = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.studentHistory(req.params.studentId, req.query.month)),
);
export const bulkMark = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.bulkMark(req.user, req.body), 'Đã lưu điểm danh'),
);
export const update = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.update(req.resource, req.body), 'Đã cập nhật'),
);
export const stats = asyncHandler(async (req, res) => sendSuccess(res, await svc.stats(req.query)));
