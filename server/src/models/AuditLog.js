import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = webhook / ẩn danh
    action: { type: String, required: true }, // vd LOGIN, CREATE_TUITION, SEPAY_WEBHOOK
    resource: { type: String, default: '' }, // tên model
    resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    method: { type: String },
    path: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed }, // body đã lược password
    statusCode: { type: Number },
  },
  { timestamps: true },
);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
// Tự xoá sau 180 ngày
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
