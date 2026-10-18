import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '../config/constants.js';

// Giao dịch tiền vào: từ webhook SePay (method bank) hoặc hiệu trưởng ghi tay tiền mặt (method cash)
const paymentSchema = new mongoose.Schema(
  {
    sepayId: { type: Number, default: null }, // id giao dịch SePay, null nếu ghi tay
    method: { type: String, enum: ['bank', 'cash'], default: 'bank' },
    gateway: { type: String, default: '' },
    transactionDate: { type: Date, default: Date.now },
    accountNumber: { type: String, default: '' },
    content: { type: String, default: '' }, // nội dung CK gốc
    transferType: { type: String, default: 'in' },
    amount: { type: Number, required: true, min: 1 }, // transferAmount
    referenceCode: { type: String, default: '' },
    paymentCode: { type: String, default: null }, // mã HP tách từ content (hoặc của Tuition khi gán tay)
    tuition: { type: mongoose.Schema.Types.ObjectId, ref: 'Tuition', default: null },
    // matched: webhook tự khớp | unmatched: chờ đối soát | manual: HT gán tay / tiền mặt
    status: { type: String, enum: PAYMENT_STATUS, default: 'unmatched' },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedAt: { type: Date, default: null },
    note: { type: String, default: '', maxlength: 500 },
    // Bằng chứng giao dịch: toàn bộ body webhook, không phụ thuộc AuditLog
    rawPayload: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

// Chống trùng webhook: chỉ áp cho giao dịch SePay (có số), tiền mặt sepayId=null không bị tính trùng
paymentSchema.index({ sepayId: 1 }, { unique: true, partialFilterExpression: { sepayId: { $type: 'number' } } });
paymentSchema.index({ tuition: 1 });
paymentSchema.index({ status: 1, transactionDate: -1 });
paymentSchema.index({ paymentCode: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
