import { z } from 'zod';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID không hợp lệ');
export const phone = z.string().regex(/^(0|\+84)\d{9,10}$/, 'Số điện thoại không hợp lệ');
export const password = z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(72);
export const dateStr = z.coerce.date({ message: 'Ngày không hợp lệ' });
export const monthStr = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Tháng dạng YYYY-MM');

// Chuỗi "true"/"false" từ query → boolean
export const boolStr = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

export const idParam = { params: z.object({ id: objectId }) };

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.string().optional(),
  search: z.string().trim().optional(),
});

// Escape ký tự regex khi search theo tên
export const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
