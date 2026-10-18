import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

function assertEnabled() {
  if (!cloudinaryEnabled) {
    throw new ApiError(503, 'Chưa cấu hình Cloudinary, không thể upload', { code: 'UPLOAD_DISABLED' });
  }
}

// Upload 1 buffer → { url, publicId }. folder vd: 'kindercare/avatars'
export function uploadBuffer(buffer, { folder, resourceType = 'image', transformation } = {}) {
  assertEnabled();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, transformation },
      (err, result) => {
        if (err) return reject(new ApiError(502, 'Upload thất bại', { code: 'UPLOAD_FAILED' }));
        resolve({ url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height });
      },
    );
    stream.end(buffer);
  });
}

export async function uploadMany(files, opts) {
  return Promise.all(files.map((f) => uploadBuffer(f.buffer, opts)));
}

// Xoá ảnh cũ, lỗi chỉ log (không chặn nghiệp vụ chính)
export async function deleteByPublicId(publicId) {
  if (!publicId || !cloudinaryEnabled) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    logger.warn('Không xoá được ảnh Cloudinary', { publicId, err: err.message });
  }
}

export const AVATAR_TRANSFORM = [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }];
