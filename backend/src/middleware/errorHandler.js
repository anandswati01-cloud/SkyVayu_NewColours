'use strict';

const { IS_PRODUCTION, IS_DEVELOPMENT } = require('../config/env');

/**
 * Central error handler — must be the last middleware registered.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;

  // Always log server-side failures; 4xx are expected traffic and only noisy.
  if (status >= 500 || !IS_PRODUCTION) {
    console.error(`[error] ${req.method} ${req.originalUrl} → ${status}`, err);
  }

  // A 5xx message can carry database or upstream internals. Client errors are
  // written by us and safe to return verbatim.
  const message = status >= 500 && IS_PRODUCTION
    ? 'Internal server error.'
    : err.message || 'Internal server error.';

  res.status(status).json({
    error: message,
    ...(IS_DEVELOPMENT && { stack: err.stack }),
  });
}

/**
 * 404 handler — catches any unmatched routes.
 */
function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
}

module.exports = { errorHandler, notFound };
