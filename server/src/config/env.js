import 'dotenv/config';
import { z } from 'zod';

// Khai báo + kiểm tra biến môi trường ngay khi khởi động, thiếu thì dừng server
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  MONGO_URI: z.string().min(1, 'Thiếu MONGO_URI'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET phải ≥ 32 ký tự'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET phải ≥ 32 ký tự'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  // Cookie refresh token: dev dùng lax/false; prod khác domain dùng none/true
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),

  SEPAY_WEBHOOK_KEY: z.string().optional().default(''),
  SEPAY_ACCOUNT: z.string().optional().default(''),
  SEPAY_BANK: z.string().optional().default(''),
  SEPAY_ACCOUNT_NAME: z.string().optional().default(''),

  LOG_LEVEL: z.string().default('info'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Biến môi trường không hợp lệ:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

// Trình duyệt từ chối SameSite=None nếu không có Secure
if (parsed.data.COOKIE_SAMESITE === 'none' && !parsed.data.COOKIE_SECURE) {
  console.error('❌ COOKIE_SAMESITE=none bắt buộc COOKIE_SECURE=true');
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
