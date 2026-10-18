import { Router } from 'express';
import * as ctrl from '../controllers/medicineNote.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { checkOwnership, checkResourceOwnership } from '../middlewares/checkOwnership.js';
import { MedicineNote } from '../models/MedicineNote.js';
import { ROLES } from '../config/constants.js';
import { idParam } from '../validators/common.validator.js';
import { listMedicineSchema, createMedicineSchema, updateMedicineSchema, addLogSchema } from '../validators/medicineNote.validator.js';

const router = Router();
const { ADMIN, PRINCIPAL, TEACHER, PARENT } = ROLES;
const own = checkResourceOwnership(MedicineNote);

router.use(authenticate);

/**
 * @openapi
 * /medicine-notes:
 *   get:
 *     tags: [MedicineNotes]
 *     summary: Danh sách dặn thuốc (A/P tất cả, T lớp mình) – ?class&status&date (còn hiệu lực ngày đó)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [MedicineNotes]
 *     summary: "PH tạo – { student, medicines: [{ name, dosage, time, note? }], fromDate, toDate }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created } }
 * /medicine-notes/my:
 *   get:
 *     tags: [MedicineNotes]
 *     summary: Dặn thuốc của các con (PH) – ?status
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /medicine-notes/{id}:
 *   get:
 *     tags: [MedicineNotes]
 *     summary: Chi tiết kèm lịch sử cho uống
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   patch:
 *     tags: [MedicineNotes]
 *     summary: PH sửa khi pending
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /medicine-notes/{id}/confirm:
 *   patch:
 *     tags: [MedicineNotes]
 *     summary: GV xác nhận đã nhận thuốc (pending → confirmed)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /medicine-notes/{id}/logs:
 *   post:
 *     tags: [MedicineNotes]
 *     summary: "GV ghi 1 lần cho uống – { givenAt?, note? }"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /medicine-notes/{id}/done:
 *   patch:
 *     tags: [MedicineNotes]
 *     summary: GV hoàn tất (confirmed → done)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /medicine-notes/{id}/cancel:
 *   patch:
 *     tags: [MedicineNotes]
 *     summary: PH huỷ (pending/confirmed → cancelled)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', authorize(ADMIN, PRINCIPAL, TEACHER), validate(listMedicineSchema), checkOwnership(), ctrl.list);
router.get('/my', authorize(PARENT), validate(listMedicineSchema), ctrl.my);
router.post('/', authorize(PARENT), validate(createMedicineSchema), checkOwnership(), ctrl.create);
router.get('/:id', authorize(ADMIN, PRINCIPAL, TEACHER, PARENT), validate(idParam), own, ctrl.getById);
router.patch('/:id', authorize(PARENT), validate(updateMedicineSchema), own, ctrl.update);
router.patch('/:id/confirm', authorize(TEACHER), validate(idParam), own, ctrl.confirm);
router.post('/:id/logs', authorize(TEACHER), validate(addLogSchema), own, ctrl.addLog);
router.patch('/:id/done', authorize(TEACHER), validate(idParam), own, ctrl.done);
router.patch('/:id/cancel', authorize(PARENT), validate(idParam), own, ctrl.cancel);

export default router;
