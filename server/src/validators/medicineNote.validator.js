import { z } from 'zod';
import { MEDICINE_STATUS } from '../config/constants.js';
import { objectId, dateStr, paginationQuery } from './common.validator.js';

const medicine = z.object({
  name: z.string().trim().min(1).max(150),
  dosage: z.string().trim().min(1).max(100),
  time: z.string().trim().min(1).max(100),
  note: z.string().trim().max(300).optional(),
});
const range = (d) => !d.fromDate || !d.toDate || d.toDate >= d.fromDate;
const rangeMsg = { message: 'Ngày kết thúc phải ≥ ngày bắt đầu', path: ['toDate'] };

export const listMedicineSchema = {
  query: paginationQuery.extend({
    class: objectId.optional(),
    status: z.enum(MEDICINE_STATUS).optional(),
    date: dateStr.optional(), // dặn thuốc còn hiệu lực trong ngày này
  }),
};

export const createMedicineSchema = {
  body: z
    .object({
      student: objectId,
      medicines: z.array(medicine).min(1, 'Cần ít nhất 1 loại thuốc').max(10),
      fromDate: dateStr,
      toDate: dateStr,
    })
    .refine(range, rangeMsg),
};

export const updateMedicineSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({ medicines: z.array(medicine).min(1).max(10).optional(), fromDate: dateStr.optional(), toDate: dateStr.optional() })
    .strict()
    .refine(range, rangeMsg),
};

export const addLogSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ givenAt: dateStr.optional(), note: z.string().trim().max(300).optional() }),
};
