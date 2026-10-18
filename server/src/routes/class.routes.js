import { Router } from 'express';
import * as ctrl from '../controllers/class.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { checkOwnership } from '../middlewares/checkOwnership.js';
import { ROLES } from '../config/constants.js';
import { idParam } from '../validators/common.validator.js';
import { audit } from '../middlewares/auditLog.js';
import {
  listClassesSchema, createClassSchema, updateClassSchema, setTeachersSchema, addStudentsSchema, classStudentParams,
} from '../validators/class.validator.js';

const router = Router();
const { ADMIN, PRINCIPAL, TEACHER, PARENT } = ROLES;
const ownClass = checkOwnership({ class: ['id'], student: [] });

router.use(authenticate);

/**
 * @openapi
 * /classes:
 *   get:
 *     tags: [Classes]
 *     summary: Danh sách lớp (A/P tất cả, T lớp mình) – kèm studentCount
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: schoolYear, schema: { type: string } }
 *       - { in: query, name: ageGroup, schema: { type: string, enum: [nha_tre, mam, choi, la] } }
 *       - { in: query, name: isActive, schema: { type: boolean } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Classes]
 *     summary: "Tạo lớp (A, P) – { name, ageGroup, schoolYear, teachers?, room?, capacity? }"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created }, 409: { description: Trùng tên trong năm học } }
 * /classes/{id}:
 *   get:
 *     tags: [Classes]
 *     summary: Chi tiết lớp (A, P, T lớp mình, PH có con trong lớp)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK }, 403: { description: Không phải lớp của bạn } }
 *   patch:
 *     tags: [Classes]
 *     summary: Sửa tên/phòng/sĩ số (A, P)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   delete:
 *     tags: [Classes]
 *     summary: Xoá mềm, chỉ khi lớp không còn học sinh (A, P)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /classes/{id}/students:
 *   get:
 *     tags: [Classes]
 *     summary: Học sinh trong lớp (A, P, T lớp mình)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Classes]
 *     summary: "Thêm nhiều học sinh (A, P) – { studentIds[] }, kiểm tra sĩ số"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /classes/{id}/students/{studentId}:
 *   delete:
 *     tags: [Classes]
 *     summary: Chuyển bé ra khỏi lớp (A, P)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: path, name: studentId, required: true, schema: { type: string } }
 *     responses: { 200: { description: OK } }
 * /classes/{id}/teachers:
 *   patch:
 *     tags: [Classes]
 *     summary: "Gán / gỡ giáo viên (A, P) – { teachers[] } thay toàn bộ"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', authorize(ADMIN, PRINCIPAL, TEACHER), validate(listClassesSchema), ctrl.list);
router.post('/', authorize(ADMIN, PRINCIPAL), validate(createClassSchema), audit('CREATE_CLASS', 'Class'), ctrl.create);

router.get('/:id', authorize(ADMIN, PRINCIPAL, TEACHER, PARENT), validate(idParam), ownClass, ctrl.getById);
router.patch('/:id', authorize(ADMIN, PRINCIPAL), validate(updateClassSchema), audit('UPDATE_CLASS', 'Class'), ctrl.update);
router.delete('/:id', authorize(ADMIN, PRINCIPAL), validate(idParam), audit('DELETE_CLASS', 'Class'), ctrl.remove);

router.get('/:id/students', authorize(ADMIN, PRINCIPAL, TEACHER), validate(idParam), ownClass, ctrl.getStudents);
router.post('/:id/students', authorize(ADMIN, PRINCIPAL), validate(addStudentsSchema), audit('ADD_CLASS_STUDENTS', 'Class'), ctrl.addStudents);
router.delete('/:id/students/:studentId', authorize(ADMIN, PRINCIPAL), validate(classStudentParams), ctrl.removeStudent);

router.patch('/:id/teachers', authorize(ADMIN, PRINCIPAL), validate(setTeachersSchema), audit('SET_CLASS_TEACHERS', 'Class'), ctrl.setTeachers);

export default router;
