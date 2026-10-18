import { Router } from 'express';
import * as ctrl from '../controllers/attendance.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { checkOwnership, checkResourceOwnership } from '../middlewares/checkOwnership.js';
import { Attendance } from '../models/Attendance.js';
import { ROLES } from '../config/constants.js';
import {
  listAttendanceSchema, studentHistorySchema, bulkAttendanceSchema, updateAttendanceSchema, statsSchema,
} from '../validators/attendance.validator.js';

const router = Router();
const { ADMIN, PRINCIPAL, TEACHER, PARENT } = ROLES;

router.use(authenticate);

/**
 * @openapi
 * /attendance:
 *   get:
 *     tags: [Attendance]
 *     summary: Điểm danh lớp theo ngày (?class&date) hoặc khoảng (?class&from&to). A, P, T lớp mình
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: class, required: true, schema: { type: string } }
 *       - { in: query, name: date, schema: { type: string, format: date } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *     responses: { 200: { description: "{ date, items: [{ student, attendance|null }] }" } }
 * /attendance/bulk:
 *   post:
 *     tags: [Attendance]
 *     summary: "Điểm danh cả lớp 1 ngày, upsert (T lớp mình) – { class, date, records: [{ student, status, checkInAt?, checkOutAt?, note? }] }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: "{ created, updated, total }" } }
 * /attendance/stats:
 *   get:
 *     tags: [Attendance]
 *     summary: Tỉ lệ chuyên cần theo lớp trong tháng (A, P) – ?month=YYYY-MM&class?
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: month, required: true, schema: { type: string, example: "2026-10" } }
 *       - { in: query, name: class, schema: { type: string } }
 *     responses: { 200: { description: OK } }
 * /attendance/student/{studentId}:
 *   get:
 *     tags: [Attendance]
 *     summary: Lịch sử điểm danh 1 bé (A, P, T lớp bé, PH của bé) – ?month=YYYY-MM
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: studentId, required: true, schema: { type: string } }
 *       - { in: query, name: month, schema: { type: string } }
 *     responses: { 200: { description: "{ items, summary }" } }
 * /attendance/{id}:
 *   patch:
 *     tags: [Attendance]
 *     summary: "Sửa 1 bản ghi (T lớp mình) – { status?, checkInAt?, checkOutAt?, note? }"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', authorize(ADMIN, PRINCIPAL, TEACHER), validate(listAttendanceSchema), checkOwnership(), ctrl.listByClass);
router.get('/stats', authorize(ADMIN, PRINCIPAL), validate(statsSchema), ctrl.stats);
router.get(
  '/student/:studentId',
  authorize(ADMIN, PRINCIPAL, TEACHER, PARENT),
  validate(studentHistorySchema),
  checkOwnership(),
  ctrl.studentHistory,
);
router.post('/bulk', authorize(TEACHER), validate(bulkAttendanceSchema), checkOwnership(), ctrl.bulkMark);
router.patch(
  '/:id',
  authorize(TEACHER),
  validate(updateAttendanceSchema),
  checkResourceOwnership(Attendance),
  ctrl.update,
);

export default router;
