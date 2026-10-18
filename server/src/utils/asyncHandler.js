// Bọc controller async để lỗi tự chuyển sang errorHandler
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
