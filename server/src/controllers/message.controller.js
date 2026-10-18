import * as svc from '../services/message.service.js';
import * as uploadService from '../services/upload.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const contacts = asyncHandler(async (req, res) => sendSuccess(res, await svc.contacts(req.user)));
export const conversations = asyncHandler(async (req, res) => sendSuccess(res, await svc.conversations(req.user)));
export const unreadTotal = asyncHandler(async (req, res) => sendSuccess(res, { count: await svc.unreadTotal(req.user) }));
export const history = asyncHandler(async (req, res) => sendSuccess(res, await svc.history(req.user, req.params.userId, req.query)));
export const send = asyncHandler(async (req, res) => sendCreated(res, await svc.send(req.user, req.body), 'Đã gửi'));
export const markRead = asyncHandler(async (req, res) => sendSuccess(res, await svc.markRead(req.user, req.params.userId), 'Đã đọc'));
export const upload = asyncHandler(async (req, res) => {
  const r = await uploadService.uploadBuffer(req.file.buffer, { folder: 'messages', mimetype: req.file.mimetype });
  sendSuccess(res, { url: r.url, key: r.key, type: req.file.mimetype.startsWith('image/') ? 'image' : 'file', name: req.file.originalname }, 'Upload thành công');
});
