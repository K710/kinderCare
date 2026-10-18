import { z } from 'zod';
import { ROLE_LIST } from '../config/constants.js';
import { objectId, phone, password, boolStr, paginationQuery, assetUrl } from './common.validator.js';

export const listUsersSchema = {
  query: paginationQuery.extend({
    role: z.enum(ROLE_LIST).optional(),
    honorific: z.enum(['co', 'thay']).optional(),
    isActive: boolStr,
  }),
};

export const createUserSchema = {
  body: z.object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
    phone: phone.optional(),
    password: password.optional(), // bỏ trống → server sinh mật khẩu tạm
    role: z.enum(ROLE_LIST),
    honorific: z.enum(['co', 'thay']).optional(),
  }),
};

export const updateUserSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      fullName: z.string().trim().min(2).max(100).optional(),
      email: z.string().trim().toLowerCase().email().optional(),
      phone: phone.nullable().optional(),
      role: z.enum(ROLE_LIST).optional(),
      honorific: z.enum(['co', 'thay']).optional(),
      avatar: assetUrl.optional(),
    })
    .strict(),
};

export const setStatusSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ isActive: z.boolean() }),
};

export const resetPasswordSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ newPassword: password.optional() }).default({}), // bỏ trống → sinh mật khẩu tạm
};

export const searchSchema = {
  query: paginationQuery,
};
