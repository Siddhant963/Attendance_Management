import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

const MAX_BYTES = 1.5 * 1024 * 1024;
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/;

const SIGNATURES = {
  jpeg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  webp: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
};
const MIME = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const root = () => path.resolve(env.uploadDir, 'selfies');

/** Validates a camera-captured data URL and writes it to private storage. Returns the stored relative key. */
export async function saveSelfie(dataUrl, userId, kind) {
  const match = typeof dataUrl === 'string' ? DATA_URL.exec(dataUrl) : null;
  if (!match) throw ApiError.badRequest('Selfie must be a captured JPEG, PNG or WebP image');
  const [, type, b64] = match;
  const buffer = Buffer.from(b64, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_BYTES) throw ApiError.badRequest('Selfie is empty or larger than 1.5 MB');
  if (!SIGNATURES[type](buffer)) throw ApiError.badRequest('Selfie content does not match its image type');

  const key = path.posix.join(String(userId), `${Date.now()}-${kind}-${crypto.randomBytes(6).toString('hex')}.${type}`);
  const file = path.join(root(), key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buffer, { flag: 'wx' });
  return key;
}

export async function readSelfie(key) {
  const file = path.resolve(root(), key);
  if (!file.startsWith(root() + path.sep)) throw ApiError.notFound('Selfie not found');
  try {
    const data = await fs.readFile(file);
    return { data, mime: MIME[path.extname(file).slice(1)] || 'application/octet-stream' };
  } catch {
    throw ApiError.notFound('Selfie not found');
  }
}
