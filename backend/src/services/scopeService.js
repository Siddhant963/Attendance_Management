import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Returns the user ids whose attendance the actor may see.
 * null means unrestricted (admin).
 */
async function visibleUserIds(actor) {
  if (actor.role === 'admin') return null;
  if (actor.role === 'manager') {
    const team = await User.find({ manager: actor._id }).select('_id').lean();
    return team.map((u) => u._id);
  }
  return [actor._id];
}

/** Mongo filter fragment for the `user` field restricted to the actor's scope. */
export async function userScopeFilter(actor) {
  const ids = await visibleUserIds(actor);
  return ids === null ? {} : { user: { $in: ids } };
}

/** Like userScopeFilter, but without the actor: reviewers can never act on their own records. */
export async function reviewScopeFilter(actor) {
  const ids = await visibleUserIds(actor);
  return { user: ids === null ? { $ne: actor._id } : { $in: ids.filter((id) => String(id) !== String(actor._id)) } };
}

export async function canAccessUser(actor, ownerId) {
  if (String(actor._id) === String(ownerId)) return true;
  if (actor.role === 'admin') return true;
  if (actor.role === 'manager') {
    return !!(await User.exists({ _id: ownerId, manager: actor._id }));
  }
  return false;
}

/** Reviewers (verification / overtime decisions) may never act on their own records. */
export async function assertCanReview(reviewer, ownerId) {
  if (String(reviewer._id) === String(ownerId)) throw ApiError.forbidden('You cannot review your own records');
  if (!(await canAccessUser(reviewer, ownerId))) throw ApiError.forbidden();
}
