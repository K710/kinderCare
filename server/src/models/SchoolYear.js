import mongoose from 'mongoose';

const schoolYearSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // vd "2025-2026"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    // Chỉ 1 bản ghi true; service setCurrent chịu trách nhiệm unset các bản khác
    isCurrent: { type: Boolean, default: false },
    tuitionDefault: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

schoolYearSchema.index({ isCurrent: 1 });

export const SchoolYear = mongoose.model('SchoolYear', schoolYearSchema);
