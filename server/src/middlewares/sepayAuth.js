import crypto from 'crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { writeAudit } from './auditLog.js';

// Ghi lại cả lần gọi webhook bị từ chối (dò key, cấu hình sai) để admin đối soát
function auditRejected(req, statusCode, reason) {
  writeAudit({
    user: null,
    action: 'SEPAY_WEBHOOK',
    resource: 'Payment',
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    payload: { body: req.body, result: { ok: false, reason } },
    statusCode,
  });
}

// Xác thực webhook SePay: header "Authorization: Apikey {SEPAY_WEBHOOK_KEY}"
export function sepayAuth(req, res, next) {
  if (!env.SEPAY_WEBHOOK_KEY) {
    auditRejected(req, 503, 'not_configured');
    return next(new ApiError(503, 'Chưa cấu hình SEPAY_WEBHOOK_KEY', { code: 'SEPAY_NOT_CONFIGURED' }));
  }
  const header = req.headers.authorization || '';
  const [scheme, key] = header.split(' ');
  const expected = Buffer.from(env.SEPAY_WEBHOOK_KEY);
  const given = Buffer.from(key || '');
  const ok = scheme === 'Apikey' && given.length === expected.length && crypto.timingSafeEqual(given, expected);
  if (!ok) {
    auditRejected(req, 401, 'unauthorized');
    return next(ApiError.unauthorized('API key webhook không hợp lệ', { code: 'WEBHOOK_UNAUTHORIZED' }));
  }
  next();
}
