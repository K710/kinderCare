import { Router } from 'express';
import * as ctrl from '../controllers/lessonPlan.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { checkOwnership, checkResourceOwnership } from '../middlewares/checkOwnership.js';
import { LessonPlan } from '../models/LessonPlan.js';
import { ROLES } from '../config/constants.js';
import { idParam } from '../validators/common.validator.js';
import { rejectSchema } from '../validators/menu.validator.js';
import { listPlansSchema, createPlanSchema, updatePlanSchema } from '../validators/lessonPlan.validator.js';

const router = Router();
const { ADMIN, PRINCIPAL, TEACHER, PARENT } = ROLES;
const ownPlan = checkResourceOwnership(LessonPlan);

router.use(authenticate);

/**
 * @openapi
 * /lesson-plans:
 *   get:
 *     tags: [LessonPlans]
 *     summary: Danh sách kế hoạch (A/P tất cả, T lớp mình) – ?class&status&weekStart
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [LessonPlans]
 *     summary: "Tạo nháp (T lớp mình) – { class, weekStart, theme?, days: [{ dayOfWeek, activities: [{ time?, title, goal?, materials? }] }], attachments? }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created }, 409: { description: Lớp đã có kế hoạch tuần này } }
 * /lesson-plans/{id}:
 *   get:
 *     tags: [LessonPlans]
 *     summary: Chi tiết (A, P, T lớp mình, PH lớp con – chỉ bản đã duyệt)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   patch:
 *     tags: [LessonPlans]
 *     summary: Sửa khi nháp / bị từ chối (T lớp mình)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   delete:
 *     tags: [LessonPlans]
 *     summary: Xoá khi chưa duyệt (T lớp mình)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /lesson-plans/{id}/submit:
 *   patch:
 *     tags: [LessonPlans]
 *     summary: Gửi duyệt (T lớp mình)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /lesson-plans/{id}/approve:
 *   patch:
 *     tags: [LessonPlans]
 *     summary: Duyệt (P)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /lesson-plans/{id}/reject:
 *   patch:
 *     tags: [LessonPlans]
 *     summary: "Từ chối (P) – { reason }"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', authorize(ADMIN, PRINCIPAL, TEACHER), validate(listPlansSchema), checkOwnership(), ctrl.list);
router.post('/', authorize(TEACHER), validate(createPlanSchema), checkOwnership(), ctrl.create);
router.get('/:id', authorize(ADMIN, PRINCIPAL, TEACHER, PARENT), validate(idParam), ownPlan, ctrl.getById);
router.patch('/:id', authorize(TEACHER), validate(updatePlanSchema), ownPlan, ctrl.update);
router.patch('/:id/submit', authorize(TEACHER), validate(idParam), ownPlan, ctrl.submit);
router.patch('/:id/approve', authorize(PRINCIPAL), validate(idParam), ownPlan, ctrl.approve);
router.patch('/:id/reject', authorize(PRINCIPAL), validate(rejectSchema), ownPlan, ctrl.reject);
router.delete('/:id', authorize(TEACHER), validate(idParam), ownPlan, ctrl.remove);

export default router;
