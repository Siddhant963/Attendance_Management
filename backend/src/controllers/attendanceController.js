import * as service from '../services/attendanceService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { readSelfie } from '../utils/selfieStorage.js';
import { ApiError } from '../utils/ApiError.js';

const page = (result) => ({ ...result, items: result.items.map(service.serialize) });

export const punchIn = asyncHandler(async (req, res) => {
  res.status(201).json({ attendance: service.serialize(await service.punchIn(req.user, req.body)) });
});

export const punchOut = asyncHandler(async (req, res) => {
  res.json({ attendance: service.serialize(await service.punchOut(req.user, req.body)) });
});

export const current = asyncHandler(async (req, res) => {
  const record = await service.getCurrent(req.user);
  res.json({ attendance: record ? service.serialize(record) : null });
});

export const listMine = asyncHandler(async (req, res) => {
  res.json(page(await service.list(req.user, req.query, { mineOnly: true })));
});

export const listScoped = asyncHandler(async (req, res) => {
  res.json(page(await service.list(req.user, req.query)));
});

export const getOne = asyncHandler(async (req, res) => {
  res.json({ attendance: service.serialize(await service.getAccessible(req.user, req.params.id)) });
});

export const verify = asyncHandler(async (req, res) => {
  res.json({ attendance: service.serialize(await service.verify(req.user, req.params.id, req.body)) });
});

export const selfie = asyncHandler(async (req, res) => {
  const record = await service.getAccessible(req.user, req.params.id);
  const punch = req.params.kind === 'in' ? record.punchIn : record.punchOut;
  if (!punch) throw ApiError.notFound('Selfie not found');
  const { data, mime } = await readSelfie(punch.selfie);
  res.set({ 'Content-Type': mime, 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' }).send(data);
});
