import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

// Access token: ngắn hạn, mang id + role để authorize không cần query DB
export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });
}

// Refresh token: dài hạn, có jti ngẫu nhiên để mỗi lần cấp là 1 token khác nhau
export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString(), jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

// Chỉ lưu hash của refresh token trong DB, lộ DB không dùng lại được token
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Đổi "7d" / "15m" sang mili-giây cho maxAge cookie
export function durationToMs(str) {
  const m = /^(\d+)([smhd])$/.exec(str);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  return { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]] * n;
}
