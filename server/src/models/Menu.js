import mongoose from 'mongoose';
import { AGE_GROUPS, APPROVAL_STATUS } from '../config/constants.js';

const daySchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 1, max: 5, required: true }, // 1 = Thứ 2
    breakfast: { type: [String], default: [] },
    lunch: { type: [String], default: [] },
    snack: { type: [String], default: [] },
    note: { type: String, default: '', maxlength: 300 },
  },
  { _id: false },
);

// Thực đơn theo tuần cho một nhóm tuổi, hiệu trưởng duyệt
const menuSchema = new mongoose.Schema(
  {
    weekStart: { type: Date, required: true }, // thứ 2, date-key
    ageGroup: { type: String, enum: [...AGE_GROUPS, 'all'], default: 'all' },
    days: { type: [daySchema], default: [] },
    status: { type: String, enum: APPROVAL_STATUS, default: 'draft' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectReason: { type: String, default: '' },
  },
  { timestamps: true },
);

menuSchema.index({ weekStart: 1, ageGroup: 1 }, { unique: true });
menuSchema.index({ status: 1 });

export const Menu = mongoose.model('Menu', menuSchema);
