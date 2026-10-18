import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { authLimiter, loginIdentifierLimiter } from '../middlewares/rateLimiter.js';
import { audit } from '../middlewares/auditLog.js';
import { ROLES } from '../config/constants.js';
import {
  loginSchema,
  registerSchema,
  updateMeSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập bằng email hoặc số điện thoại
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier: { type: string, example: admin@kindercare.vn }
 *               password: { type: string, example: "123456" }
 *     responses:
 *       200: { description: Trả về user + accessToken, refresh token nằm trong cookie httpOnly }
 *       401: { description: Sai thông tin đăng nhập }
 */
// Giới hạn theo IP (authLimiter) và theo tài khoản (loginIdentifierLimiter, chỉ đếm lần sai)
router.post('/login', authLimiter, validate(loginSchema), loginIdentifierLimiter, audit('LOGIN', 'User', { always: true }), ctrl.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Cấp access token mới từ refresh token (cookie hoặc body.refreshToken)
 *     responses:
 *       200: { description: user + accessToken mới }
 *       401: { description: Refresh token không hợp lệ }
 */
router.post('/refresh', authLimiter, ctrl.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng xuất thiết bị hiện tại
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.post('/logout', authenticate, audit('LOGOUT', 'User'), ctrl.logout);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Admin tạo tài khoản mới
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password, role]
 *             properties:
 *               fullName: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [admin, principal, teacher, parent] }
 *     responses:
 *       201: { description: Tạo thành công }
 *       409: { description: Email/sđt trùng }
 */
router.post('/register', authenticate, authorize(ROLES.ADMIN), validate(registerSchema), audit('REGISTER', 'User'), ctrl.register);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Thông tin tài khoản đang đăng nhập
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User }
 *   patch:
 *     tags: [Auth]
 *     summary: Cập nhật họ tên / sđt / avatar
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User sau cập nhật }
 */
router.get('/me', authenticate, ctrl.getMe);
router.patch('/me', authenticate, validate(updateMeSchema), ctrl.updateMe);

/**
 * @openapi
 * /auth/me/password:
 *   patch:
 *     tags: [Auth]
 *     summary: Đổi mật khẩu (đăng xuất mọi thiết bị)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.patch('/me/password', authenticate, validate(changePasswordSchema), audit('CHANGE_PASSWORD', 'User'), ctrl.changePassword);

export default router;
