import mongoose from 'mongoose';
import { Payment } from '../models/Payment.js';
import { Tuition } from '../models/Tuition.js';
import { Student } from '../models/Student.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildPagination } from '../utils/paginate.js';
import { escapeRegex } from '../validators/common.validator.js';
import { applyPayment } from './tuition.service.js';
import { notifyPaymentSuccess } from './sepay.service.js';
import { notify } from './notification.service.js';
import { writeAudit } from '../middlewares/auditLog.js';
import { ROLES } from '../config/constants.js';
import { logger } from '../utils/logger.js';

const POP = [
  { path: 'tuition', select: 'student month amount paidAmount status paymentCode', populate: { path: 'student', select: 'fullName' } },
  { path: 'assignedBy', select: 'fullName' },
];

export async function list(query) {
  const pg = parsePagination(query, { defaultSort: '-transactionDate' });
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.method) filter.method = query.method;
  if (query.tuition) filter.tuition = query.tuition;
  if (query.from || query.to) {
    filter.transactionDate = {};
    if (query.from) filter.transactionDate.$gte = query.from;
    if (query.to) filter.transactionDate.$lte = query.to;
  }
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ paymentCode: rx }, { content: rx }, { referenceCode: rx }];
  }
  const [items, total] = await Promise.all([
    Payment.find(filter).select('-rawPayload').populate(POP).sort(pg.sort).skip(pg.skip).limit(pg.limit),
    Payment.countDocuments(filter),
  ]);
  return { items, pagination: buildPagination(pg, total) };
}

export const listUnmatched = (query) => list({ ...query, status: 'unmatched' });

export async function getById(id) {
  const p = await Payment.findById(id).populate(POP);
  if (!p) throw ApiError.notFound('Không tìm thấy giao dịch');
  return p;
}

// Trạng thái theo mã HP cho client polling. PH chỉ xem học phí của con mình.
export async function statusByCode(user, paymentCode) {
  const t = await Tuition.findOne({ paymentCode }).select('student month amount paidAmount status dueDate paymentCode updatedAt').lean();
  if (!t) throw ApiError.notFound('Mã thanh toán không tồn tại');
  if (user.role === ROLES.PARENT && !(await Student.exists({ _id: t.student, parents: user.id }))) {
    throw ApiError.forbidden('Không phải học phí của con bạn');
  }
  const last = await Payment.findOne({ tuition: t._id }).select('amount transactionDate status method').sort('-transactionDate -createdAt').lean();
  return {
    paymentCode: t.paymentCode,
    tuitionId: t._id,
    month: t.month,
    amount: t.amount,
    paidAmount: t.paidAmount,
    remaining: Math.max(0, t.amount - t.paidAmount),
    status: t.status,
    isPaid: t.status === 'paid',
    lastPayment: last,
    updatedAt: t.updatedAt,
  };
}

async function audit(user, action, payment, extra) {
  return writeAudit({ user: user.id, action, resource: 'Payment', resourceId: payment._id, payload: extra });
}

// Gán tay giao dịch chưa khớp vào 1 Tuition
export async function assign(user, paymentId, tuitionId, note = '') {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw ApiError.notFound('Không tìm thấy giao dịch');
  if (payment.status !== 'unmatched') throw ApiError.badRequest('Giao dịch đã được gán, hãy gỡ gán trước');
  const tuition = await Tuition.findById(tuitionId).select('paymentCode');
  if (!tuition) throw ApiError.notFound('Không tìm thấy học phí');

  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      updated = await applyPayment(tuitionId, payment.amount, { session, source: 'Gán tay' });
      payment.set({ status: 'manual', tuition: tuitionId, paymentCode: tuition.paymentCode, assignedBy: user.id, assignedAt: new Date(), note });
      await payment.save({ session });
    });
  } finally {
    await session.endSession();
  }
  await audit(user, 'ASSIGN_PAYMENT', payment, { tuitionId, amount: payment.amount, note });
  notifyPaymentSuccess(updated, payment, { manual: true }).catch((err) => logger.warn('notify assign lỗi', { err: err.message }));
  return getById(paymentId);
}

// Gỡ gán: trừ tiền qua applyPayment (số âm), trả giao dịch về unmatched. Bắt buộc lý do.
export async function unassign(user, paymentId, reason) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw ApiError.notFound('Không tìm thấy giao dịch');
  if (!payment.tuition) throw ApiError.badRequest('Giao dịch chưa được gán');
  if (payment.method === 'cash') throw ApiError.badRequest('Giao dịch tiền mặt không gỡ gán được, hãy xoá bản ghi');
  const before = { tuition: payment.tuition, status: payment.status, paymentCode: payment.paymentCode };

  const session = await mongoose.startSession();
  let tuition;
  try {
    await session.withTransaction(async () => {
      tuition = await applyPayment(payment.tuition, -payment.amount, { session, source: 'Gỡ gán' });
      payment.set({ status: 'unmatched', tuition: null, assignedBy: null, assignedAt: null, note: `Gỡ gán: ${reason}` });
      await payment.save({ session });
    });
  } finally {
    await session.endSession();
  }
  await audit(user, 'UNASSIGN_PAYMENT', payment, { reason, before, amount: payment.amount, tuitionAfter: { paidAmount: tuition.paidAmount, status: tuition.status } });

  const st = await Student.findById(tuition.student).select('fullName parents').lean();
  if (st?.parents?.length) {
    await notify({
      title: 'Điều chỉnh thanh toán học phí',
      body: `Một giao dịch ${payment.amount.toLocaleString('vi-VN')}đ của học phí tháng ${tuition.month} (bé ${st.fullName}) đã được nhà trường gỡ khỏi hồ sơ. Lý do: ${reason}`,
      type: 'payment', scope: 'user', targetUsers: st.parents, link: `/parent/tuitions/${tuition._id}`, sender: user.id,
    });
  }
  return getById(paymentId);
}

// HT ghi nhận thu tiền mặt
export async function manual(user, { tuitionId, amount, note = '', transactionDate }) {
  const tuition = await Tuition.findById(tuitionId).select('paymentCode');
  if (!tuition) throw ApiError.notFound('Không tìm thấy học phí');

  const session = await mongoose.startSession();
  let payment, updated;
  try {
    await session.withTransaction(async () => {
      updated = await applyPayment(tuitionId, amount, { session, source: 'Tiền mặt' });
      [payment] = await Payment.create(
        [{
          method: 'cash', gateway: 'CASH', transactionDate: transactionDate || new Date(), amount, content: note,
          paymentCode: tuition.paymentCode, tuition: tuitionId, status: 'manual', assignedBy: user.id, assignedAt: new Date(), note,
        }],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  await audit(user, 'MANUAL_PAYMENT', payment, { tuitionId, amount, note });
  notifyPaymentSuccess(updated, payment, { manual: true }).catch((err) => logger.warn('notify manual lỗi', { err: err.message }));
  return getById(payment._id);
}

// Xoá bản ghi tiền mặt ghi nhầm (hoàn tiền qua applyPayment âm). Bắt buộc lý do.
export async function removeCash(user, paymentId, reason) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw ApiError.notFound('Không tìm thấy giao dịch');
  if (payment.method !== 'cash') throw ApiError.badRequest('Chỉ xoá được giao dịch tiền mặt; giao dịch ngân hàng dùng gỡ gán');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await applyPayment(payment.tuition, -payment.amount, { session, source: 'Xoá tiền mặt' });
      await payment.deleteOne({ session });
    });
  } finally {
    await session.endSession();
  }
  await audit(user, 'DELETE_CASH_PAYMENT', payment, { reason, tuitionId: payment.tuition, amount: payment.amount });
}
