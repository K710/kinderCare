import mongoose from 'mongoose';
import { z } from 'zod';
import { Payment } from '../models/Payment.js';
import { Tuition } from '../models/Tuition.js';
import { Student } from '../models/Student.js';
import { applyPayment } from './tuition.service.js';
import { notify } from './notification.service.js';
import { emitToUsers } from '../sockets/emitter.js';
import { writeAudit } from '../middlewares/auditLog.js';
import { logger } from '../utils/logger.js';
import { PAYMENT_CODE_REGEX } from '../utils/generateCode.js';
import { dayjs } from '../utils/date.js';
import { TIMEZONE } from '../config/constants.js';

// Body webhook SePay (docs.sepay.vn/tich-hop-webhooks.html): id, gateway, transactionDate "YYYY-MM-DD HH:mm:ss",
// accountNumber, subAccount, code, content, transferType in|out, description, transferAmount, accumulated, referenceCode
export const webhookSchema = z.object({
  id: z.coerce.number().int().positive(),
  gateway: z.string().optional().default(''),
  transactionDate: z.string().optional(),
  accountNumber: z.string().optional().default(''),
  subAccount: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  content: z.string().nullable().optional().default(''),
  transferType: z.string(),
  description: z.string().nullable().optional(),
  transferAmount: z.coerce.number(),
  accumulated: z.coerce.number().optional(),
  referenceCode: z.string().nullable().optional().default(''),
}).passthrough();

// Chuẩn hoá nội dung CK: viết hoa, bỏ khoảng trắng và dấu gạch (ngân hàng hay chèn "HP A1B2-C3D4")
export const normalizeContent = (s = '') => String(s).toUpperCase().replace(/[\s\-_]/g, '');

// Trả về mã duy nhất tìm thấy, null nếu 0 hoặc ≥2 mã khác nhau
export function extractPaymentCode(content, fallbackCode) {
  const found = [...new Set(normalizeContent(content).match(PAYMENT_CODE_REGEX) || [])];
  if (found.length === 1) return { code: found[0], count: 1 };
  if (found.length === 0 && fallbackCode) {
    const fb = normalizeContent(fallbackCode).match(PAYMENT_CODE_REGEX) || [];
    if (fb.length === 1) return { code: fb[0], count: 1, fromCodeField: true };
  }
  return { code: null, count: found.length };
}

// SePay gửi giờ VN dạng "2024-07-02 11:08:33"
function parseSepayDate(s) {
  if (!s) return new Date();
  const d = dayjs.tz(s, 'YYYY-MM-DD HH:mm:ss', TIMEZONE);
  return d.isValid() ? d.toDate() : new Date();
}

// Sau khi tiền vào: thông báo + socket cho PH của bé
export async function notifyPaymentSuccess(tuition, payment, { manual = false } = {}) {
  const st = await Student.findById(tuition.student).select('fullName parents').lean();
  if (!st) return;
  const parents = st.parents.map(String);
  const payload = {
    tuitionId: tuition._id,
    paymentCode: tuition.paymentCode,
    amount: payment.amount,
    paidAmount: tuition.paidAmount,
    totalAmount: tuition.amount,
    status: tuition.status,
    month: tuition.month,
  };
  emitToUsers(parents, 'payment:success', payload);
  await notify({
    title: 'Đã nhận thanh toán học phí',
    body: `Đã nhận ${payment.amount.toLocaleString('vi-VN')}đ cho học phí tháng ${tuition.month} của bé ${st.fullName}${manual ? ' (ghi nhận thủ công)' : ''}. Trạng thái: ${tuition.status}.`,
    type: 'payment',
    scope: 'user',
    targetUsers: parents,
    link: `/parent/tuitions/${tuition._id}`,
  });
}

/**
 * Xử lý webhook. Thứ tự: bỏ qua tiền ra → chống trùng → LƯU Payment kèm rawPayload → tìm mã → transaction cộng tiền.
 * - Lưu Payment thất bại (lỗi DB) → THROW → route trả 5xx để SePay gửi lại.
 * - Đã lưu Payment mà bước khớp lỗi → giữ unmatched kèm ghi chú, vẫn trả 200 (HT đối soát tay).
 */
export async function processWebhook(raw, meta = {}) {
  const parsed = webhookSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn('Webhook SePay sai định dạng', { issues: parsed.error.issues });
    return { ok: false, reason: 'invalid_payload', issues: parsed.error.issues };
  }
  const body = parsed.data;

  if (body.transferType !== 'in') return { ok: true, ignored: true, reason: 'not_incoming' };
  if (body.transferAmount <= 0) return { ok: true, ignored: true, reason: 'non_positive_amount' };

  // Chống trùng (SePay retry tới 7 lần)
  if (await Payment.exists({ sepayId: body.id })) return { ok: true, duplicate: true };

  // Lưu bằng chứng trước, chưa khớp
  let payment;
  try {
    payment = await Payment.create({
      sepayId: body.id,
      method: 'bank',
      gateway: body.gateway,
      transactionDate: parseSepayDate(body.transactionDate),
      accountNumber: body.accountNumber,
      content: body.content || '',
      transferType: body.transferType,
      amount: body.transferAmount,
      referenceCode: body.referenceCode || '',
      status: 'unmatched',
      rawPayload: raw,
    });
  } catch (err) {
    if (err.code === 11000) return { ok: true, duplicate: true }; // race giữa 2 retry
    logger.error('Không lưu được Payment từ webhook', { sepayId: body.id, err: err.message });
    throw err; // → 5xx, SePay retry
  }

  const { code, count } = extractPaymentCode(body.content, body.code);
  if (!code) {
    await Payment.updateOne({ _id: payment._id }, { $set: { note: count >= 2 ? 'Nội dung chứa nhiều mã HP' : 'Không tìm thấy mã HP' } });
    return { ok: true, matched: false, paymentId: payment._id, reason: count >= 2 ? 'multiple_codes' : 'no_code' };
  }

  const tuition = await Tuition.findOne({ paymentCode: code }).select('_id');
  if (!tuition) {
    await Payment.updateOne({ _id: payment._id }, { $set: { paymentCode: code, note: 'Mã HP không tồn tại' } });
    return { ok: true, matched: false, paymentId: payment._id, reason: 'tuition_not_found', code };
  }

  // Cộng tiền + đánh dấu khớp trong 1 transaction. Lỗi ở đây không làm mất bằng chứng: Payment vẫn unmatched
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      updated = await applyPayment(tuition._id, body.transferAmount, { session, source: 'SePay' });
      await Payment.updateOne(
        { _id: payment._id },
        { $set: { status: 'matched', tuition: tuition._id, paymentCode: code } },
        { session },
      );
    });
  } catch (err) {
    logger.error('Khớp tự động thất bại, giữ unmatched', { paymentId: payment._id, err: err.message });
    await Payment.updateOne({ _id: payment._id }, { $set: { paymentCode: code, note: `Lỗi khớp tự động, cần đối soát: ${err.message}` } }).catch(() => {});
    return { ok: true, matched: false, paymentId: payment._id, reason: 'match_failed', code };
  } finally {
    await session.endSession();
  }

  payment.amount = body.transferAmount;
  notifyPaymentSuccess(updated, payment).catch((err) => logger.warn('Không gửi được thông báo thanh toán', { err: err.message }));
  return { ok: true, matched: true, paymentId: payment._id, tuitionId: tuition._id, code, status: updated.status };
}

// Ghi AuditLog toàn bộ body webhook (kể cả khi 401)
export function auditWebhook(req, statusCode, extra = {}) {
  return writeAudit({
    user: null,
    action: 'SEPAY_WEBHOOK',
    resource: 'Payment',
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    payload: { body: req.body, result: extra },
    statusCode,
  });
}
