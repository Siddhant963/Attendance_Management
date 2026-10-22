import { z } from 'zod';
import { ROLES } from './models/User.js';
import { isDateString } from './utils/dates.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
const dateString = z.string().refine(isDateString, 'Date must be YYYY-MM-DD');
const optionalText = (max) => z.string().trim().max(max).optional();

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is required').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    password,
  })
  .strict();

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const punchSchema = z.object({
  selfie: z.string().min(1, 'A live selfie is required'),
  latitude: z.number({ error: 'Location is required' }).min(-90).max(90),
  longitude: z.number({ error: 'Location is required' }).min(-180).max(180),
  accuracy: z.number().min(0).optional(),
});

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

export const attendanceQuerySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
  userId: objectId.optional(),
  status: z.enum(['in_progress', 'completed', 'incomplete']).optional(),
  verification: z.enum(['pending', 'valid', 'invalid']).optional(),
  overtime: z.enum(['none', 'pending', 'approved', 'rejected']).optional(),
  ...pagination,
});

export const idParamSchema = z.object({ id: objectId });
export const selfieParamSchema = z.object({ id: objectId, kind: z.enum(['in', 'out']) });

export const verificationSchema = z
  .object({ status: z.enum(['valid', 'invalid']), remarks: optionalText(500) })
  .refine((v) => v.status === 'valid' || !!v.remarks, { message: 'Remarks are required when marking attendance invalid', path: ['remarks'] });

export const overtimeCreateSchema = z.object({
  attendanceId: objectId,
  requestedHours: z.number().min(0.5, 'Minimum 0.5 hours').max(12, 'Maximum 12 hours'),
  reason: z.string().trim().min(3, 'Please give a reason').max(500),
});

export const overtimeQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  ...pagination,
});

export const overtimeDecisionSchema = z
  .object({ decision: z.enum(['approved', 'rejected']), remarks: optionalText(500) })
  .refine((v) => v.decision === 'approved' || !!v.remarks, { message: 'Remarks are required when rejecting', path: ['remarks'] });

export const userQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  role: z.enum(ROLES).optional(),
  ...pagination,
});

export const userUpdateSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    manager: objectId.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const reportQuerySchema = z.object({
  date: dateString.optional(),
  userId: objectId.optional(),
});
