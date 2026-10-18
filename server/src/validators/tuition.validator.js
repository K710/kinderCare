import { z } from 'zod';
import { TUITION_STATUS } from '../config/constants.js';
import { objectId, dateStr, monthStr, paginationQuery } from './common.validator.js';

const items = z
  .array(z.object({ name: z.string().trim().min(1).max(100), amount: z.number().int().min(0) }))
  .min(1, 'Cần ít nhất 1 khoản thu');

export const listTuitionSchema = {
  query: paginationQuery.extend({
    class: objectId.optional(),
    month: monthStr.optional(),
    status: z.enum(TUITION_STATUS).optional(),
    student: objectId.optional(),
  }),
};

export const myTuitionSchema = {
  query: z.object({ month: monthStr.optional(), status: z.enum(TUITION_STATUS).optional() }),
};

export const createTuitionSchema = {
  body: z.object({
    student: objectId,
    month: monthStr,
    items,
    dueDate: dateStr,
    note: z.string().trim().max(500).optional(),
  }),
};

export const bulkTuitionSchema = {
  body: z.object({
    class: objectId,
    month: monthStr,
    items,
    dueDate: dateStr,
  }),
};

export const updateTuitionSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      items: items.optional(),
      dueDate: dateStr.optional(),
      note: z.string().trim().max(500).optional(),
      reason: z.string().trim().min(3).max(500).optional(), // bắt buộc khi đã có tiền vào
    })
    .strict(),
};

export const summarySchema = {
  query: z.object({ month: monthStr, class: objectId.optional() }),
};
