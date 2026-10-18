import { Router } from 'express';
import * as ctrl from '../controllers/schoolYear.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { ROLES } from '../config/constants.js';
import { idParam } from '../validators/common.validator.js';
import { audit } from '../middlewares/auditLog.js';
import { createSchoolYearSchema, updateSchoolYearSchema } from '../validators/schoolYear.validator.js';

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /school-years:
 *   get:
 *     tags: [SchoolYears]
 *     summary: Danh sách năm học (mọi role)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [SchoolYears]
 *     summary: "Tạo năm học (A) – { name '2025-2026', startDate, endDate, isCurrent?, tuitionDefault? }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created } }
 * /school-years/current:
 *   get:
 *     tags: [SchoolYears]
 *     summary: Năm học hiện tại
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK }, 404: { description: Chưa thiết lập } }
 * /school-years/{id}:
 *   get:
 *     tags: [SchoolYears]
 *     summary: Chi tiết
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   patch:
 *     tags: [SchoolYears]
 *     summary: Sửa (A)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   delete:
 *     tags: [SchoolYears]
 *     summary: Xoá nếu chưa có lớp (A)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /school-years/{id}/set-current:
 *   patch:
 *     tags: [SchoolYears]
 *     summary: Đặt làm năm học hiện tại (A)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', ctrl.list);
router.get('/current', ctrl.getCurrent);
router.post('/', authorize(ROLES.ADMIN), validate(createSchoolYearSchema), audit('CREATE_SCHOOL_YEAR', 'SchoolYear'), ctrl.create);
router.get('/:id', validate(idParam), ctrl.getById);
router.patch('/:id', authorize(ROLES.ADMIN), validate(updateSchoolYearSchema), audit('UPDATE_SCHOOL_YEAR', 'SchoolYear'), ctrl.update);
router.patch('/:id/set-current', authorize(ROLES.ADMIN), validate(idParam), audit('SET_CURRENT_SCHOOL_YEAR', 'SchoolYear'), ctrl.setCurrent);
router.delete('/:id', authorize(ROLES.ADMIN), validate(idParam), audit('DELETE_SCHOOL_YEAR', 'SchoolYear'), ctrl.remove);

export default router;
