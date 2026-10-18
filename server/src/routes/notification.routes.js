import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { checkOwnership } from '../middlewares/checkOwnership.js';
import { ROLES } from '../config/constants.js';
import { idParam } from '../validators/common.validator.js';
import { audit } from '../middlewares/auditLog.js';
import { listNotificationsSchema, createNotificationSchema } from '../validators/notification.validator.js';

const router = Router();
const { ADMIN, PRINCIPAL, TEACHER } = ROLES;

router.use(authenticate);

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Thông báo của tôi theo scope (all / role / lớp liên quan / đích danh) – ?unread=true&page&limit. Mỗi item có isRead
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Notifications]
 *     summary: "Gửi thông báo – A/P mọi scope; T chỉ scope class lớp mình. { title, body, type?, scope, targetRole?, targetClass?, targetUsers?, link? }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created } }
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: "Số chưa đọc → { count }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Đánh dấu đã đọc tất cả
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Đánh dấu đã đọc 1 thông báo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Xoá (A, P)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', validate(listNotificationsSchema), ctrl.listMine);
router.get('/unread-count', ctrl.unreadCount);
router.patch('/read-all', ctrl.markAllRead);
router.post('/', authorize(ADMIN, PRINCIPAL, TEACHER), validate(createNotificationSchema), checkOwnership({ class: ['targetClass'], student: [] }), audit('SEND_NOTIFICATION', 'Notification'), ctrl.create);
router.patch('/:id/read', validate(idParam), ctrl.markRead);
router.delete('/:id', authorize(ADMIN, PRINCIPAL), validate(idParam), ctrl.remove);

export default router;
