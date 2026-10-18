import mongoose from 'mongoose';
import { MEDICINE_STATUS } from '../config/constants.js';

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 150 },
    dosage: { type: String, required: true, maxlength: 100 }, // "5ml", "1 viên"
    time: { type: String, required: true, maxlength: 100 }, // "Sau ăn trưa"
    note: { type: String, default: '', maxlength: 300 },
  },
  { _id: false },
);

const logSchema = new mongoose.Schema(
  {
    givenAt: { type: Date, required: true },
    givenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, default: '', maxlength: 300 },
  },
  { _id: true },
);

// Dặn thuốc của phụ huynh, giáo viên xác nhận và ghi lịch sử cho uống
const medicineNoteSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    medicines: { type: [medicineSchema], required: true, validate: [(v) => v.length > 0, 'Cần ít nhất 1 loại thuốc'] },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    status: { type: String, enum: MEDICINE_STATUS, default: 'pending' },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmedAt: { type: Date },
    logs: { type: [logSchema], default: [] },
  },
  { timestamps: true },
);

medicineNoteSchema.index({ class: 1, status: 1 });
medicineNoteSchema.index({ student: 1, fromDate: -1 });

export const MedicineNote = mongoose.model('MedicineNote', medicineNoteSchema);
