// Lỗi có mã HTTP, dùng xuyên suốt service/controller: throw new ApiError(404, 'Không tìm thấy')
export class ApiError extends Error {
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code; // mã máy đọc, vd TOKEN_EXPIRED
    this.details = details; // chi tiết validation
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Dữ liệu không hợp lệ', opts) { return new ApiError(400, msg, opts); }
  static unauthorized(msg = 'Chưa đăng nhập', opts) { return new ApiError(401, msg, opts); }
  static forbidden(msg = 'Không có quyền truy cập', opts) { return new ApiError(403, msg, opts); }
  static notFound(msg = 'Không tìm thấy dữ liệu', opts) { return new ApiError(404, msg, opts); }
  static conflict(msg = 'Dữ liệu đã tồn tại', opts) { return new ApiError(409, msg, opts); }
}
