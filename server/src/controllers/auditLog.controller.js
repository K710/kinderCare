import * as svc from '../services/auditLog.service.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.list(req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});
export const getById = asyncHandler(async (req, res) => sendSuccess(res, await svc.getById(req.params.id)));
export const actions = asyncHandler(async (req, res) => sendSuccess(res, await svc.actions()));
