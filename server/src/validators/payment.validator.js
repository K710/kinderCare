import { z } from 'zod';
import { PAYMENT_STATUS } from '../config/constants.js';
import { objectId, dateStr, paginationQuery } from './common.validator.js';

export const listPaymentsSchema = {
  query: paginationQuery.extend({
    status: z.enum(PAYMENT_STATUS).optional(),
    method: z.enum(['bank', 'cash']).optional(),
    tuition: objectId.optional(),
    from: dateStr.optional(),
    to: dateStr.optional(),
  }),
};

export const codeParams = { params: z.object({ paymentCode: z.string().regex(/^HP[A-Z0-9]{8}$/, 'Mã thanh toán không hợp lệ') }) };
export const tuitionParams = { params: z.object({ tuitionId: objectId }) };

const reason = z.string().trim().min(3, 'Nhập lý do').max(500);

export const assignSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ tuitionId: objectId, note: z.string().trim().max(500).optional() }),
};

export const reasonSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ reason }),
};

export const manualSchema = {
  body: z.object({
    tuitionId: objectId,
    amount: z.number().int().positive('Số tiền phải > 0'),
    note: z.string().trim().max(500).optional(),
    transactionDate: dateStr.optional(),
  }),
};
