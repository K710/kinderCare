import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'file'], default: 'image' },
    name: { type: String, default: '' },
  },
  { _id: false },
);

// Chat 1-1 giáo viên ↔ phụ huynh. conversationId = `${minId}_${maxId}`
const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, // ngữ cảnh bé đang trao đổi
    content: { type: String, default: '', maxlength: 4000 },
    attachments: { type: [attachmentSchema], default: [] },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, readAt: 1 });

export const conversationIdOf = (a, b) => [String(a), String(b)].sort().join('_');
export const Message = mongoose.model('Message', messageSchema);
