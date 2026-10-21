import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { env } from '../config/env.js';
import * as v from '../validators.js';
import * as auth from '../controllers/authController.js';
import * as attendance from '../controllers/attendanceController.js';
import * as overtime from '../controllers/overtimeController.js';
import * as users from '../controllers/userController.js';
import * as reports from '../controllers/reportController.js';
import * as dashboard from '../controllers/dashboardController.js';

const router = Router();
const reviewers = authorize('manager', 'admin');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { message: 'Too many attempts, try again later' },
});

router.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Auth
router.post('/auth/signup', authLimiter, validate(v.signupSchema), auth.signup);
router.post('/auth/login', authLimiter, validate(v.loginSchema), auth.login);
router.get('/auth/me', authenticate, auth.me);

router.use(authenticate);

// Attendance
router.post('/attendance/punch-in', validate(v.punchSchema), attendance.punchIn);
router.post('/attendance/punch-out', validate(v.punchSchema), attendance.punchOut);
router.get('/attendance/current', attendance.current);
router.get('/attendance/me', validate(v.attendanceQuerySchema, 'query'), attendance.listMine);
router.get('/attendance', reviewers, validate(v.attendanceQuerySchema, 'query'), attendance.listScoped);
router.get('/attendance/:id', validate(v.idParamSchema, 'params'), attendance.getOne);
router.get('/attendance/:id/selfie/:kind', validate(v.selfieParamSchema, 'params'), attendance.selfie);
router.patch('/attendance/:id/verification', reviewers, validate(v.idParamSchema, 'params'), validate(v.verificationSchema), attendance.verify);

// Overtime
router.post('/overtime', validate(v.overtimeCreateSchema), overtime.create);
router.get('/overtime/me', validate(v.overtimeQuerySchema, 'query'), overtime.listMine);
router.get('/overtime', reviewers, validate(v.overtimeQuerySchema, 'query'), overtime.listScoped);
router.patch('/overtime/:id/decision', reviewers, validate(v.idParamSchema, 'params'), validate(v.overtimeDecisionSchema), overtime.decide);

// Users
router.get('/users', authorize('admin'), validate(v.userQuerySchema, 'query'), users.list);
router.get('/users/options', reviewers, users.options);
router.get('/users/managers', authorize('admin'), users.managers);
router.patch('/users/:id', authorize('admin'), validate(v.idParamSchema, 'params'), validate(v.userUpdateSchema), users.update);

// Reports & dashboard
router.get('/reports/daily', validate(v.reportQuerySchema, 'query'), reports.daily);
router.get('/dashboard/summary', dashboard.summary);

export default router;
