import { Router } from 'express';
import * as ctrl from '../controllers/album.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { checkOwnership, checkResourceOwnership } from '../middlewares/checkOwnership.js';
import { uploadImage, requireFile } from '../middlewares/upload.js';
import { Album } from '../models/Album.js';
import { ROLES } from '../config/constants.js';
import { idParam } from '../validators/common.validator.js';
import {
  listAlbumsSchema, createAlbumSchema, updateAlbumSchema, photoParams, captionSchema,
} from '../validators/album.validator.js';

const router = Router();
const { ADMIN, PRINCIPAL, TEACHER, PARENT } = ROLES;
const ALL = [ADMIN, PRINCIPAL, TEACHER, PARENT];
const ownAlbum = checkResourceOwnership(Album);

router.use(authenticate);

/**
 * @openapi
 * /albums:
 *   get:
 *     tags: [Albums]
 *     summary: Danh sách album (A/P tất cả, T lớp mình, PH lớp của con) – ?class&from&to&page&limit. Trả cover + photoCount
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: class, schema: { type: string } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Albums]
 *     summary: "Tạo album + upload ảnh (T lớp mình) – multipart: title, description?, class, date?, photos[] (≤20/lần)"
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, class]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               class: { type: string }
 *               date: { type: string, format: date }
 *               photos: { type: array, items: { type: string, format: binary } }
 *     responses: { 201: { description: Created }, 503: { description: Chưa cấu hình Cloudinary } }
 * /albums/{id}:
 *   get:
 *     tags: [Albums]
 *     summary: Chi tiết album kèm toàn bộ ảnh
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   patch:
 *     tags: [Albums]
 *     summary: Sửa tiêu đề / mô tả / ngày (T lớp mình)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   delete:
 *     tags: [Albums]
 *     summary: Xoá album và ảnh trên Cloudinary (T lớp mình)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /albums/{id}/photos:
 *   post:
 *     tags: [Albums]
 *     summary: Thêm ảnh (T lớp mình) – multipart photos[]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /albums/{id}/photos/{photoId}:
 *   patch:
 *     tags: [Albums]
 *     summary: "Sửa chú thích ảnh (T lớp mình) – { caption }"
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: path, name: photoId, required: true, schema: { type: string } }
 *     responses: { 200: { description: OK } }
 *   delete:
 *     tags: [Albums]
 *     summary: Xoá 1 ảnh (T lớp mình)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: path, name: photoId, required: true, schema: { type: string } }
 *     responses: { 200: { description: OK } }
 */
router.get('/', authorize(...ALL), validate(listAlbumsSchema), checkOwnership(), ctrl.list);
// multipart: multer parse body trước rồi mới validate + kiểm quyền theo body.class
router.post(
  '/',
  authorize(TEACHER),
  uploadImage.array('photos', 20),
  validate(createAlbumSchema),
  checkOwnership(),
  ctrl.create,
);
router.get('/:id', authorize(...ALL), validate(idParam), ownAlbum, ctrl.getById);
router.patch('/:id', authorize(TEACHER), validate(updateAlbumSchema), ownAlbum, ctrl.update);
router.delete('/:id', authorize(TEACHER), validate(idParam), ownAlbum, ctrl.remove);
router.post('/:id/photos', authorize(TEACHER), validate(idParam), ownAlbum, uploadImage.array('photos', 20), requireFile, ctrl.addPhotos);
router.patch('/:id/photos/:photoId', authorize(TEACHER), validate(captionSchema), ownAlbum, ctrl.setCaption);
router.delete('/:id/photos/:photoId', authorize(TEACHER), validate(photoParams), ownAlbum, ctrl.removePhoto);

export default router;
