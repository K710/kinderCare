// Lớp mỏng trên storage driver (xem services/storage.js). Trả { ref, url } – url là link đã ký để client xem ngay
import * as storage from './storage.js';

export async function uploadBuffer(buffer, { folder, mimetype, transformation } = {}) {
  const { ref, key } = await storage.put(buffer, { folder, mimetype, transformation });
  return { ref, key, url: storage.signUrl(ref) };
}

export async function uploadMany(files, opts) {
  return Promise.all(files.map((f) => uploadBuffer(f.buffer, { ...opts, mimetype: f.mimetype })));
}

// Xoá theo ref (asset://…); URL ngoài (vd ảnh demo) bỏ qua
export const deleteByRef = (ref) => storage.remove(ref);

export const AVATAR_TRANSFORM = [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }];
