import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLE_LIST } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLE_LIST, required: true },
    honorific: { type: String, enum: ['co', 'thay', ''], default: '' }, // danh xưng GV: cô / thầy
    avatar: { type: String, default: '' },
    avatarPublicId: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    // Bật khi tạo tài khoản / đặt lại mật khẩu; đăng nhập xong phải đổi mật khẩu mới dùng được app
    mustChangePassword: { type: Boolean, default: false },
    // Lưu hash SHA-256 của refresh token, tối đa MAX_REFRESH_TOKENS thiết bị
    refreshTokens: { type: [String], default: [], select: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, isActive: 1 });

// Hash mật khẩu khi tạo/đổi (hash kỹ thuật, không phải logic nghiệp vụ)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.refreshTokens;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
