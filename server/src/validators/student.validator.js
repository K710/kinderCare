import { z } from 'zod';
import { GENDERS, STUDENT_STATUS } from '../config/constants.js';
import { objectId, dateStr, phone, paginationQuery } from './common.validator.js';

export const listStudentsSchema = {
  query: paginationQuery.extend({
    class: objectId.optional(),
    status: z.enum(STUDENT_STATUS).optional(),
    unassigned: z.enum(['true']).optional(), // chỉ bé chưa xếp lớp
  }),
};

const emergencyContact = z.object({
  name: z.string().trim().max(100).default(''),
  phone: z.string().trim().max(20).default(''),
  relation: z.string().trim().max(50).default(''),
});

const base = {
  fullName: z.string().trim().min(2).max(100),
  nickname: z.string().trim().max(50).optional(),
  dateOfBirth: dateStr.refine((d) => d < new Date(), 'Ngày sinh phải trong quá khứ'),
  gender: z.enum(GENDERS),
  class: objectId.nullable().optional(),
  parents: z.array(objectId).min(1, 'Cần ít nhất 1 phụ huynh').max(4),
  enrollDate: dateStr.optional(),
  allergies: z.array(z.string().trim().min(1).max(100)).optional(),
  medicalNotes: z.string().trim().max(2000).optional(),
  emergencyContact: emergencyContact.optional(),
};

export const createStudentSchema = { body: z.object(base) };

export const updateStudentSchema = {
  params: z.object({ id: objectId }),
  body: z.object(base).omit({ parents: true, class: true }).partial().strict(),
};

export const setParentsSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ parents: z.array(objectId).min(1, 'Cần ít nhất 1 phụ huynh').max(4) }),
};

export const setStudentStatusSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ status: z.enum(STUDENT_STATUS) }),
};

export { phone };
