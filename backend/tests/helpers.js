import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'attendflow-'));

const { MongoMemoryServer } = await import('mongodb-memory-server');
const { default: mongoose } = await import('mongoose');
const { default: bcrypt } = await import('bcryptjs');
const { createApp } = await import('../src/app.js');
const { User } = await import('../src/models/User.js');
const { default: request } = await import('supertest');

export const app = createApp();
export const api = request(app);
export { mongoose, User };

let mongod;
export async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}
export async function stopDb() {
  await mongoose.disconnect();
  await mongod.stop();
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
}
export async function resetDb() {
  await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
}

export async function makeUser(role, overrides = {}) {
  const email = overrides.email || `${role}-${Math.random().toString(36).slice(2, 8)}@t.test`;
  const user = await User.create({
    name: `${role} user`,
    email,
    passwordHash: await bcrypt.hash('Passw0rdTest', 4),
    role,
    ...overrides,
  });
  const res = await api.post('/api/auth/login').send({ email, password: 'Passw0rdTest' });
  return { user, token: res.body.token, auth: { Authorization: `Bearer ${res.body.token}` } };
}

const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
export const selfie = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
export const punchBody = (extra = {}) => ({ selfie, latitude: 12.97, longitude: 77.59, accuracy: 20, ...extra });
