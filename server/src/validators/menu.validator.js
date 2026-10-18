import { z } from 'zod';
import { AGE_GROUPS, APPROVAL_STATUS } from '../config/constants.js';
import { objectId, dateStr, paginationQuery } from './common.validator.js';

const dish = z.string().trim().min(1).max(100);
const day = z.object({
  dayOfWeek: z.number().int().min(1).max(5),
  breakfast: z.array(dish).max(10).default([]),
  lunch: z.array(dish).max(10).default([]),
  snack: z.array(dish).max(10).default([]),
  note: z.string().trim().max(300).optional(),
});

// Không trùng thứ trong tuần
const days = z.array(day).max(5).refine((d) => new Set(d.map((x) => x.dayOfWeek)).size === d.length, 'Trùng thứ trong tuần');

export const listMenusSchema = {
  query: paginationQuery.extend({
    status: z.enum(APPROVAL_STATUS).optional(),
    ageGroup: z.enum([...AGE_GROUPS, 'all']).optional(),
    weekStart: dateStr.optional(),
  }),
};

export const createMenuSchema = {
  body: z.object({
    weekStart: dateStr,
    ageGroup: z.enum([...AGE_GROUPS, 'all']).optional(),
    days: days.optional(),
  }),
};

export const updateMenuSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ days: days.optional(), ageGroup: z.enum([...AGE_GROUPS, 'all']).optional() }).strict(),
};

export const rejectSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ reason: z.string().trim().min(3, 'Nhập lý do từ chối').max(500) }),
};

export const currentMenuSchema = {
  query: z.object({ date: dateStr.optional(), ageGroup: z.enum([...AGE_GROUPS, 'all']).optional() }),
};
