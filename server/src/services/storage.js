/**
 * Storage driver chung cho ảnh/tệp (STORAGE_DRIVER=local|cloudinary).
 * - DB chỉ lưu "asset ref": asset://<driver>/<key>. Không lưu URL công khai.
 * - Khi trả response (sendSuccess / socket emit), mọi ref được đổi thành link có chữ ký, hết hạn sau FILE_URL_TTL_HOURS:
 *     /api/v1/files/<driver>/<key>?exp=<ms>&sig=<hmac>
 *   Link chỉ xuất hiện trong response của người đã qua kiểm tra quyền (checkOwnership…) → PH lớp khác không có link.
 * - local: file nằm trong UPLOAD_DIR, chỉ phục vụ qua route /files (không static public).
 * - cloudinary: upload type=authenticated (không xem được bằng URL thường); route /files chuyển hướng sang
 *   private_download_url có hạn (≤ 1 giờ) do server ký.
 */
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export const DRIVER = env.STORAGE_DRIVER;
const TTL_MS = env.FILE_URL_TTL_HOURS * 3600 * 1000;
const SECRET = env.FILE_URL_SECRET || env.JWT_ACCESS_SECRET;
export const UPLOAD_ROOT = path.resolve(process.cwd(), env.UPLOAD_DIR);

export const ASSET_RE = /^asset:\/\/(local|cloudinary)\/([A-Za-z0-9_\-./]+)$/;
// Link đã ký của chính server (có thể kèm origin) → quy về ref khi client gửi ngược lên
export const SIGNED_RE = /^(?:https?:\/\/[^/]+)?\/api\/v1\/files\/(local|cloudinary)\/([A-Za-z0-9_\-./]+)(?:[?#].*)?$/;

const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif', 'application/pdf': 'pdf', 'image/gif': 'gif' };
const EXT_MIME = Object.fromEntries(Object.entries(MIME_EXT).map(([m, e]) => [e, m]));

const safeKey = (key) => typeof key === 'string' && /^[A-Za-z0-9_\-./]+$/.test(key) && !key.split('/').includes('..') && !key.startsWith('/');
export const toRef = (driver, key) => `asset://${driver}/${key}`;
export const parseRef = (v) => {
  const m = typeof v === 'string' && v.match(ASSET_RE);
  return m ? { driver: m[1], key: m[2] } : null;
};
// Chuẩn hoá đầu vào: ref giữ nguyên, link đã ký → ref, URL ngoài giữ nguyên
export function normalizeAssetInput(v) {
  if (typeof v !== 'string') return v;
  if (ASSET_RE.test(v)) return v;
  const m = v.match(SIGNED_RE);
  return m ? toRef(m[1], m[2]) : v;
}

/* ---------- Chữ ký link ---------- */
const sign = (driver, key, exp) => crypto.createHmac('sha256', SECRET).update(`${driver}/${key}:${exp}`).digest('hex').slice(0, 32);

export function signUrl(ref, { ttlMs = TTL_MS } = {}) {
  const p = parseRef(ref);
  if (!p) return ref;
  const exp = Date.now() + ttlMs;
  return `${env.API_PUBLIC_URL}/api/v1/files/${p.driver}/${p.key}?exp=${exp}&sig=${sign(p.driver, p.key, exp)}`;
}

export function verifySigned(driver, key, exp, sig) {
  if (!['local', 'cloudinary'].includes(driver) || !safeKey(key)) return false;
  const e = Number(exp);
  if (!Number.isFinite(e) || e < Date.now()) return false;
  const expected = sign(driver, key, e);
  return typeof sig === 'string' && sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/* ---------- Đổi ref → link ký trong dữ liệu trả về (đệ quy, tối đa 10 tầng) ---------- */
export function signAssets(data, depth = 0) {
  if (data == null || depth > 10) return data;
  if (typeof data === 'string') return ASSET_RE.test(data) ? signUrl(data) : data;
  if (typeof data !== 'object') return data;
  if (data instanceof Date || Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return data.map((v) => signAssets(v, depth + 1));
  // Mongoose document / ObjectId… → dạng JSON thuần trước
  if (typeof data.toJSON === 'function') {
    const j = data.toJSON();
    if (j === data) return data; // tự trả chính nó (hiếm)
    return signAssets(j, depth + 1);
  }
  const out = {};
  for (const [k, v] of Object.entries(data)) out[k] = signAssets(v, depth + 1);
  return out;
}

/* ---------- Upload ---------- */
function assertDriver() {
  if (DRIVER === 'cloudinary' && !cloudinaryEnabled) {
    throw new ApiError(503, 'STORAGE_DRIVER=cloudinary nhưng chưa cấu hình CLOUDINARY_*', { code: 'UPLOAD_DISABLED' });
  }
}

// put(buffer, { folder, mimetype }) → { ref, key }
export async function put(buffer, { folder = 'misc', mimetype = 'application/octet-stream', transformation } = {}) {
  assertDriver();
  const ext = MIME_EXT[mimetype];
  if (!ext) throw ApiError.badRequest(`Định dạng ${mimetype} không được hỗ trợ`, { code: 'UPLOAD_TYPE' });
  const now = new Date();
  const sub = `${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const name = crypto.randomUUID();

  if (DRIVER === 'local') {
    const key = `${sub}/${name}.${ext}`;
    const abs = path.join(UPLOAD_ROOT, key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, buffer);
    return { ref: toRef('local', key), key };
  }

  // cloudinary: type authenticated → không xem được bằng URL công khai
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `kindercare/${sub}`, public_id: name, type: 'authenticated', resource_type: ext === 'pdf' ? 'raw' : 'image', transformation },
      (err, res) => (err ? reject(new ApiError(502, 'Upload thất bại', { code: 'UPLOAD_FAILED' })) : resolve(res)),
    );
    stream.end(buffer);
  });
  const key = `${result.public_id}.${result.format || ext}`;
  return { ref: toRef('cloudinary', key), key };
}

export async function remove(ref) {
  const p = parseRef(ref);
  if (!p) return;
  try {
    if (p.driver === 'local') await fs.unlink(path.join(UPLOAD_ROOT, p.key));
    else if (cloudinaryEnabled) {
      const publicId = p.key.replace(/\.[a-z0-9]+$/i, '');
      await cloudinary.uploader.destroy(publicId, { type: 'authenticated', resource_type: p.key.endsWith('.pdf') ? 'raw' : 'image' });
    }
  } catch (err) {
    logger.warn('Không xoá được tệp', { ref, err: err.message }); // không chặn nghiệp vụ chính
  }
}

/* ---------- Phục vụ file qua route /files ---------- */
export async function resolve(driver, key) {
  if (!safeKey(key)) throw ApiError.notFound('Không tìm thấy tệp');
  const ext = key.split('.').pop().toLowerCase();
  const contentType = EXT_MIME[ext] || 'application/octet-stream';
  if (driver === 'local') {
    const abs = path.join(UPLOAD_ROOT, key);
    if (!abs.startsWith(UPLOAD_ROOT)) throw ApiError.notFound('Không tìm thấy tệp');
    try {
      await fs.access(abs);
    } catch {
      throw ApiError.notFound('Không tìm thấy tệp');
    }
    return { stream: () => createReadStream(abs), contentType };
  }
  assertDriver();
  const publicId = key.replace(/\.[a-z0-9]+$/i, '');
  const expiresAt = Math.floor(Date.now() / 1000) + 3600; // link Cloudinary sống 1 giờ
  const redirect = cloudinary.utils.private_download_url(publicId, ext, { type: 'authenticated', resource_type: ext === 'pdf' ? 'raw' : 'image', expires_at: expiresAt });
  return { redirect, contentType };
}
