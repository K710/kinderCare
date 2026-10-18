import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

const SECRET_KEYS = ['password', 'newPassword', 'currentPassword', 'refreshToken', 'token'];

// Lược bỏ trường nhạy cảm trước khi lưu body
export function sanitize(body) {
  if (!body || typeof body !== 'object') return body;
  if (Array.isArray(body)) return body.map(sanitize);
  const out = {};
  for (const [k, v] of Object.entries(body)) {
    out[k] = SECRET_KEYS.includes(k) ? '***' : typeof v === 'object' ? sanitize(v) : v;
  }
  return out;
}

// Ghi log trực tiếp (dùng cho webhook, service)
export function writeAudit(data) {
  return AuditLog.create(data).catch((err) => logger.warn('Không ghi được AuditLog', { err: err.message }));
}

/**
 * audit('CREATE_TUITION', 'Tuition') – ghi sau khi response kết thúc, không chặn request.
 * resourceId lấy từ res.locals.resourceId → req.params.id.
 * Mặc định chỉ ghi khi 2xx; truyền { always: true } để ghi cả lỗi (vd LOGIN thất bại).
 */
export const audit = (action, resource = '', { always = false } = {}) => (req, res, next) => {
  res.on('finish', () => {
    if (!always && (res.statusCode < 200 || res.statusCode >= 300)) return;
    const rid = res.locals.resourceId || req.params?.id;
    writeAudit({
      user: req.user?.id || null,
      action,
      resource,
      resourceId: mongoose.isValidObjectId(rid) ? rid : null,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      payload: sanitize(req.body),
      statusCode: res.statusCode,
    });
  });
  next();
};
