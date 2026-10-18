import { ApiError } from '../utils/ApiError.js';

// authorize('admin', 'principal') – chỉ cho qua các role liệt kê. Phải đứng sau authenticate.
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden('Vai trò của bạn không được phép thực hiện thao tác này'));
  }
  next();
};
