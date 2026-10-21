// Creates dedicated demo/test accounts (one per role). They authenticate through the normal login endpoint.
// Refuses to run in production unless ALLOW_DEMO_SEED=true.
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';

export const DEMO_PASSWORD = 'Demo@12345';

const demoUsers = [
  { name: 'Demo Admin', email: 'admin.demo@attendflow.test', role: 'admin' },
  { name: 'Demo Manager', email: 'manager.demo@attendflow.test', role: 'manager' },
  { name: 'Demo Employee', email: 'employee.demo@attendflow.test', role: 'employee' },
];

if (env.isProd && process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error('Refusing to seed demo accounts in production (set ALLOW_DEMO_SEED=true to override).');
  process.exit(1);
}

await connectDb();
const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
const byEmail = {};
for (const u of demoUsers) {
  byEmail[u.email] = await User.findOneAndUpdate(
    { email: u.email },
    { ...u, passwordHash, isActive: true },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}
await User.updateOne({ email: 'employee.demo@attendflow.test' }, { manager: byEmail['manager.demo@attendflow.test']._id });

console.log('Demo accounts ready:');
demoUsers.forEach((u) => console.log(`  ${u.role.padEnd(8)} ${u.email}  /  ${DEMO_PASSWORD}`));
await mongoose.disconnect();
