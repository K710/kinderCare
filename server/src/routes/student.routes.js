import { Router } from 'express';
import * as ctrl from '../controllers/student.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { checkOwnership } from '../middlewares/checkOwnership.js';
import { uploadImage, requireFile } from '../middlewares/upload.js';
import { ROLES } from '../config/constants.js';
import { idParam } from '../validators/common.validator.js';
import { audit } from '../middlewares/auditLog.js';
import {
  listStudentsSchema, createStudentSchema, updateStudentSchema, setParentsSchema, setStudentStatusSchema,
} from '../validators/student.validator.js';

const router = Router();
const { ADMIN, PRINCIPAL, TEACHER, PARENT } = ROLES;
const ownStudent = checkOwnership({ student: ['id'], class: [] });

router.use(authenticate);

/**
 * @openapi
 * /students:
 *   get:
 *     tags: [Students]
 *     summary: Danh sách HS (A/P tất cả, T lớp mình). Không kèm allergies/medicalNotes
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: class, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, graduated, left] } }
 *       - { in: query, name: unassigned, schema: { type: string, enum: ['true'] }, description: Chỉ bé chưa xếp lớp }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Students]
 *     summary: "Tạo hồ sơ bé (A, P) – { fullName, dateOfBirth, gender, parents[], class?, allergies?, medicalNotes?, emergencyContact? }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created } }
 * /students/my-children:
 *   get:
 *     tags: [Students]
 *     summary: Danh sách con của phụ huynh đăng nhập (kèm lớp + GV)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /students/{id}:
 *   get:
 *     tags: [Students]
 *     summary: Chi tiết bé, gồm trường nhạy cảm (A, P, T lớp bé, PH của bé)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK }, 403: { description: Không có quyền } }
 *   patch:
 *     tags: [Students]
 *     summary: Sửa hồ sơ (A, P)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /students/{id}/avatar:
 *   patch:
 *     tags: [Students]
 *     summary: Upload ảnh đại diện (A, P, T lớp bé) – multipart field "avatar"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema: { type: object, properties: { avatar: { type: string, format: binary } } }
 *     responses: { 200: { description: OK }, 503: { description: Chưa cấu hình Cloudinary } }
 * /students/{id}/parents:
 *   patch:
 *     tags: [Students]
 *     summary: "Gán / gỡ phụ huynh (A, P) – { parents[] } thay toàn bộ"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /students/{id}/status:
 *   patch:
 *     tags: [Students]
 *     summary: active / graduated / left (A, P). Khác active → rời lớp
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', authorize(ADMIN, PRINCIPAL, TEACHER), validate(listStudentsSchema), ctrl.list);
router.get('/my-children', authorize(PARENT), ctrl.myChildren);
router.post('/', authorize(ADMIN, PRINCIPAL), validate(createStudentSchema), audit('CREATE_STUDENT', 'Student'), ctrl.create);

router.get('/:id', authorize(ADMIN, PRINCIPAL, TEACHER, PARENT), validate(idParam), ownStudent, ctrl.getById);
router.patch('/:id', authorize(ADMIN, PRINCIPAL), validate(updateStudentSchema), audit('UPDATE_STUDENT', 'Student'), ctrl.update);
router.patch(
  '/:id/avatar',
  authorize(ADMIN, PRINCIPAL, TEACHER),
  validate(idParam),
  ownStudent,
  uploadImage.single('avatar'),
  requireFile,
  ctrl.updateAvatar,
);
router.patch('/:id/parents', authorize(ADMIN, PRINCIPAL), validate(setParentsSchema), audit('SET_STUDENT_PARENTS', 'Student'), ctrl.setParents);
router.patch('/:id/status', authorize(ADMIN, PRINCIPAL), validate(setStudentStatusSchema), audit('SET_STUDENT_STATUS', 'Student'), ctrl.setStatus);

export default router;
