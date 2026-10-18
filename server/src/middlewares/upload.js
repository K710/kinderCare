import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

// Chỉ nhận jpg/png/webp/heic, tối đa 10MB/ảnh (client đã nén về ~1600px trước khi gửi)
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const FILE_TYPES = [...IMAGE_TYPES, 'application/pdf'];
export const MAX_UPLOAD_MB = 10;

// Lưu vào bộ nhớ rồi giao cho storage driver (local / cloudinary), không ghi đĩa tạm
function make({ types, maxMB }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!types.includes(file.mimetype)) {
        return cb(ApiError.badRequest(`Định dạng ${file.mimetype} không được hỗ trợ. Chỉ nhận JPG, PNG, WebP, HEIC.`, { code: 'UPLOAD_TYPE' }));
      }
      cb(null, true);
    },
  });
}

export const uploadImage = make({ types: IMAGE_TYPES, maxMB: MAX_UPLOAD_MB });
export const uploadFile = make({ types: FILE_TYPES, maxMB: MAX_UPLOAD_MB });

// Bắt buộc có file sau multer
export function requireFile(req, res, next) {
  if (!req.file && !(req.files && req.files.length)) {
    return next(ApiError.badRequest('Chưa chọn file', { code: 'NO_FILE' }));
  }
  next();
}
