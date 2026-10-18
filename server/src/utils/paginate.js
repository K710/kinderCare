// Chuyển query ?page=&limit=&sort= thành { skip, limit, sort } và tạo object pagination cho response
export function parsePagination(query, { defaultLimit = 20, maxLimit = 100, defaultSort = '-createdAt' } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const sort = query.sort || defaultSort;
  return { page, limit, skip: (page - 1) * limit, sort };
}

export function buildPagination({ page, limit }, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
}
