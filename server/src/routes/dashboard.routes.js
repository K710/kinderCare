import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { ROLES } from '../config/constants.js';

const router = Router();
const { ADMIN, PRINCIPAL, TEACHER, PARENT } = ROLES;
router.use(authenticate);

/**
 * @openapi
 * /dashboard/principal:
 *   get:
 *     tags: [Dashboard]
 *     summary: "Tổng HS/GV/lớp, điểm danh hôm nay, học phí tháng này, số chờ duyệt (P, A)"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /dashboard/teacher:
 *   get:
 *     tags: [Dashboard]
 *     summary: "Lớp mình: sĩ số, điểm danh/nhận xét hôm nay, đơn nghỉ/thuốc chờ, chưa đọc (T)"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /dashboard/parent:
 *   get:
 *     tags: [Dashboard]
 *     summary: "Theo con: điểm danh + nhận xét hôm nay, học phí chưa đóng; chưa đọc (PH)"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /dashboard/admin:
 *   get:
 *     tags: [Dashboard]
 *     summary: "Tài khoản theo role, bị khoá, đăng nhập gần đây, audit hôm nay (A)"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 */
router.get('/principal', authorize(PRINCIPAL, ADMIN), ctrl.principal);
router.get('/teacher', authorize(TEACHER), ctrl.teacher);
router.get('/parent', authorize(PARENT), ctrl.parent);
router.get('/admin', authorize(ADMIN), ctrl.admin);

export default router;
