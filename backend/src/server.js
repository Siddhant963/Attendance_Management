import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';

try {
  await connectDb();
  createApp().listen(env.port, () => logger.info(`API listening on port ${env.port}`));
} catch (err) {
  logger.error(err);
  process.exit(1);
}
