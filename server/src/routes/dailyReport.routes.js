import { Router } from 'express';
import * as ctrl from '../controllers/dailyReport.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { checkOwnership, checkResourceOwnership } from '../middlewares/checkOwnership.js';
import { DailyReport } from '../models/DailyReport.js';
import { ROLES } from '../config/constants.js';
import { idParam } from '../validators/common.validator.js';
import {
  listReportsSchema, studentReportsSchema, createReportSchema, bulkReportSchema, updateReportSchema,
} from '../validators/dailyReport.validator.js';

const router = Router();
const { ADMIN, PRINCIPAL, TEACHER, PARENT } = ROLES;
const ownReport = checkResourceOwnership(DailyReport);

router.use(authenticate);

/**
 * @openapi
 * /daily-reports:
 *   get:
 *     tags: [DailyReports]
 *     summary: "Nhận xét của lớp theo ngày (A, P, T lớp mình) – ?class&date → [{ student, report|null }]"
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: class, required: true, schema: { type: string } }
 *       - { in: query, name: date, required: true, schema: { type: string, format: date } }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [DailyReports]
 *     summary: "Tạo nhận xét 1 bé (T lớp bé) – { student, date, meals?, sleep?, mood?, toilet?, activities?, comment?, photos? }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created }, 409: { description: Đã có nhận xét ngày này } }
 * /daily-reports/bulk:
 *   post:
 *     tags: [DailyReports]
 *     summary: "Nhận xét nhanh cả lớp cùng nội dung, upsert (T lớp mình) – { class, date, students[], ...nội dung }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: "{ created, updated, total }" } }
 * /daily-reports/student/{studentId}:
 *   get:
 *     tags: [DailyReports]
 *     summary: Lịch sử nhận xét 1 bé (A, P, T lớp bé, PH của bé) – ?from&to, mặc định 30 ngày
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: studentId, required: true, schema: { type: string } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *     responses: { 200: { description: OK } }
 * /daily-reports/{id}:
 *   get:
 *     tags: [DailyReports]
 *     summary: Chi tiết (A, P, T lớp bé, PH của bé)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   patch:
 *     tags: [DailyReports]
 *     summary: Sửa (T lớp bé)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   delete:
 *     tags: [DailyReports]
 *     summary: Xoá (T lớp bé)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /daily-reports/{id}/seen:
 *   patch:
 *     tags: [DailyReports]
 *     summary: PH đánh dấu đã xem
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', authorize(ADMIN, PRINCIPAL, TEACHER), validate(listReportsSchema), checkOwnership(), ctrl.listByClass);
router.post('/', authorize(TEACHER), validate(createReportSchema), checkOwnership(), ctrl.create);
router.post('/bulk', authorize(TEACHER), validate(bulkReportSchema), checkOwnership(), ctrl.bulkCreate);
router.get(
  '/student/:studentId',
  authorize(ADMIN, PRINCIPAL, TEACHER, PARENT),
  validate(studentReportsSchema),
  checkOwnership(),
  ctrl.listByStudent,
);
router.get('/:id', authorize(ADMIN, PRINCIPAL, TEACHER, PARENT), validate(idParam), ownReport, ctrl.getById);
router.patch('/:id', authorize(TEACHER), validate(updateReportSchema), ownReport, ctrl.update);
router.patch('/:id/seen', authorize(PARENT), validate(idParam), ownReport, ctrl.markSeen);
router.delete('/:id', authorize(TEACHER), validate(idParam), ownReport, ctrl.remove);

export default router;
