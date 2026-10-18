import { Router } from 'express';
import * as storage from '../services/storage.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * @openapi
 * /files/{driver}/{key}:
 *   get:
 *     tags: [Upload]
 *     summary: "Tải ảnh/tệp qua link có chữ ký (exp, sig) do server cấp trong response"
 *     security: []
 *     parameters:
 *       - in: path
 *         name: driver
 *         schema: { type: string, enum: [local, cloudinary] }
 *       - in: path
 *         name: key
 *         schema: { type: string }
 *       - in: query
 *         name: exp
 *         schema: { type: integer }
 *       - in: query
 *         name: sig
 *         schema: { type: string }
 *     responses:
 *       200: { description: "Nội dung tệp (local)" }
 *       302: { description: "Chuyển hướng sang link Cloudinary có hạn" }
 *       403: { description: "Chữ ký sai hoặc link hết hạn" }
 */
// Không qua JWT (thẻ <img> không gửi được header) – bảo vệ bằng chữ ký HMAC + hạn dùng
router.get(
  '/:driver/*',
  asyncHandler(async (req, res) => {
    const { driver } = req.params;
    const key = req.params[0];
    const { exp, sig } = req.query;
    if (!storage.verifySigned(driver, key, exp, sig)) {
      throw ApiError.forbidden('Liên kết tệp không hợp lệ hoặc đã hết hạn', { code: 'FILE_LINK_INVALID' });
    }
    const r = await storage.resolve(driver, key);
    if (r.redirect) return res.redirect(302, r.redirect);
    const secondsLeft = Math.max(0, Math.floor((Number(exp) - Date.now()) / 1000));
    res.set('Cache-Control', `private, max-age=${secondsLeft}`);
    res.set('Content-Type', r.contentType);
    r.stream().pipe(res);
  }),
);

export default router;
