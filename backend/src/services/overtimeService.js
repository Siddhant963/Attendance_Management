import { Attendance } from '../models/Attendance.js';
import { OvertimeRequest } from '../models/OvertimeRequest.js';
import { ApiError } from '../utils/ApiError.js';
import { userScopeFilter, assertCanReview } from './scopeService.js';

export async function request(user, { attendanceId, requestedHours, reason }) {
  const attendance = await Attendance.findOne({ _id: attendanceId, user: user._id });
  if (!attendance) throw ApiError.notFound('Attendance record not found');
  if (!attendance.punchOut) throw ApiError.conflict('Punch out before requesting overtime');
  try {
    const ot = await OvertimeRequest.create({
      attendance: attendance._id,
      user: user._id,
      date: attendance.date,
      requestedHours,
      reason,
    });
    attendance.overtimeStatus = 'pending';
    await attendance.save();
    return ot;
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('An overtime request already exists for this day');
    throw err;
  }
}

const populateRefs = (q) => q.populate('user', 'name email').populate('reviewedBy', 'name');

async function paginate(filter, page, limit) {
  const [items, total] = await Promise.all([
    populateRefs(OvertimeRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)),
    OvertimeRequest.countDocuments(filter),
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) || 1 };
}

export const listMine = (user, { status, page, limit }) => paginate({ user: user._id, ...(status && { status }) }, page, limit);

/** Approval queue: requests from the actor's scope, excluding the actor's own. */
export async function listScoped(actor, { status, page, limit }) {
  const scope = await userScopeFilter(actor);
  const users = scope.user
    ? { $in: scope.user.$in.filter((id) => String(id) !== String(actor._id)) }
    : { $ne: actor._id };
  return paginate({ user: users, ...(status && { status }) }, page, limit);
}

export async function decide(actor, id, { decision, remarks }) {
  const existing = await OvertimeRequest.findById(id);
  if (!existing) throw ApiError.notFound('Overtime request not found');
  await assertCanReview(actor, existing.user);

  const ot = await OvertimeRequest.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { status: decision, reviewedBy: actor._id, reviewedAt: new Date(), reviewRemarks: remarks || undefined },
    { returnDocument: 'after' }
  );
  if (!ot) throw ApiError.conflict('This request has already been reviewed');
  await Attendance.updateOne({ _id: ot.attendance }, { overtimeStatus: decision });
  return populateRefs(OvertimeRequest.findById(ot._id));
}

export const serialize = (ot) => {
  const o = ot.toObject ? ot.toObject() : ot;
  return {
    id: o._id,
    attendanceId: o.attendance,
    user: o.user && o.user._id ? { id: o.user._id, name: o.user.name, email: o.user.email } : o.user,
    date: o.date,
    requestedHours: o.requestedHours,
    reason: o.reason,
    status: o.status,
    reviewedBy: o.reviewedBy && o.reviewedBy.name ? { id: o.reviewedBy._id, name: o.reviewedBy.name } : undefined,
    reviewedAt: o.reviewedAt,
    reviewRemarks: o.reviewRemarks,
    createdAt: o.createdAt,
  };
};
