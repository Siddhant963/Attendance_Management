import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDb(uri = env.mongoUri) {
  if (env.dnsServers.length) dns.setServers(env.dnsServers);
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  logger.info('MongoDB connected');
}
