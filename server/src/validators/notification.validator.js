import { z } from 'zod';
import { NOTIFICATION_TYPES, NOTIFICATION_SCOPES, ROLE_LIST } from '../config/constants.js';
import { objectId, boolStr } from './common.validator.js';

export const listNotificationsSchema = {
  query: z.object({
    unread: boolStr,
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
};

export const createNotificationSchema = {
  body: z
    .object({
      title: z.string().trim().min(1).max(200),
      body: z.string().trim().min(1).max(2000),
      type: z.enum(NOTIFICATION_TYPES).optional(),
      scope: z.enum(NOTIFICATION_SCOPES),
      targetRole: z.enum(ROLE_LIST).optional(),
      targetClass: objectId.optional(),
      targetUsers: z.array(objectId).min(1).max(500).optional(),
      link: z.string().max(300).optional(),
    })
    .superRefine((d, ctx) => {
      if (d.scope === 'role' && !d.targetRole) ctx.addIssue({ code: 'custom', path: ['targetRole'], message: 'Cần targetRole' });
      if (d.scope === 'class' && !d.targetClass) ctx.addIssue({ code: 'custom', path: ['targetClass'], message: 'Cần targetClass' });
      if (d.scope === 'user' && !d.targetUsers?.length) ctx.addIssue({ code: 'custom', path: ['targetUsers'], message: 'Cần targetUsers' });
    }),
};
