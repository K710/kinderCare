import { Router } from 'express';
import * as ctrl from '../controllers/healthRecord.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { checkOwnership, checkResourceOwnership } from '../middlewares/checkOwnership.js';
import { HealthRecord } from '../models/HealthRecord.js';
import { ROLES } from '../config/constants.js';
import { idParam } from '../validators/common.validator.js';
import { studentParams, createHealthSchema, bulkHealthSchema, updateHealthSchema } from '../validators/healthRecord.validator.js';

const router = Router();
const { ADMIN, PRINCIPAL, TEACHER, PARENT } = ROLES;
const ownRecord = checkResourceOwnership(HealthRecord);

router.use(authenticate);

/**
 * @openapi
 * /health-records/student/{studentId}:
 *   get:
 *     tags: [HealthRecords]
 *     summary: "Lịch sử đo 1 bé cho biểu đồ (A, P, T lớp bé, PH của bé) → { items (tăng dần), latest }"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: studentId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /health-records:
 *   post:
 *     tags: [HealthRecords]
 *     summary: "Thêm lần đo (T lớp bé) – { student, measuredAt, height cm, weight kg, note? }; bmi tự tính"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created } }
 * /health-records/bulk:
 *   post:
 *     tags: [HealthRecords]
 *     summary: "Đo cả lớp (T lớp mình) – { class, measuredAt, records: [{ student, height, weight, note? }] }, upsert theo bé+ngày"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: "{ created, updated, total }" } }
 * /health-records/{id}:
 *   patch:
 *     tags: [HealthRecords]
 *     summary: Sửa lần đo (T lớp bé)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   delete:
 *     tags: [HealthRecords]
 *     summary: Xoá lần đo (T lớp bé)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/student/:studentId', authorize(ADMIN, PRINCIPAL, TEACHER, PARENT), validate(studentParams), checkOwnership(), ctrl.listByStudent);
router.post('/', authorize(TEACHER), validate(createHealthSchema), checkOwnership(), ctrl.create);
router.post('/bulk', authorize(TEACHER), validate(bulkHealthSchema), checkOwnership(), ctrl.bulkCreate);
router.patch('/:id', authorize(TEACHER), validate(updateHealthSchema), ownRecord, ctrl.update);
router.delete('/:id', authorize(TEACHER), validate(idParam), ownRecord, ctrl.remove);

export default router;
