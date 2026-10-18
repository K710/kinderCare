import mongoose from 'mongoose';
import { NOTIFICATION_TYPES, NOTIFICATION_SCOPES, ROLE_LIST } from '../config/constants.js';

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 2000 },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system' },
    // Phạm vi gửi: all | role (targetRole) | class (targetClass) | user (targetUsers)
    scope: { type: String, enum: NOTIFICATION_SCOPES, required: true },
    targetRole: { type: String, enum: ROLE_LIST },
    targetClass: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    targetUsers: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    readBy: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    link: { type: String, default: '' }, // đường dẫn client để mở
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null = hệ thống
  },
  { timestamps: true },
);

notificationSchema.index({ scope: 1, targetClass: 1, createdAt: -1 });
notificationSchema.index({ scope: 1, targetRole: 1, createdAt: -1 });
notificationSchema.index({ targetUsers: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
