// Response chuẩn: { success, data, message, pagination? }
export function sendSuccess(res, data = null, message = 'Thành công', { statusCode = 200, pagination } = {}) {
  const body = { success: true, data, message };
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
}

export function sendCreated(res, data, message = 'Tạo thành công') {
  return sendSuccess(res, data, message, { statusCode: 201 });
}
