import { Router } from 'express';
import * as ctrl from '../controllers/leaveRequest.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { checkOwnership, checkResourceOwnership } from '../middlewares/checkOwnership.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { ROLES } from '../config/constants.js';
import { idParam } from '../validators/common.validator.js';
import { listLeaveSchema, createLeaveSchema, updateLeaveSchema, reviewSchema, rejectLeaveSchema } from '../validators/leaveRequest.validator.js';

const router = Router();
const { ADMIN, PRINCIPAL, TEACHER, PARENT } = ROLES;
const own = checkResourceOwnership(LeaveRequest);

router.use(authenticate);

/**
 * @openapi
 * /leave-requests:
 *   get:
 *     tags: [LeaveRequests]
 *     summary: Danh sách đơn (A/P tất cả, T lớp mình) – ?class&status&student
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [LeaveRequests]
 *     summary: "PH tạo đơn cho con – { student, fromDate, toDate, reason }; trùng khoảng ngày → 409"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created } }
 * /leave-requests/my:
 *   get:
 *     tags: [LeaveRequests]
 *     summary: Đơn của các con (PH) – ?status&student
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /leave-requests/{id}:
 *   get:
 *     tags: [LeaveRequests]
 *     summary: Chi tiết (A, P, T lớp bé, PH của bé)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   patch:
 *     tags: [LeaveRequests]
 *     summary: PH sửa khi pending
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   delete:
 *     tags: [LeaveRequests]
 *     summary: PH huỷ khi pending
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /leave-requests/{id}/approve:
 *   patch:
 *     tags: [LeaveRequests]
 *     summary: "GV duyệt – { note? }. Tạo Attendance excused các ngày T2–T6, không ghi đè bản ghi đã có"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: "{ request, attendanceCreated, days }" } }
 * /leave-requests/{id}/reject:
 *   patch:
 *     tags: [LeaveRequests]
 *     summary: "GV từ chối – { note }"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', authorize(ADMIN, PRINCIPAL, TEACHER), validate(listLeaveSchema), checkOwnership(), ctrl.list);
router.get('/my', authorize(PARENT), validate(listLeaveSchema), ctrl.my);
router.post('/', authorize(PARENT), validate(createLeaveSchema), checkOwnership(), ctrl.create);
router.get('/:id', authorize(ADMIN, PRINCIPAL, TEACHER, PARENT), validate(idParam), own, ctrl.getById);
router.patch('/:id', authorize(PARENT), validate(updateLeaveSchema), own, ctrl.update);
router.delete('/:id', authorize(PARENT), validate(idParam), own, ctrl.remove);
router.patch('/:id/approve', authorize(TEACHER), validate(reviewSchema), own, ctrl.approve);
router.patch('/:id/reject', authorize(TEACHER), validate(rejectLeaveSchema), own, ctrl.reject);

export default router;
