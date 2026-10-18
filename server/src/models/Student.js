import mongoose from 'mongoose';
import { GENDERS, STUDENT_STATUS } from '../config/constants.js';

const studentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    nickname: { type: String, trim: true, default: '' },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: GENDERS, required: true },
    avatar: { type: String, default: '' },
    avatarPublicId: { type: String, default: '' },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    // Nguồn duy nhất về quan hệ PH–bé (không lưu ngược ở User)
    parents: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    enrollDate: { type: Date, default: Date.now },
    status: { type: String, enum: STUDENT_STATUS, default: 'active' },
    // Trường nhạy cảm: service chỉ trả cho GV lớp / HT / admin / PH của bé
    allergies: { type: [String], default: [] },
    medicalNotes: { type: String, default: '' },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relation: { type: String, default: '' },
    },
  },
  { timestamps: true },
);

studentSchema.index({ class: 1, status: 1 });
studentSchema.index({ parents: 1 });
studentSchema.index({ fullName: 'text' });

// Các trường cần ẩn với người không có quyền (dùng trong service: .select(STUDENT_PUBLIC_FIELDS))
export const STUDENT_SENSITIVE_FIELDS = ['allergies', 'medicalNotes'];
export const STUDENT_PUBLIC_SELECT = '-allergies -medicalNotes';

export const Student = mongoose.model('Student', studentSchema);
