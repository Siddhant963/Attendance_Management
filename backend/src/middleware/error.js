import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export const notFound = (req, _res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  let status = err.status || 500;
  let message = err.message;
  if (err.type === 'entity.too.large') { status = 413; message = 'Request body too large'; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body'; }
  else if (err.name === 'CastError') { status = 400; message = 'Invalid identifier'; }
  else if (err.code === 11000) { status = 409; message = 'A record with these details already exists'; }

  if (status >= 500) {
    logger.error(err);
    message = env.isProd ? 'Internal server error' : message;
  }
  res.status(status).json({ message, ...(err.details ? { details: err.details } : {}) });
};
