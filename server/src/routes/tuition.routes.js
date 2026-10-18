import { Router } from 'express';
import * as ctrl from '../controllers/tuition.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { checkResourceOwnership } from '../middlewares/checkOwnership.js';
import { Tuition } from '../models/Tuition.js';
import { ROLES } from '../config/constants.js';
import { idParam } from '../validators/common.validator.js';
import { audit } from '../middlewares/auditLog.js';
import {
  listTuitionSchema, myTuitionSchema, createTuitionSchema, bulkTuitionSchema, updateTuitionSchema, summarySchema,
} from '../validators/tuition.validator.js';

const router = Router();
const { ADMIN, PRINCIPAL, PARENT } = ROLES;

router.use(authenticate);

/**
 * @openapi
 * /tuitions:
 *   get:
 *     tags: [Tuitions]
 *     summary: Danh sách học phí (A, P) – ?class&month&status&student&search (tên bé / mã HP)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Tuitions]
 *     summary: "Tạo 1 bản ghi (P) – { student, month YYYY-MM, items: [{ name, amount }], dueDate, note? }. amount = Σ items, sinh paymentCode"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created }, 409: { description: Bé đã có học phí tháng này } }
 * /tuitions/bulk:
 *   post:
 *     tags: [Tuitions]
 *     summary: "Tạo hàng loạt theo lớp (P) – { class, month, items, dueDate }; bé đã có → bỏ qua → { created, skipped: [{ student, fullName }], total }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /tuitions/my:
 *   get:
 *     tags: [Tuitions]
 *     summary: Học phí các con (PH) – ?month&status
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /tuitions/summary:
 *   get:
 *     tags: [Tuitions]
 *     summary: "Tổng thu theo tháng (P) – ?month&class → { count, totalAmount, totalPaid, remaining, unpaid, partial, paid, overdue }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /tuitions/{id}:
 *   get:
 *     tags: [Tuitions]
 *     summary: Chi tiết (A, P, PH của bé)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   patch:
 *     tags: [Tuitions]
 *     summary: "Sửa items/dueDate/note (P). Đã có tiền vào → bắt buộc reason, Σ items ≥ paidAmount, ghi AuditLog ADJUST_TUITION"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   delete:
 *     tags: [Tuitions]
 *     summary: Xoá khi chưa có thanh toán (P)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', authorize(ADMIN, PRINCIPAL), validate(listTuitionSchema), ctrl.list);
router.get('/my', authorize(PARENT), validate(myTuitionSchema), ctrl.my);
router.get('/summary', authorize(ADMIN, PRINCIPAL), validate(summarySchema), ctrl.summary);
router.post('/', authorize(PRINCIPAL), validate(createTuitionSchema), audit('CREATE_TUITION', 'Tuition'), ctrl.create);
router.post('/bulk', authorize(PRINCIPAL), validate(bulkTuitionSchema), audit('BULK_CREATE_TUITION', 'Tuition'), ctrl.bulkCreate);
router.get('/:id', authorize(ADMIN, PRINCIPAL, PARENT), validate(idParam), checkResourceOwnership(Tuition), ctrl.getById);
router.patch('/:id', authorize(PRINCIPAL), validate(updateTuitionSchema), audit('UPDATE_TUITION', 'Tuition'), ctrl.update);
router.delete('/:id', authorize(PRINCIPAL), validate(idParam), audit('DELETE_TUITION', 'Tuition'), ctrl.remove);

export default router;
