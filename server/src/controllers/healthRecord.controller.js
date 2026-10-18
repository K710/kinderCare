import * as svc from '../services/healthRecord.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listByStudent = asyncHandler(async (req, res) => sendSuccess(res, await svc.listByStudent(req.params.studentId)));
export const create = asyncHandler(async (req, res) => sendCreated(res, await svc.create(req.user, req.body), 'Đã lưu lần đo'));
export const bulkCreate = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.bulkCreate(req.user, req.body), 'Đã lưu kết quả đo cả lớp'),
);
export const update = asyncHandler(async (req, res) => sendSuccess(res, await svc.update(req.resource, req.body), 'Đã cập nhật'));
export const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.resource);
  sendSuccess(res, null, 'Đã xoá lần đo');
});
