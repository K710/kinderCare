import mongoose from 'mongoose';

const MEAL = ['good', 'normal', 'little', 'none'];
const QUALITY = ['good', 'normal', 'bad'];
const MOOD = ['happy', 'normal', 'sad', 'sick'];

// Nhận xét ngày của giáo viên cho từng bé
const dailyReportSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    date: { type: Date, required: true }, // date-key 00:00 UTC
    meals: {
      breakfast: { type: String, enum: MEAL },
      lunch: { type: String, enum: MEAL },
      snack: { type: String, enum: MEAL },
    },
    sleep: {
      duration: { type: Number, min: 0, max: 600 }, // phút
      quality: { type: String, enum: QUALITY },
    },
    mood: { type: String, enum: MOOD },
    toilet: { type: Number, min: 0, max: 20 },
    activities: { type: [String], default: [] },
    comment: { type: String, default: '', maxlength: 2000 },
    photos: { type: [String], default: [] },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parentSeenAt: { type: Date, default: null },
  },
  { timestamps: true },
);

dailyReportSchema.index({ student: 1, date: 1 }, { unique: true });
dailyReportSchema.index({ class: 1, date: 1 });

export const DAILY_REPORT_ENUMS = { MEAL, QUALITY, MOOD };
export const DailyReport = mongoose.model('DailyReport', dailyReportSchema);
