import mongoose from 'mongoose';
import { AGE_GROUPS } from '../config/constants.js';

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ageGroup: { type: String, enum: AGE_GROUPS, required: true },
    schoolYear: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolYear', required: true },
    teachers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
      validate: [(v) => v.length <= 3, 'Tối đa 3 giáo viên / lớp'],
    },
    room: { type: String, trim: true, default: '' },
    capacity: { type: Number, default: 30, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

classSchema.index({ schoolYear: 1, name: 1 }, { unique: true });
classSchema.index({ teachers: 1 });

// Danh sách học sinh populate ngược từ Student.class
classSchema.virtual('students', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'class',
  match: { status: 'active' },
});

export const Class = mongoose.model('Class', classSchema);
