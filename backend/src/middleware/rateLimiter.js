const rateLimit = require('express-rate-limit');
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, IS_DEVELOPMENT } = require('../config/env');

// In development the limiter gets in the way rather than protecting anything:
// the results page polls every 30s, hot reloads replay requests, and manual
// testing hammers endpoints — 100 requests / 15 min is spent in minutes. Skip
// it locally; production still enforces the configured limits.
const skipInDev = () => IS_DEVELOPMENT;

// General API limiter
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
  message: { error: 'Too many requests. Please try again later.' },
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

module.exports = { apiLimiter, authLimiter };
