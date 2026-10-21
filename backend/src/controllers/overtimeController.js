import * as service from '../services/overtimeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const page = (result) => ({ ...result, items: result.items.map(service.serialize) });

export const create = asyncHandler(async (req, res) => {
  const ot = await service.request(req.user, req.body);
  res.status(201).json({ overtime: service.serialize(ot) });
});

export const listMine = asyncHandler(async (req, res) => res.json(page(await service.listMine(req.user, req.query))));

export const listScoped = asyncHandler(async (req, res) => res.json(page(await service.listScoped(req.user, req.query))));

export const decide = asyncHandler(async (req, res) => {
  res.json({ overtime: service.serialize(await service.decide(req.user, req.params.id, req.body)) });
});
