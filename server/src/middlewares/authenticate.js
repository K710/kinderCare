import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';

// Đọc "Authorization: Bearer <access>" → req.user = { id, role }
// Kiểm tra user còn tồn tại và chưa bị khoá (1 query nhẹ, chỉ lấy isActive + role)
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Thiếu access token', { code: 'NO_TOKEN' });
    }

    const payload = verifyAccessToken(token); // ném TokenExpiredError / JsonWebTokenError → errorHandler
    const user = await User.findById(payload.sub).select('role isActive mustChangePassword').lean();
    if (!user) throw ApiError.unauthorized('Tài khoản không tồn tại', { code: 'USER_NOT_FOUND' });
    if (!user.isActive) throw ApiError.forbidden('Tài khoản đã bị khoá', { code: 'ACCOUNT_LOCKED' });

    // Phải đổi mật khẩu trước: chỉ cho gọi /auth/* (me, đổi mật khẩu, logout)
    if (user.mustChangePassword && !req.originalUrl.startsWith('/api/v1/auth')) {
      throw ApiError.forbidden('Bạn cần đổi mật khẩu trước khi tiếp tục', { code: 'PASSWORD_CHANGE_REQUIRED' });
    }

    req.user = { id: user._id.toString(), role: user.role, mustChangePassword: !!user.mustChangePassword };
    next();
  } catch (err) {
    next(err);
  }
}

// Không bắt buộc đăng nhập, có token thì gắn req.user
export async function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next();
  return authenticate(req, res, next);
}
