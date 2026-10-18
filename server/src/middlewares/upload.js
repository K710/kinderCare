import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const FILE_TYPES = [...IMAGE_TYPES, 'application/pdf'];

// Lưu vào bộ nhớ rồi đẩy thẳng lên Cloudinary, không ghi đĩa
function make({ types, maxMB }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!types.includes(file.mimetype)) {
        return cb(ApiError.badRequest(`Định dạng ${file.mimetype} không được hỗ trợ`, { code: 'UPLOAD_TYPE' }));
      }
      cb(null, true);
    },
  });
}

export const uploadImage = make({ types: IMAGE_TYPES, maxMB: 5 });
export const uploadFile = make({ types: FILE_TYPES, maxMB: 10 });

// Bắt buộc có file sau multer
export function requireFile(req, res, next) {
  if (!req.file && !(req.files && req.files.length)) {
    return next(ApiError.badRequest('Chưa chọn file', { code: 'NO_FILE' }));
  }
  next();
}
