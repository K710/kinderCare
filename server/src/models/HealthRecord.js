import mongoose from 'mongoose';

const healthRecordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    measuredAt: { type: Date, required: true }, // date-key
    height: { type: Number, required: true, min: 30, max: 200 }, // cm
    weight: { type: Number, required: true, min: 1, max: 100 }, // kg
    bmi: { type: Number }, // service tính
    note: { type: String, default: '', maxlength: 500 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

healthRecordSchema.index({ student: 1, measuredAt: -1 });

export const HealthRecord = mongoose.model('HealthRecord', healthRecordSchema);
