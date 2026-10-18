import crypto from 'crypto';
import { isProd } from '../config/env.js';

// Production yêu cầu mật khẩu ≥ 8 ký tự (create-admin, seed); dev cho phép 6 để demo nhanh
export const MIN_PASSWORD_LENGTH = isProd ? 8 : 6;

export function assertPasswordPolicy(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự${isProd ? ' (production)' : ''}`);
  }
}

// Mật khẩu tạm dễ đọc: 8 ký tự, bỏ 0/O/1/I/l
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
export function generateTempPassword(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
