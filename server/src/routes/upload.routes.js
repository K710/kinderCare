import { Router } from 'express';
import * as ctrl from '../controllers/upload.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { uploadImage, requireFile } from '../middlewares/upload.js';
import { ROLES } from '../config/constants.js';

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /upload/image:
 *   post:
 *     tags: [Upload]
 *     summary: "Upload 1 ảnh (mọi role) – multipart field 'file' → { url, publicId }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK }, 503: { description: Chưa cấu hình Cloudinary } }
 * /upload/images:
 *   post:
 *     tags: [Upload]
 *     summary: "Upload nhiều ảnh (T, P) – multipart field 'files' ≤10 → [{ url, publicId }]"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 */
router.post('/image', uploadImage.single('file'), requireFile, ctrl.image);
router.post('/images', authorize(ROLES.TEACHER, ROLES.PRINCIPAL), uploadImage.array('files', 10), requireFile, ctrl.images);

export default router;
