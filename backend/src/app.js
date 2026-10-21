import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientOrigins }));
  if (!env.isTest) {
    app.use(morgan(env.isProd ? 'combined' : 'dev', { stream: { write: (line) => logger.info(line.trim()) } }));
  }
  // Selfies arrive as base64 data URLs (<= 1.5 MB decoded), hence the larger body limit.
  app.use(express.json({ limit: '3mb' }));
  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
