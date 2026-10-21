import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Admin: paginated user directory. */
export const list = asyncHandler(async (req, res) => {
  const { search, role, page, limit } = req.query;
  const filter = {
    ...(role && { role }),
    ...(search && { $or: [{ name: new RegExp(escapeRegex(search), 'i') }, { email: new RegExp(escapeRegex(search), 'i') }] }),
  };
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('manager', 'name'),
    User.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

/** Admin or manager: users whose records the caller may filter by (id + name only). */
export const options = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { manager: req.user._id };
  const users = await User.find(filter).sort({ name: 1 }).select('name role').limit(500);
  res.json({ items: users });
});

export const managers = asyncHandler(async (_req, res) => {
  res.json({ items: await User.find({ role: 'manager', isActive: true }).sort({ name: 1 }).select('name') });
});

export const update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  const { role, manager, isActive } = req.body;

  if (String(user._id) === String(req.user._id) && ((role && role !== 'admin') || isActive === false)) {
    throw ApiError.badRequest('You cannot demote or disable your own account');
  }
  if (manager !== undefined) {
    if (manager !== null) {
      if (String(manager) === String(user._id)) throw ApiError.badRequest('A user cannot be their own manager');
      const mgr = await User.findById(manager);
      if (!mgr || mgr.role !== 'manager') throw ApiError.badRequest('Selected manager is not a manager');
    }
    user.manager = manager;
  }
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  await user.save();
  res.json({ user: await user.populate('manager', 'name') });
});
