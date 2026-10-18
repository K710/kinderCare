import mongoose from 'mongoose';
import { ATTENDANCE_STATUS } from '../config/constants.js';

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    // Snapshot lớp lúc điểm danh để query theo lớp không cần join
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    date: { type: Date, required: true }, // date-key 00:00 UTC
    status: { type: String, enum: ATTENDANCE_STATUS, required: true },
    checkInAt: { type: Date },
    checkOutAt: { type: Date },
    note: { type: String, default: '', maxlength: 500 },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ class: 1, date: 1 });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
