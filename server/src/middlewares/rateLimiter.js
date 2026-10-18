import rateLimit from 'express-rate-limit';

const handler = (req, res) => {
  res.status(429).json({ success: false, data: null, message: 'Quá nhiều yêu cầu, thử lại sau', code: 'RATE_LIMIT' });
};

// Toàn bộ API
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  skip: (req) => req.originalUrl.startsWith('/api/v1/files/'), // ảnh có chữ ký: 1 trang tải nhiều ảnh, không tính vào hạn mức API
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

// Login / refresh theo IP: chặn dò mật khẩu hàng loạt. Chỉ đếm lần thất bại (4xx/5xx).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler,
});

// Login theo tài khoản (identifier): chặn dò mật khẩu 1 tài khoản từ nhiều IP.
// Chỉ đếm lần thất bại; đăng nhập đúng không tiêu hạn mức.
export const loginIdentifierLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `id:${String(req.body?.identifier || '').trim().toLowerCase()}`,
  // Key không phải IP nên tắt kiểm tra IPv6 của thư viện
  validate: { keyGeneratorIpFallback: false, ip: false },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      data: null,
      message: 'Tài khoản này đăng nhập sai quá nhiều lần, thử lại sau 15 phút',
      code: 'LOGIN_LOCKED',
    });
  },
});

// Webhook SePay: riêng, rộng hơn vì SePay có thể retry
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});
