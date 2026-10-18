import { z } from 'zod';
import { objectId, dateStr } from './common.validator.js';

const height = z.number().min(30, 'Chiều cao 30–200 cm').max(200);
const weight = z.number().min(1, 'Cân nặng 1–100 kg').max(100);
const note = z.string().trim().max(500).optional();
const measuredAt = dateStr.refine((d) => d <= new Date(), 'Ngày đo không được ở tương lai');

export const studentParams = { params: z.object({ studentId: objectId }) };

export const createHealthSchema = {
  body: z.object({ student: objectId, measuredAt, height, weight, note }),
};

export const bulkHealthSchema = {
  body: z.object({
    class: objectId,
    measuredAt,
    records: z.array(z.object({ student: objectId, height, weight, note })).min(1),
  }),
};

export const updateHealthSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ measuredAt: measuredAt.optional(), height: height.optional(), weight: weight.optional(), note }).strict(),
};
