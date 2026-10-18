import { z } from 'zod';
import { objectId, dateStr } from './common.validator.js';

const base = z.object({
  name: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Tên năm học dạng 2025-2026'),
  startDate: dateStr,
  endDate: dateStr,
  isCurrent: z.boolean().optional(),
  tuitionDefault: z.number().int().min(0).optional(),
});

const checkRange = (d) => d.endDate > d.startDate;
const rangeMsg = { message: 'Ngày kết thúc phải sau ngày bắt đầu', path: ['endDate'] };

export const createSchoolYearSchema = { body: base.refine(checkRange, rangeMsg) };

export const updateSchoolYearSchema = {
  params: z.object({ id: objectId }),
  body: base
    .partial()
    .strict()
    .refine((d) => !d.startDate || !d.endDate || checkRange(d), rangeMsg),
};
