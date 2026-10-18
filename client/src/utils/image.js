/**
 * Nén ảnh phía client trước khi upload: thu về cạnh dài ~1600px, JPEG 0.85 (PNG giữ PNG).
 * HEIC/HEIF trình duyệt không giải mã được → gửi nguyên (server chấp nhận, ≤ 10MB).
 */
export async function compressImage(file, { maxSize = 1600, quality = 0.85 } = {}) {
  if (!file || !file.type?.startsWith('image/') || /heic|heif/i.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxSize / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
      bmp.close?.();
      return file; // đã nhỏ sẵn
    }
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((r) => canvas.toBlob(r, type, quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + (type === 'image/png' ? '.png' : '.jpg'), { type, lastModified: Date.now() });
  } catch {
    return file;
  }
}

export const compressImages = (files) => Promise.all([...files].map((f) => compressImage(f)));

export const MAX_UPLOAD_MB = 10;
export const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';
// Kiểm tra trước khi gửi, trả thông điệp lỗi hoặc null
export function validateImage(file) {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) return `${file.name}: chỉ nhận JPG, PNG, WebP, HEIC.`;
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `${file.name}: vượt ${MAX_UPLOAD_MB}MB.`;
  return null;
}
