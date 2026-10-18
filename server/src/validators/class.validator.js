import { z } from 'zod';
import { AGE_GROUPS } from '../config/constants.js';
import { objectId, boolStr, paginationQuery } from './common.validator.js';

export const listClassesSchema = {
  query: paginationQuery.extend({
    schoolYear: objectId.optional(),
    ageGroup: z.enum(AGE_GROUPS).optional(),
    isActive: boolStr,
  }),
};

export const createClassSchema = {
  body: z.object({
    name: z.string().trim().min(1).max(50),
    ageGroup: z.enum(AGE_GROUPS),
    schoolYear: objectId,
    teachers: z.array(objectId).max(3, 'Tối đa 3 giáo viên').optional(),
    room: z.string().trim().max(50).optional(),
    capacity: z.number().int().min(1).max(100).optional(),
  }),
};

export const updateClassSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: z.string().trim().min(1).max(50).optional(),
      ageGroup: z.enum(AGE_GROUPS).optional(),
      room: z.string().trim().max(50).optional(),
      capacity: z.number().int().min(1).max(100).optional(),
    })
    .strict(),
};

export const setTeachersSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ teachers: z.array(objectId).max(3, 'Tối đa 3 giáo viên') }),
};

export const addStudentsSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ studentIds: z.array(objectId).min(1, 'Chọn ít nhất 1 học sinh') }),
};

export const classStudentParams = {
  params: z.object({ id: objectId, studentId: objectId }),
};
