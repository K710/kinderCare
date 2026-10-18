import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const sepayConfigured = () => !!(env.SEPAY_ACCOUNT && env.SEPAY_BANK);

// Thông tin chuyển khoản + ảnh VietQR của SePay cho 1 Tuition (số tiền = còn phải thu)
export function buildQR(tuition) {
  if (!sepayConfigured()) throw new ApiError(503, 'Chưa cấu hình tài khoản nhận tiền SePay', { code: 'SEPAY_NOT_CONFIGURED' });
  const remaining = Math.max(0, tuition.amount - tuition.paidAmount);
  const params = new URLSearchParams({
    acc: env.SEPAY_ACCOUNT,
    bank: env.SEPAY_BANK,
    amount: String(remaining),
    des: tuition.paymentCode,
  });
  return {
    qrUrl: `https://qr.sepay.vn/img?${params.toString()}`,
    account: env.SEPAY_ACCOUNT,
    bank: env.SEPAY_BANK,
    accountName: env.SEPAY_ACCOUNT_NAME,
    amount: remaining,
    totalAmount: tuition.amount,
    paidAmount: tuition.paidAmount,
    paymentCode: tuition.paymentCode,
    status: tuition.status,
    month: tuition.month,
    // Nhắc PH: nội dung CK chỉ ghi đúng 1 mã; mỗi bé chuyển khoản riêng
    instruction: `Chuyển khoản đúng số tiền, nội dung ghi "${tuition.paymentCode}". Mỗi bé chuyển khoản riêng, không gộp nhiều mã.`,
  };
}
