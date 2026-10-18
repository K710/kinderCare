import { z } from 'zod';
import { DAILY_REPORT_ENUMS as E } from '../models/DailyReport.js';
import { objectId, dateStr } from './common.validator.js';

const meal = z.enum(E.MEAL);

const content = {
  meals: z.object({ breakfast: meal.optional(), lunch: meal.optional(), snack: meal.optional() }).optional(),
  sleep: z.object({ duration: z.number().int().min(0).max(600).optional(), quality: z.enum(E.QUALITY).optional() }).optional(),
  mood: z.enum(E.MOOD).optional(),
  toilet: z.number().int().min(0).max(20).optional(),
  activities: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  comment: z.string().trim().max(2000).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
};

export const listReportsSchema = {
  query: z.object({ class: objectId, date: dateStr }),
};

export const studentReportsSchema = {
  params: z.object({ studentId: objectId }),
  query: z.object({ from: dateStr.optional(), to: dateStr.optional() }),
};

export const createReportSchema = {
  body: z.object({ student: objectId, date: dateStr, ...content }),
};

export const bulkReportSchema = {
  body: z.object({
    class: objectId,
    date: dateStr,
    students: z.array(objectId).min(1, 'Chọn ít nhất 1 học sinh'),
    ...content,
  }),
};

export const updateReportSchema = {
  params: z.object({ id: objectId }),
  body: z.object(content).strict(),
};
