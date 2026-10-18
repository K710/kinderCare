import { Router } from 'express';
import * as ctrl from '../controllers/user.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { ROLES } from '../config/constants.js';
import { idParam } from '../validators/common.validator.js';
import { audit } from '../middlewares/auditLog.js';
import {
  listUsersSchema, createUserSchema, updateUserSchema, setStatusSchema, resetPasswordSchema, searchSchema,
} from '../validators/user.validator.js';

const router = Router();
const { ADMIN, PRINCIPAL, TEACHER } = ROLES;

router.use(authenticate);

/**
 * @openapi
 * /users/teachers:
 *   get:
 *     tags: [Users]
 *     summary: Danh sách giáo viên kèm lớp phụ trách (A, P)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: query, name: search, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /users/parents:
 *   get:
 *     tags: [Users]
 *     summary: Tìm phụ huynh kèm danh sách con (A, P, T)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: query, name: search, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/teachers', authorize(ADMIN, PRINCIPAL), validate(searchSchema), ctrl.listTeachers);
router.get('/parents', authorize(ADMIN, PRINCIPAL, TEACHER), validate(searchSchema), ctrl.listParents);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Danh sách tài khoản (A, P)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: role, schema: { type: string, enum: [admin, principal, teacher, parent] } }
 *       - { in: query, name: isActive, schema: { type: boolean } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Users]
 *     summary: Tạo tài khoản (A)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created }, 409: { description: Trùng email/sđt } }
 */
router.get('/', authorize(ADMIN, PRINCIPAL), validate(listUsersSchema), ctrl.list);
router.post('/', authorize(ADMIN), validate(createUserSchema), audit('CREATE_USER', 'User'), ctrl.create);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Chi tiết tài khoản (A, P)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   patch:
 *     tags: [Users]
 *     summary: Sửa thông tin / role (A)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: "Khoá / mở khoá (A) – body { isActive }"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /users/{id}/reset-password:
 *   post:
 *     tags: [Users]
 *     summary: "Đặt lại mật khẩu (A) – body { newPassword }"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/:id', authorize(ADMIN, PRINCIPAL), validate(idParam), ctrl.getById);
router.patch('/:id', authorize(ADMIN), validate(updateUserSchema), audit('UPDATE_USER', 'User'), ctrl.update);
router.patch('/:id/status', authorize(ADMIN), validate(setStatusSchema), audit('SET_USER_STATUS', 'User'), ctrl.setStatus);
router.post('/:id/reset-password', authorize(ADMIN), validate(resetPasswordSchema), audit('RESET_PASSWORD', 'User'), ctrl.resetPassword);

export default router;
