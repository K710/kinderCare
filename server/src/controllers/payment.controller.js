import * as svc from '../services/payment.service.js';
import * as sepay from '../services/sepay.service.js';
import { buildQR } from '../services/qr.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';

// Webhook: luôn 200 { success: true } khi đã xử lý (kể cả trùng / không khớp); 400 nếu body không đúng định dạng SePay
export const sepayWebhook = asyncHandler(async (req, res) => {
  let result;
  try {
    result = await sepay.processWebhook(req.body, { ip: req.ip });
  } catch (err) {
    // Chưa lưu được Payment → ghi log rồi để errorHandler trả 500, SePay sẽ gửi lại
    sepay.auditWebhook(req, 500, { ok: false, reason: 'db_error', error: err.message });
    throw err;
  }
  const statusCode = result.ok ? 200 : 400;
  sepay.auditWebhook(req, statusCode, result);
  if (!result.ok) {
    return res.status(400).json({ success: false, message: 'Payload không hợp lệ', errors: result.issues });
  }
  logger.info('SePay webhook', { id: req.body?.id, matched: result.matched, duplicate: result.duplicate, reason: result.reason });
  res.status(200).json({ success: true });
});

export const status = asyncHandler(async (req, res) => sendSuccess(res, await svc.statusByCode(req.user, req.params.paymentCode)));
export const qr = asyncHandler(async (req, res) => sendSuccess(res, buildQR(req.resource)));

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.list(req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});
export const unmatched = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.listUnmatched(req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});
export const getById = asyncHandler(async (req, res) => sendSuccess(res, await svc.getById(req.params.id)));
export const assign = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.assign(req.user, req.params.id, req.body.tuitionId, req.body.note), 'Đã gán giao dịch vào học phí'),
);
export const unassign = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.unassign(req.user, req.params.id, req.body.reason), 'Đã gỡ gán giao dịch'),
);
export const manual = asyncHandler(async (req, res) => sendCreated(res, await svc.manual(req.user, req.body), 'Đã ghi nhận thu tiền mặt'));
export const removeCash = asyncHandler(async (req, res) => {
  await svc.removeCash(req.user, req.params.id, req.body.reason);
  sendSuccess(res, null, 'Đã xoá giao dịch tiền mặt');
});
