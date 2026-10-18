import * as svc from '../services/notification.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listMine = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.listMine(req.user, req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});
export const unreadCount = asyncHandler(async (req, res) => sendSuccess(res, { count: await svc.unreadCount(req.user) }));
export const markRead = asyncHandler(async (req, res) => sendSuccess(res, await svc.markRead(req.user, req.params.id), 'Đã đọc'));
export const markAllRead = asyncHandler(async (req, res) => sendSuccess(res, await svc.markAllRead(req.user), 'Đã đọc tất cả'));
export const create = asyncHandler(async (req, res) => sendCreated(res, await svc.createManual(req.user, req.body), 'Đã gửi thông báo'));
export const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.id);
  sendSuccess(res, null, 'Đã xoá thông báo');
});
