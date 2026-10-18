import { z } from 'zod';
import { APPROVAL_STATUS } from '../config/constants.js';
import { objectId, dateStr, paginationQuery } from './common.validator.js';

const activity = z.object({
  time: z.string().trim().max(30).optional(),
  title: z.string().trim().min(1).max(200),
  goal: z.string().trim().max(500).optional(),
  materials: z.string().trim().max(500).optional(),
});
const day = z.object({ dayOfWeek: z.number().int().min(1).max(5), activities: z.array(activity).max(15).default([]) });
const days = z.array(day).max(5).refine((d) => new Set(d.map((x) => x.dayOfWeek)).size === d.length, 'Trùng thứ trong tuần');

export const listPlansSchema = {
  query: paginationQuery.extend({
    class: objectId.optional(),
    status: z.enum(APPROVAL_STATUS).optional(),
    weekStart: dateStr.optional(),
  }),
};

export const createPlanSchema = {
  body: z.object({
    class: objectId,
    weekStart: dateStr,
    theme: z.string().trim().max(200).optional(),
    days: days.optional(),
    attachments: z.array(z.string().url()).max(10).optional(),
  }),
};

export const updatePlanSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      theme: z.string().trim().max(200).optional(),
      days: days.optional(),
      attachments: z.array(z.string().url()).max(10).optional(),
    })
    .strict(),
};
