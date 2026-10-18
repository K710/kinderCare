import { z } from 'zod';
import { objectId, dateStr } from './common.validator.js';

export const listAlbumsSchema = {
  query: z.object({
    class: objectId.optional(),
    from: dateStr.optional(),
    to: dateStr.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
};

// multipart: các trường text đến dưới dạng chuỗi
export const createAlbumSchema = {
  body: z.object({
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().max(2000).optional(),
    class: objectId,
    date: dateStr.optional(),
  }),
};

export const updateAlbumSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      title: z.string().trim().min(1).max(150).optional(),
      description: z.string().trim().max(2000).optional(),
      date: dateStr.optional(),
    })
    .strict(),
};

export const photoParams = {
  params: z.object({ id: objectId, photoId: objectId }),
};

export const captionSchema = {
  params: z.object({ id: objectId, photoId: objectId }),
  body: z.object({ caption: z.string().trim().max(200) }),
};
