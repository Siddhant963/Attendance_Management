import { Selfie } from '../models/Selfie.js';
import { ApiError } from './ApiError.js';

const MAX_BYTES = 1.5 * 1024 * 1024;
const OBJECT_ID = /^[a-f\d]{24}$/i;
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/;

const SIGNATURES = {
  jpeg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  webp: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
};

/** Validates a camera-captured data URL and stores the decoded bytes. Returns the storage key (the Selfie id). */
export async function saveSelfie(dataUrl, userId, kind) {
  const match = typeof dataUrl === 'string' ? DATA_URL.exec(dataUrl) : null;
  if (!match) throw ApiError.badRequest('Selfie must be a captured JPEG, PNG or WebP image');
  const [, type, b64] = match;
  const buffer = Buffer.from(b64, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_BYTES) throw ApiError.badRequest('Selfie is empty or larger than 1.5 MB');
  if (!SIGNATURES[type](buffer)) throw ApiError.badRequest('Selfie content does not match its image type');

  const doc = await Selfie.create({ user: userId, kind, contentType: `image/${type}`, size: buffer.length, data: buffer });
  return String(doc._id);
}

/** Returns { data, mime } for a storage key, or throws 404 when no such selfie exists. */
export async function readSelfie(key) {
  const doc = OBJECT_ID.test(key) ? await Selfie.findById(key) : null;
  if (!doc) throw ApiError.notFound('Selfie not found');
  return { data: Buffer.from(doc.data), mime: doc.contentType };
}

/** Removes a stored selfie. Used only to roll back a selfie whose attendance write failed. */
export async function deleteSelfie(key) {
  if (OBJECT_ID.test(key)) await Selfie.deleteOne({ _id: key });
}
