import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/auditLog.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { ROLES } from '../config/constants.js';
import { idParam, objectId, dateStr, paginationQuery } from '../validators/common.validator.js';

const router = Router();
router.use(authenticate, authorize(ROLES.ADMIN));

const listSchema = {
  query: paginationQuery.extend({
    user: objectId.optional(),
    action: z.string().trim().max(50).optional(),
    resource: z.string().trim().max(50).optional(),
    from: dateStr.optional(),
    to: dateStr.optional(),
  }),
};

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     tags: [AuditLogs]
 *     summary: Nhật ký hệ thống (A) – ?user&action&resource&from&to&page&limit (không kèm payload)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /audit-logs/actions:
 *   get:
 *     tags: [AuditLogs]
 *     summary: Danh sách action đã ghi (để lọc)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /audit-logs/{id}:
 *   get:
 *     tags: [AuditLogs]
 *     summary: Chi tiết kèm payload
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', validate(listSchema), ctrl.list);
router.get('/actions', ctrl.actions);
router.get('/:id', validate(idParam), ctrl.getById);

export default router;
