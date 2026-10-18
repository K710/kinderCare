import mongoose from 'mongoose';
import { APPROVAL_STATUS } from '../config/constants.js';

const activitySchema = new mongoose.Schema(
  {
    time: { type: String, default: '' }, // "08:00-08:30"
    title: { type: String, required: true, maxlength: 200 },
    goal: { type: String, default: '', maxlength: 500 },
    materials: { type: String, default: '', maxlength: 500 },
  },
  { _id: false },
);

const daySchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 1, max: 5, required: true },
    activities: { type: [activitySchema], default: [] },
  },
  { _id: false },
);

// Kế hoạch giảng dạy theo tuần của lớp, giáo viên soạn, hiệu trưởng duyệt
const lessonPlanSchema = new mongoose.Schema(
  {
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    weekStart: { type: Date, required: true },
    theme: { type: String, default: '', maxlength: 200 },
    days: { type: [daySchema], default: [] },
    status: { type: String, enum: APPROVAL_STATUS, default: 'draft' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectReason: { type: String, default: '' },
    attachments: { type: [String], default: [] },
  },
  { timestamps: true },
);

lessonPlanSchema.index({ class: 1, weekStart: 1 }, { unique: true });
lessonPlanSchema.index({ status: 1 });

export const LessonPlan = mongoose.model('LessonPlan', lessonPlanSchema);
