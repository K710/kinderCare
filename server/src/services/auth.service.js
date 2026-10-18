import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import { ApiError } from '../utils/ApiError.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/jwt.js';
import { MAX_REFRESH_TOKENS, ROLES } from '../config/constants.js';
import { generateTempPassword } from '../utils/password.js';

function issueTokens(user) {
  return { accessToken: signAccessToken(user), refreshToken: signRefreshToken(user) };
}

// Thêm hash refresh token mới, giữ tối đa MAX_REFRESH_TOKENS (xoá cũ nhất)
async function pushRefreshToken(user, refreshToken) {
  const hashed = hashToken(refreshToken);
  const tokens = [...(user.refreshTokens || []), hashed].slice(-MAX_REFRESH_TOKENS);
  await User.updateOne({ _id: user._id }, { $set: { refreshTokens: tokens, lastLoginAt: new Date() } });
}

export async function login({ identifier, password }) {
  const query = identifier.includes('@') ? { email: identifier.toLowerCase() } : { phone: identifier };
  const user = await User.findOne(query).select('+password +refreshTokens');

  // Thông báo chung để không lộ tài khoản có tồn tại hay không
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Email/số điện thoại hoặc mật khẩu không đúng', { code: 'BAD_CREDENTIALS' });
  }
  if (!user.isActive) throw ApiError.forbidden('Tài khoản đã bị khoá', { code: 'ACCOUNT_LOCKED' });

  const tokens = issueTokens(user);
  await pushRefreshToken(user, tokens.refreshToken);
  return { user: user.toJSON(), ...tokens };
}

// Xoay vòng refresh token: token cũ bị thu hồi, cấp cặp mới
export async function refresh(refreshToken) {
  if (!refreshToken) throw ApiError.unauthorized('Thiếu refresh token', { code: 'NO_REFRESH' });

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Refresh token không hợp lệ hoặc hết hạn', { code: 'REFRESH_INVALID' });
  }

  const hashed = hashToken(refreshToken);
  const user = await User.findOne({ _id: payload.sub, refreshTokens: hashed }).select('+refreshTokens');
  if (!user) {
    // Token hợp lệ về chữ ký nhưng không còn trong DB → nghi ngờ bị đánh cắp, thu hồi toàn bộ
    await User.updateOne({ _id: payload.sub }, { $set: { refreshTokens: [] } });
    throw ApiError.unauthorized('Phiên đăng nhập không còn hiệu lực', { code: 'REFRESH_REUSED' });
  }
  if (!user.isActive) throw ApiError.forbidden('Tài khoản đã bị khoá', { code: 'ACCOUNT_LOCKED' });

  const tokens = issueTokens(user);
  const remaining = user.refreshTokens.filter((t) => t !== hashed);
  const next = [...remaining, hashToken(tokens.refreshToken)].slice(-MAX_REFRESH_TOKENS);
  await User.updateOne({ _id: user._id }, { $set: { refreshTokens: next } });

  return { user: user.toJSON(), ...tokens };
}

export async function logout(userId, refreshToken) {
  if (!refreshToken) return;
  await User.updateOne({ _id: userId }, { $pull: { refreshTokens: hashToken(refreshToken) } });
}

export async function register(data) {
  const exists = await User.findOne({ email: data.email });
  if (exists) throw ApiError.conflict('Email đã được sử dụng');
  if (data.phone) {
    const phoneExists = await User.findOne({ phone: data.phone });
    if (phoneExists) throw ApiError.conflict('Số điện thoại đã được sử dụng');
  }
  // Không truyền password → sinh mật khẩu tạm, trả về đúng 1 lần trong response
  const tempPassword = data.password || generateTempPassword();
  const user = await User.create({ ...data, password: tempPassword, mustChangePassword: true });
  return { ...user.toJSON(), tempPassword };
}

export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('Không tìm thấy tài khoản');
  const result = user.toJSON();
  // PH: kèm danh sách con đang học, lấy từ Student.parents (nguồn duy nhất)
  if (user.role === ROLES.PARENT) {
    result.children = await Student.find({ parents: userId, status: 'active' })
      .select('fullName nickname avatar class dateOfBirth gender')
      .populate('class', 'name ageGroup')
      .sort('fullName')
      .lean();
  }
  return result;
}

export async function updateMe(userId, data) {
  if (data.phone) {
    const dup = await User.findOne({ phone: data.phone, _id: { $ne: userId } });
    if (dup) throw ApiError.conflict('Số điện thoại đã được sử dụng');
  }
  const user = await User.findByIdAndUpdate(userId, { $set: data }, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('Không tìm thấy tài khoản');
  return user.toJSON();
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('Không tìm thấy tài khoản');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Mật khẩu hiện tại không đúng', { code: 'WRONG_PASSWORD' });
  }
  if (currentPassword === newPassword) throw ApiError.badRequest('Mật khẩu mới phải khác mật khẩu hiện tại');
  user.password = newPassword;
  user.mustChangePassword = false;
  user.refreshTokens = []; // đổi mật khẩu → đăng xuất mọi thiết bị
  await user.save();
}
