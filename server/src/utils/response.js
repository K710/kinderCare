import { signAssets } from '../services/storage.js';

// Response chuẩn: { success, data, message, pagination? }. Mọi asset://… trong data → link có chữ ký (xem services/storage.js)
export function sendSuccess(res, data = null, message = 'Thành công', { statusCode = 200, pagination } = {}) {
  const body = { success: true, data: signAssets(data), message };
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
}

export function sendCreated(res, data, message = 'Tạo thành công') {
  return sendSuccess(res, data, message, { statusCode: 201 });
}
