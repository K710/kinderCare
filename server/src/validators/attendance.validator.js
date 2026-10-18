import { z } from 'zod';
import { ATTENDANCE_STATUS } from '../config/constants.js';
import { objectId, dateStr, monthStr } from './common.validator.js';

export const listAttendanceSchema = {
  query: z
    .object({
      class: objectId,
      date: dateStr.optional(),
      from: dateStr.optional(),
      to: dateStr.optional(),
    })
    .refine((q) => q.date || (q.from && q.to), { message: 'Cần date hoặc from+to', path: ['date'] }),
};

export const studentHistorySchema = {
  params: z.object({ studentId: objectId }),
  query: z.object({ month: monthStr.optional() }),
};

export const bulkAttendanceSchema = {
  body: z.object({
    class: objectId,
    date: dateStr,
    records: z
      .array(
        z.object({
          student: objectId,
          status: z.enum(ATTENDANCE_STATUS),
          checkInAt: dateStr.optional(),
          checkOutAt: dateStr.optional(),
          note: z.string().trim().max(500).optional(),
        }),
      )
      .min(1, 'Cần ít nhất 1 học sinh'),
  }),
};

export const updateAttendanceSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      status: z.enum(ATTENDANCE_STATUS).optional(),
      checkInAt: dateStr.nullable().optional(),
      checkOutAt: dateStr.nullable().optional(),
      note: z.string().trim().max(500).optional(),
    })
    .strict(),
};

export const statsSchema = {
  query: z.object({
    month: monthStr,
    class: objectId.optional(),
  }),
};
