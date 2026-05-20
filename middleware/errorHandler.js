const logger = require('../utils/logger');

/**
 * 404 catch-all — register before the global error handler.
 */
const notFound = (req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
};

/**
 * Global error handler.
 * Never exposes stack traces in production.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';

  // ── Mongoose CastError (invalid ObjectId) ─────────────────────────────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message    = 'Invalid ID format';
  }

  // ── Mongoose ValidationError ───────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message    = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // ── Mongoose duplicate key ─────────────────────────────────────────────────
  if (err.code === 11000) {
    statusCode  = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message     = `This ${field} is already in use`;
  }

  // ── Multer ─────────────────────────────────────────────────────────────────
  if (err.name === 'MulterError') {
    statusCode = 400;
    message    = err.message;
  }

  // ── JWT ────────────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError')  { statusCode = 401; message = 'Invalid token'; }
  if (err.name === 'TokenExpiredError')  { statusCode = 401; message = 'Token has expired'; }

  // ── Log all 5xx errors ─────────────────────────────────────────────────────
  if (statusCode >= 500) {
    logger.error(message, {
      method: req.method,
      url:    req.originalUrl,
      stack:  err.stack,
    });
  }

  res.status(statusCode).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' && statusCode >= 500
      ? 'Something went wrong'
      : message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
