import { z } from 'zod';
import { LEAVE_STATUS } from '../config/constants.js';
import { objectId, dateStr, paginationQuery } from './common.validator.js';

const range = (d) => !d.fromDate || !d.toDate || d.toDate >= d.fromDate;
const rangeMsg = { message: 'Ngày kết thúc phải ≥ ngày bắt đầu', path: ['toDate'] };

export const listLeaveSchema = {
  query: paginationQuery.extend({
    class: objectId.optional(),
    status: z.enum(LEAVE_STATUS).optional(),
    student: objectId.optional(),
  }),
};

export const createLeaveSchema = {
  body: z
    .object({
      student: objectId,
      fromDate: dateStr,
      toDate: dateStr,
      reason: z.string().trim().min(3, 'Nhập lý do').max(1000),
    })
    .refine(range, rangeMsg),
};

export const updateLeaveSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({ fromDate: dateStr.optional(), toDate: dateStr.optional(), reason: z.string().trim().min(3).max(1000).optional() })
    .strict()
    .refine(range, rangeMsg),
};

export const reviewSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ note: z.string().trim().max(500).optional() }),
};

export const rejectLeaveSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ note: z.string().trim().min(3, 'Nhập lý do từ chối').max(500) }),
};
