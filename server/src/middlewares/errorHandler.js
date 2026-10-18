import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { isProd } from '../config/env.js';

// 404 cho route không tồn tại
export function notFound(req, res, next) {
  next(ApiError.notFound(`Không tìm thấy ${req.method} ${req.originalUrl}`));
}

// Chuyển mọi loại lỗi về ApiError để trả response chuẩn
function normalize(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    return ApiError.badRequest('Dữ liệu không hợp lệ', {
      code: 'VALIDATION_ERROR',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return ApiError.badRequest('Dữ liệu không hợp lệ', {
      code: 'VALIDATION_ERROR',
      details: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Giá trị không hợp lệ cho ${err.path}`, { code: 'CAST_ERROR' });
  }

  // Trùng unique index (email, paymentCode, điểm danh cùng ngày...)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    return ApiError.conflict(`Dữ liệu đã tồn tại: ${fields.join(', ')}`, {
      code: 'DUPLICATE_KEY',
      details: fields.map((f) => ({ field: f, message: 'đã tồn tại' })),
    });
  }

  if (err.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Phiên đăng nhập hết hạn', { code: 'TOKEN_EXPIRED' });
  }
  if (err.name === 'JsonWebTokenError') {
    return ApiError.unauthorized('Token không hợp lệ', { code: 'TOKEN_INVALID' });
  }

  // Multer
  if (err.name === 'MulterError') {
    return ApiError.badRequest(err.message, { code: 'UPLOAD_ERROR' });
  }

  // body-parser JSON lỗi
  if (err.type === 'entity.parse.failed') {
    return ApiError.badRequest('JSON không hợp lệ', { code: 'BAD_JSON' });
  }

  return new ApiError(err.statusCode || 500, isProd ? 'Lỗi hệ thống' : err.message || 'Lỗi hệ thống', {
    code: 'INTERNAL_ERROR',
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const apiErr = normalize(err);

  if (apiErr.statusCode >= 500) {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl, method: req.method });
  } else {
    logger.warn(`${apiErr.statusCode} ${apiErr.message}`, { path: req.originalUrl, method: req.method });
  }

  const body = { success: false, data: null, message: apiErr.message };
  if (apiErr.code) body.code = apiErr.code;
  if (apiErr.details) body.errors = apiErr.details;
  if (!isProd && apiErr.statusCode >= 500) body.stack = err.stack;

  res.status(apiErr.statusCode).json(body);
}
