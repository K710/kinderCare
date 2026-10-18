import mongoose from 'mongoose';
import { TUITION_STATUS } from '../config/constants.js';

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 100 }, // Học phí, Tiền ăn, Năng khiếu…
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const tuitionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    schoolYear: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolYear', required: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ }, // YYYY-MM
    items: { type: [itemSchema], default: [] },
    amount: { type: Number, required: true, min: 0 }, // service tính = Σ items
    paidAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: TUITION_STATUS, default: 'unpaid' },
    // HP + 8 ký tự, service sinh; phụ huynh ghi vào nội dung chuyển khoản
    paymentCode: { type: String, required: true, unique: true, match: /^HP[A-Z0-9]{8}$/ },
    note: { type: String, default: '', maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

tuitionSchema.index({ student: 1, month: 1 }, { unique: true });
tuitionSchema.index({ class: 1, month: 1 });
tuitionSchema.index({ status: 1, dueDate: 1 });

export const Tuition = mongoose.model('Tuition', tuitionSchema);
