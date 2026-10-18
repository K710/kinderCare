import { Router } from 'express';
import * as ctrl from '../controllers/payment.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { checkResourceOwnership } from '../middlewares/checkOwnership.js';
import { sepayAuth } from '../middlewares/sepayAuth.js';
import { webhookLimiter } from '../middlewares/rateLimiter.js';
import { Tuition } from '../models/Tuition.js';
import { ROLES } from '../config/constants.js';
import { idParam } from '../validators/common.validator.js';
import { listPaymentsSchema, codeParams, tuitionParams, assignSchema, reasonSchema, manualSchema } from '../validators/payment.validator.js';

const router = Router();
const { ADMIN, PRINCIPAL, PARENT } = ROLES;

/**
 * @openapi
 * /payments/sepay-webhook:
 *   post:
 *     tags: [Payments]
 *     summary: "Webhook SePay (không JWT). Header Authorization: Apikey {SEPAY_WEBHOOK_KEY}. Luôn 200 {success:true} khi xử lý xong"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example: { id: 92704, gateway: Vietcombank, transactionDate: "2026-10-18 10:08:33", accountNumber: "0123499999", content: "HPA1B2C3D4 hoc phi", transferType: in, transferAmount: 2500000, referenceCode: MBVCB.3278907687 }
 *     responses:
 *       200: { description: "{ success: true }" }
 *       401: { description: Sai API key }
 */
router.post('/sepay-webhook', webhookLimiter, sepayAuth, ctrl.sepayWebhook);

router.use(authenticate);

/**
 * @openapi
 * /payments/status/{paymentCode}:
 *   get:
 *     tags: [Payments]
 *     summary: "Trạng thái theo mã HP cho polling 5s (PH của bé, P, A) → { status, isPaid, paidAmount, remaining, lastPayment }"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: paymentCode, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /payments/qr/{tuitionId}:
 *   get:
 *     tags: [Payments]
 *     summary: "Link VietQR + thông tin CK (PH của bé, P, A) → { qrUrl, account, bank, accountName, amount, paymentCode, instruction }"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: tuitionId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK }, 503: { description: Chưa cấu hình SePay } }
 * /payments:
 *   get:
 *     tags: [Payments]
 *     summary: Danh sách giao dịch (P, A) – ?status&method&tuition&from&to&search (mã/nội dung/referenceCode)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /payments/unmatched:
 *   get:
 *     tags: [Payments]
 *     summary: Giao dịch chưa khớp cần đối soát (P, A)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /payments/manual:
 *   post:
 *     tags: [Payments]
 *     summary: "Ghi nhận thu tiền mặt (P) – { tuitionId, amount, note?, transactionDate? }; transaction + AuditLog MANUAL_PAYMENT"
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created } }
 * /payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Chi tiết kèm rawPayload (P, A)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 *   delete:
 *     tags: [Payments]
 *     summary: "Xoá giao dịch tiền mặt ghi nhầm (P) – body { reason }; hoàn tiền qua applyPayment âm"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /payments/{id}/assign:
 *   patch:
 *     tags: [Payments]
 *     summary: "Gán tay giao dịch unmatched vào Tuition (P) – { tuitionId, note? }; transaction, status → manual, AuditLog ASSIGN_PAYMENT"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 * /payments/{id}/unassign:
 *   patch:
 *     tags: [Payments]
 *     summary: "Gỡ gán (P) – { reason } bắt buộc; applyPayment số âm trong transaction, về unmatched, AuditLog UNASSIGN_PAYMENT"
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK } }
 */
router.get('/status/:paymentCode', authorize(ADMIN, PRINCIPAL, PARENT), validate(codeParams), ctrl.status);
router.get('/qr/:tuitionId', authorize(ADMIN, PRINCIPAL, PARENT), validate(tuitionParams), checkResourceOwnership(Tuition, { param: 'tuitionId' }), ctrl.qr);
router.get('/', authorize(ADMIN, PRINCIPAL), validate(listPaymentsSchema), ctrl.list);
router.get('/unmatched', authorize(ADMIN, PRINCIPAL), validate(listPaymentsSchema), ctrl.unmatched);
router.post('/manual', authorize(PRINCIPAL), validate(manualSchema), ctrl.manual);
router.get('/:id', authorize(ADMIN, PRINCIPAL), validate(idParam), ctrl.getById);
router.patch('/:id/assign', authorize(PRINCIPAL), validate(assignSchema), ctrl.assign);
router.patch('/:id/unassign', authorize(PRINCIPAL), validate(reasonSchema), ctrl.unassign);
router.delete('/:id', authorize(PRINCIPAL), validate(reasonSchema), ctrl.removeCash);

export default router;
