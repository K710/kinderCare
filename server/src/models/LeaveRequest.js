import mongoose from 'mongoose';
import { LEAVE_STATUS } from '../config/constants.js';

const leaveRequestSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromDate: { type: Date, required: true }, // date-key
    toDate: { type: Date, required: true }, // date-key, ≥ fromDate
    reason: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: LEAVE_STATUS, default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true },
);

leaveRequestSchema.index({ class: 1, status: 1, fromDate: -1 });
leaveRequestSchema.index({ student: 1, fromDate: -1 });

export const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
