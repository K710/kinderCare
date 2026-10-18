import { z } from 'zod';
import { ROLE_LIST } from '../config/constants.js';
import { phone, password } from './common.validator.js';

export const loginSchema = {
  body: z.object({
    // Cho phép đăng nhập bằng email hoặc số điện thoại
    identifier: z.string().trim().min(1, 'Nhập email hoặc số điện thoại'),
    password: z.string().min(1, 'Nhập mật khẩu'),
  }),
};

export const registerSchema = {
  body: z.object({
    fullName: z.string().trim().min(2, 'Họ tên tối thiểu 2 ký tự').max(100),
    email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
    phone: phone.optional(),
    password: password.optional(),
    role: z.enum(ROLE_LIST),
  }),
};

export const updateMeSchema = {
  body: z
    .object({
      fullName: z.string().trim().min(2).max(100).optional(),
      phone: phone.optional(),
      avatar: z.string().url().optional(),
    })
    .strict(),
};

export const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
    newPassword: password,
  }),
};
