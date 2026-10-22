import { Attendance } from '../models/Attendance.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { businessDate } from '../utils/dates.js';
import { pageResult } from '../utils/pagination.js';
import { deleteSelfie, saveSelfie } from '../utils/selfieStorage.js';
import { logger } from '../config/logger.js';
import { userScopeFilter, canAccessUser, assertCanReview } from './scopeService.js';

const statusForMinutes = (minutes) => (minutes >= env.standardShiftMinutes ? 'completed' : 'incomplete');

const buildPunch = async (user, kind, now, { selfie, latitude, longitude, accuracy }) => ({
  at: now,
  selfie: await saveSelfie(selfie, user._id, kind),
  latitude,
  longitude,
  ...(accuracy !== undefined ? { accuracy } : {}),
});

/** Best-effort rollback of a selfie whose attendance write failed; never masks the original error. */
async function discardSelfie(punch) {
  try {
    await deleteSelfie(punch.selfie);
  } catch (err) {
    logger.warn(`Could not remove orphaned selfie ${punch.selfie}: ${err.message}`);
  }
}

export async function punchIn(user, payload) {
  const now = new Date();
  const date = businessDate(now);
  const open = await Attendance.findOne({ user: user._id, punchOut: { $exists: false } }).lean();
  if (open) {
    throw ApiError.conflict(open.date === date ? 'You are already punched in' : `Punch out of ${open.date} before punching in again`);
  }
  if (await Attendance.exists({ user: user._id, date })) throw ApiError.conflict('Attendance for today is already recorded');

  const punch = await buildPunch(user, 'in', now, payload);
  try {
    return await Attendance.create({ user: user._id, date, punchIn: punch });
  } catch (err) {
    await discardSelfie(punch);
    if (err.code === 11000) throw ApiError.conflict('Attendance for today is already recorded');
    throw err;
  }
}

export async function punchOut(user, payload) {
  const now = new Date();
  const open = await Attendance.findOne({ user: user._id, punchOut: { $exists: false } });
  if (!open) throw ApiError.conflict('You are not punched in');

  const workingMinutes = Math.max(0, Math.round((now - open.punchIn.at) / 60000));
  const punch = await buildPunch(user, 'out', now, payload);
  // Guarded update: a concurrent second punch-out matches nothing.
  let updated;
  try {
    updated = await Attendance.findOneAndUpdate(
      { _id: open._id, punchOut: { $exists: false } },
      { punchOut: punch, workingMinutes, status: statusForMinutes(workingMinutes) },
      { returnDocument: 'after' }
    );
  } catch (err) {
    await discardSelfie(punch);
    throw err;
  }
  if (!updated) {
    await discardSelfie(punch);
    throw ApiError.conflict('You are already punched out');
  }
  return updated;
}

/** The open (not yet punched out) record, otherwise today's record. */
export const getCurrent = (user) =>
  Attendance.findOne({ user: user._id, $or: [{ punchOut: { $exists: false } }, { date: businessDate() }] }).sort({ date: -1 });

function buildFilter({ from, to, status, verification, overtime }) {
  const filter = {};
  if (from || to) filter.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  if (status) filter.status = status;
  if (verification) filter['verification.status'] = verification;
  if (overtime) filter.overtimeStatus = overtime;
  return filter;
}

export async function list(actor, query, { mineOnly = false } = {}) {
  const filter = buildFilter(query);
  if (mineOnly) {
    filter.user = actor._id;
  } else {
    Object.assign(filter, await userScopeFilter(actor));
    if (query.userId) {
      if (!(await canAccessUser(actor, query.userId))) throw ApiError.forbidden();
      filter.user = query.userId;
    }
  }
  const { page, limit } = query;
  const [items, total] = await Promise.all([
    Attendance.find(filter)
      .sort({ date: -1, 'punchIn.at': -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email role')
      .populate('verification.reviewedBy', 'name'),
    Attendance.countDocuments(filter),
  ]);
  return pageResult(items, total, { page, limit });
}

export async function getAccessible(actor, id) {
  const record = await Attendance.findById(id).populate('user', 'name email role').populate('verification.reviewedBy', 'name');
  if (!record || !(await canAccessUser(actor, record.user._id))) throw ApiError.notFound('Attendance record not found');
  return record;
}

export async function verify(actor, id, { status, remarks }) {
  const record = await Attendance.findById(id);
  if (!record) throw ApiError.notFound('Attendance record not found');
  await assertCanReview(actor, record.user);
  record.verification = { status, remarks: remarks || undefined, reviewedBy: actor._id, reviewedAt: new Date() };
  await record.save();
  return getAccessible(actor, id);
}

/** Public shape of a record. Selfie storage keys are never exposed; clients use the authorized selfie endpoint. */
export function serialize(record) {
  const doc = record.toObject ? record.toObject() : record;
  const shapePunch = (p, kind) =>
    p && {
      at: p.at,
      latitude: p.latitude,
      longitude: p.longitude,
      accuracy: p.accuracy,
      selfieUrl: `/api/attendance/${doc._id}/selfie/${kind}`,
    };
  const user = doc.user && doc.user._id ? { id: doc.user._id, name: doc.user.name, email: doc.user.email, role: doc.user.role } : doc.user;
  const v = doc.verification || {};
  return {
    id: doc._id,
    user,
    date: doc.date,
    punchIn: shapePunch(doc.punchIn, 'in'),
    punchOut: shapePunch(doc.punchOut, 'out'),
    workingMinutes: doc.workingMinutes,
    status: doc.status,
    overtimeStatus: doc.overtimeStatus,
    verification: {
      status: v.status || 'pending',
      remarks: v.remarks,
      reviewedAt: v.reviewedAt,
      reviewedBy: v.reviewedBy && v.reviewedBy.name ? { id: v.reviewedBy._id, name: v.reviewedBy.name } : undefined,
    },
  };
}
