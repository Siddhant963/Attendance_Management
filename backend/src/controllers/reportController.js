import { Attendance } from '../models/Attendance.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { businessDate } from '../utils/dates.js';
import { userScopeFilter, canAccessUser } from '../services/scopeService.js';
import { serialize } from '../services/attendanceService.js';

/** Daily attendance report. Employee: own data, manager: team, admin: everyone. */
export const daily = asyncHandler(async (req, res) => {
  const date = req.query.date || businessDate();
  const filter = { date, ...(await userScopeFilter(req.user)) };
  if (req.query.userId) {
    if (!(await canAccessUser(req.user, req.query.userId))) throw ApiError.forbidden();
    filter.user = req.query.userId;
  }
  const records = await Attendance.find(filter)
    .sort({ 'punchIn.at': 1 })
    .limit(1000)
    .populate('user', 'name email role')
    .populate('verification.reviewedBy', 'name');
  const rows = records.map(serialize);
  const count = (key, value) => rows.filter((r) => r[key] === value).length;
  res.json({
    date,
    summary: {
      total: rows.length,
      completed: count('status', 'completed'),
      incomplete: count('status', 'incomplete'),
      inProgress: count('status', 'in_progress'),
      invalid: rows.filter((r) => r.verification.status === 'invalid').length,
    },
    rows,
  });
});
