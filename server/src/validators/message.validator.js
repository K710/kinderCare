import { z } from 'zod';
import { objectId, dateStr } from './common.validator.js';

export const userIdParams = { params: z.object({ userId: objectId }) };

export const historySchema = {
  params: z.object({ userId: objectId }),
  query: z.object({ before: dateStr.optional(), limit: z.coerce.number().int().min(1).max(100).optional() }),
};

export const sendMessageSchema = {
  body: z
    .object({
      receiver: objectId,
      student: objectId.optional(),
      content: z.string().trim().max(4000).optional(),
      attachments: z
        .array(z.object({ url: z.string().url(), type: z.enum(['image', 'file']).optional(), name: z.string().max(200).optional() }))
        .max(5)
        .optional(),
    })
    .refine((d) => (d.content && d.content.length) || d.attachments?.length, { message: 'Tin nhắn trống', path: ['content'] }),
};
