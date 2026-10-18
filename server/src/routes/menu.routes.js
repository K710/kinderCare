import { Router } from 'express';
import * as ctrl from '../controllers/menu.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { ROLES } from '../config/constants.js';
import { idParam } from '../validators/common.validator.js';
import { listMenusSchema, createMenuSchema, updateMenuSchema, rejectSchema, currentMenuSchema } from '../validators/menu.validator.js';

const router = Router();
const { ADMIN, PRINCIPAL, TEACHER, PARENT } = ROLES;

router.use(authenticate);

/**
 * @openapi
 * /menus:
 *   get:
 *     tags: [Menus]
 *     summary: Danh sách thực đơn (A, P, T) – ?status&ageGroup&weekStart
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Menus]
 *     summary: "Tạo thực đơn nháp (P) – { weekStart, ageGroup?, days: [{ dayOfWeek 1-5, breakfast[], lunch[], snack[], note? }] }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created }, 409: { description: Tuần + nhóm tuổi đã có } }
 * /menus/current:
 *   get:
 *     tags: [Menus]
 *     summary: "Thực đơn đã duyệt của tuần (mặc định tuần này) theo nhóm tuổi liên quan user – ?date&ageGroup → { weekStart, items: [{ ageGroup, menu|null }] }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /menus/{id}:
 *   get:
 *     tags: [Menus]
 *     summary: Chi tiết (T/PH chỉ xem bản đã duyệt)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   patch:
 *     tags: [Menus]
 *     summary: Sửa khi nháp / bị từ chối (P)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   delete:
 *     tags: [Menus]
 *     summary: Xoá khi chưa duyệt (P)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /menus/{id}/submit:
 *   patch:
 *     tags: [Menus]
 *     summary: Gửi duyệt draft/rejected → pending (P)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /menus/{id}/approve:
 *   patch:
 *     tags: [Menus]
 *     summary: Duyệt pending → approved (P)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /menus/{id}/reject:
 *   patch:
 *     tags: [Menus]
 *     summary: "Từ chối pending → rejected (P) – { reason }"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', authorize(ADMIN, PRINCIPAL, TEACHER), validate(listMenusSchema), ctrl.list);
router.get('/current', authorize(ADMIN, PRINCIPAL, TEACHER, PARENT), validate(currentMenuSchema), ctrl.current);
router.post('/', authorize(PRINCIPAL), validate(createMenuSchema), ctrl.create);
router.get('/:id', authorize(ADMIN, PRINCIPAL, TEACHER, PARENT), validate(idParam), ctrl.getById);
router.patch('/:id', authorize(PRINCIPAL), validate(updateMenuSchema), ctrl.update);
router.patch('/:id/submit', authorize(PRINCIPAL), validate(idParam), ctrl.submit);
router.patch('/:id/approve', authorize(PRINCIPAL), validate(idParam), ctrl.approve);
router.patch('/:id/reject', authorize(PRINCIPAL), validate(rejectSchema), ctrl.reject);
router.delete('/:id', authorize(PRINCIPAL), validate(idParam), ctrl.remove);

export default router;
