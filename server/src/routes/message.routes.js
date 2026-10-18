import { Router } from 'express';
import * as ctrl from '../controllers/message.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { uploadFile, requireFile } from '../middlewares/upload.js';
import { ROLES } from '../config/constants.js';
import { userIdParams, historySchema, sendMessageSchema } from '../validators/message.validator.js';

const router = Router();

router.use(authenticate, authorize(ROLES.TEACHER, ROLES.PARENT));

/**
 * @openapi
 * /messages/contacts:
 *   get:
 *     tags: [Messages]
 *     summary: "Danh bạ – T: PH của lớp mình; PH: GV lớp của con → [{ user, students[] }]"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /messages/conversations:
 *   get:
 *     tags: [Messages]
 *     summary: "Hội thoại của tôi → [{ conversationId, user, lastMessage, unread }]"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /messages/unread-count:
 *   get:
 *     tags: [Messages]
 *     summary: Tổng tin chưa đọc
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /messages/upload:
 *   post:
 *     tags: [Messages]
 *     summary: "Upload file đính kèm (ảnh/PDF ≤10MB) – multipart 'file' → { url, type, name }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /messages:
 *   post:
 *     tags: [Messages]
 *     summary: "Gửi tin – { receiver, content?, attachments?, student? }. Chỉ T↔PH có bé chung"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created }, 403: { description: Không có quan hệ GV–PH } }
 * /messages/{userId}:
 *   get:
 *     tags: [Messages]
 *     summary: "Lịch sử với 1 người – ?before=ISO&limit → { items (mới nhất trước), hasMore }"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: userId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /messages/{userId}/read:
 *   patch:
 *     tags: [Messages]
 *     summary: Đánh dấu đã đọc toàn hội thoại
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: userId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/contacts', ctrl.contacts);
router.get('/conversations', ctrl.conversations);
router.get('/unread-count', ctrl.unreadTotal);
router.post('/upload', uploadFile.single('file'), requireFile, ctrl.upload);
router.post('/', validate(sendMessageSchema), ctrl.send);
router.get('/:userId', validate(historySchema), ctrl.history);
router.patch('/:userId/read', validate(userIdParams), ctrl.markRead);

export default router;
