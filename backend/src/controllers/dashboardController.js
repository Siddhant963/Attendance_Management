import { Attendance } from '../models/Attendance.js';
import { OvertimeRequest } from '../models/OvertimeRequest.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { businessDate } from '../utils/dates.js';
import { reviewScopeFilter, userScopeFilter } from '../services/scopeService.js';

const countBy = (arr, key) => Object.fromEntries(arr.map((x) => [x._id ?? 'none', x[key]]));

/** Role-aware summary numbers for the dashboards. */
export const summary = asyncHandler(async (req, res) => {
  const today = businessDate();
  const monthStart = `${today.slice(0, 7)}-01`;

  if (req.user.role === 'employee') {
    const mine = { user: req.user._id };
    const [month, ot] = await Promise.all([
      Attendance.aggregate([
        { $match: { ...mine, date: { $gte: monthStart } } },
        { $group: { _id: '$status', days: { $sum: 1 }, minutes: { $sum: '$workingMinutes' } } },
      ]),
      OvertimeRequest.aggregate([{ $match: mine }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    return res.json({
      role: 'employee',
      month: { days: month.reduce((s, m) => s + m.days, 0), minutes: month.reduce((s, m) => s + m.minutes, 0), byStatus: countBy(month, 'days') },
      overtime: countBy(ot, 'n'),
    });
  }

  const scope = await userScopeFilter(req.user);
  const reviewScope = await reviewScopeFilter(req.user);
  const teamIds = scope.user ? scope.user.$in : null;
  const [presentToday, pendingVerification, pendingOvertime, teamSize, roles] = await Promise.all([
    Attendance.countDocuments({ ...scope, date: today }),
    Attendance.countDocuments({ ...reviewScope, 'verification.status': 'pending', status: { $ne: 'in_progress' } }),
    OvertimeRequest.countDocuments({ ...reviewScope, status: 'pending' }),
    teamIds ? teamIds.length : User.countDocuments({ isActive: true }),
    req.user.role === 'admin' ? User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]) : [],
  ]);
  res.json({
    role: req.user.role,
    teamSize,
    presentToday,
    pendingVerification,
    pendingOvertime,
    ...(req.user.role === 'admin' ? { usersByRole: countBy(roles, 'n') } : {}),
  });
});
