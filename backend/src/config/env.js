'use strict';

/**
 * Environment configuration — the single source of truth for all runtime config.
 *
 * Nothing outside this file should read `process.env` directly. Import the
 * frozen config object instead:
 *
 *   const { PORT, IS_PRODUCTION } = require('./config/env');
 *
 * Loading order (first value wins — dotenv never overwrites an existing var):
 *   1. Real process environment (Render / Docker / CI dashboards)
 *   2. .env.<NODE_ENV>.local
 *   3. .env.<NODE_ENV>
 *   4. .env
 *
 * In production, missing or unsafe values abort the boot rather than falling
 * back to a default — a placeholder JWT secret in production means anyone can
 * mint an admin token.
 */

const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
const NODE_ENV = process.env.NODE_ENV || 'development';

const IS_PRODUCTION = NODE_ENV === 'production';
const IS_TEST = NODE_ENV === 'test';
const IS_DEVELOPMENT = !IS_PRODUCTION && !IS_TEST;

for (const file of [`.env.${NODE_ENV}.local`, `.env.${NODE_ENV}`, '.env']) {
  dotenv.config({ path: path.join(ROOT, file) });
}

// ── Readers ───────────────────────────────────────────────────────────────────

const problems = [];

function raw(key) {
  const value = process.env[key];
  return value === undefined || value.trim() === '' ? undefined : value.trim();
}

/**
 * @param {string} key
 * @param {{ fallback?: string, requiredInProd?: boolean, secret?: boolean }} opts
 */
function str(key, opts = {}) {
  const value = raw(key);
  if (value !== undefined) return value;
  if (opts.requiredInProd && IS_PRODUCTION) {
    problems.push(`${key} is required in production but is not set.`);
  }
  return opts.fallback;
}

function int(key, fallback) {
  const value = raw(key);
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    problems.push(`${key} must be an integer (received "${value}").`);
    return fallback;
  }
  return parsed;
}

function bool(key, fallback = false) {
  const value = raw(key);
  if (value === undefined) return fallback;
  if (/^(1|true|yes|on)$/i.test(value)) return true;
  if (/^(0|false|no|off)$/i.test(value)) return false;
  problems.push(`${key} must be a boolean (received "${value}").`);
  return fallback;
}

function list(key, fallback = []) {
  const value = raw(key);
  if (value === undefined) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

/**
 * Secrets must be present, long enough, and not a known placeholder before we
 * are willing to sign tokens with them in production.
 */
function secret(key, devFallback) {
  const value = raw(key);
  const placeholder = /change[_-]?me|your[_-]?secret|placeholder|example/i;

  if (value === undefined) {
    if (IS_PRODUCTION) problems.push(`${key} is required in production but is not set.`);
    else console.warn(`[env] ${key} is not set — using an insecure development-only value.`);
    return devFallback;
  }
  if (IS_PRODUCTION && placeholder.test(value)) {
    problems.push(`${key} still contains a placeholder value. Generate a real secret.`);
  }
  if (IS_PRODUCTION && value.length < 32) {
    problems.push(`${key} must be at least 32 characters in production (received ${value.length}).`);
  }
  return value;
}

// ── Config ────────────────────────────────────────────────────────────────────

const config = {
  NODE_ENV,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  IS_TEST,

  PORT: int('PORT', 5000),
  // Render/Vercel/Heroku terminate TLS at a proxy. Express needs to trust it so
  // req.ip and the rate limiter see the real client address, not the proxy's.
  TRUST_PROXY: int('TRUST_PROXY', IS_PRODUCTION ? 1 : 0),

  // ── Auth ───────────────────────────────────────────────────────────────────
  JWT_SECRET: secret('JWT_SECRET', 'dev-only-insecure-access-secret-do-not-ship'),
  JWT_EXPIRES_IN: str('JWT_EXPIRES_IN', { fallback: '7d' }),
  JWT_REFRESH_SECRET: secret('JWT_REFRESH_SECRET', 'dev-only-insecure-refresh-secret-do-not-ship'),
  JWT_REFRESH_EXPIRES_IN: str('JWT_REFRESH_EXPIRES_IN', { fallback: '30d' }),

  // ── Supabase ───────────────────────────────────────────────────────────────
  SUPABASE_URL: str('SUPABASE_URL', { requiredInProd: true, fallback: '' }),
  SUPABASE_ANON_KEY: str('SUPABASE_ANON_KEY', { fallback: '' }),
  SUPABASE_SERVICE_ROLE_KEY: str('SUPABASE_SERVICE_ROLE_KEY', { requiredInProd: true, fallback: '' }),
  // Only needed if the project still issues legacy HS256 access tokens.
  // Projects on asymmetric keys are verified via JWKS and need nothing here.
  SUPABASE_JWT_SECRET: str('SUPABASE_JWT_SECRET', { fallback: '' }),

  // Direct Postgres connection — used ONLY by the migration runner. PostgREST
  // cannot execute DDL, so schema changes need a real connection.
  // Supabase → Project Settings → Database → Connection string (URI).
  // Use the direct or session-mode string; the transaction pooler (port 6543)
  // cannot hold the advisory lock migrations rely on.
  DATABASE_URL: str('DATABASE_URL', { fallback: '' }),
  RUN_MIGRATIONS_ON_BOOT: bool('RUN_MIGRATIONS_ON_BOOT', true),

  // ── Feature flags ──────────────────────────────────────────────────────────
  // Limits non-members to a single charter query. Off until /register exists —
  // enabling it without that page dead-ends users on their second query.
  MEMBERSHIP_GATE_ENABLED: bool('MEMBERSHIP_GATE_ENABLED', false),

  // ── Email ──────────────────────────────────────────────────────────────────
  EMAIL_FROM: str('EMAIL_FROM', { fallback: 'noreply@skyvayu.com' }),
  RESEND_API_KEY: str('RESEND_API_KEY', { fallback: '' }),
  ADMIN_EMAIL: str('ADMIN_EMAIL', { requiredInProd: true, fallback: 'admin@skyvayu.com' }),

  // ── Payments ───────────────────────────────────────────────────────────────
  RAZORPAY_KEY_ID: str('RAZORPAY_KEY_ID', { fallback: '' }),
  RAZORPAY_KEY_SECRET: str('RAZORPAY_KEY_SECRET', { fallback: '' }),
  // Set on the webhook itself in the Razorpay dashboard, NOT the same value as
  // the key secret. Without it the webhook endpoint rejects every delivery —
  // an unverified webhook would let anyone confirm a booking by POSTing to it.
  RAZORPAY_WEBHOOK_SECRET: str('RAZORPAY_WEBHOOK_SECRET', { fallback: '' }),

  // ── CORS ───────────────────────────────────────────────────────────────────
  // CORS_ORIGIN is accepted as an alias so older .env files keep working.
  ALLOWED_ORIGINS: list('ALLOWED_ORIGINS', list('CORS_ORIGIN', IS_PRODUCTION ? [] : ['http://localhost:5173'])),

  // ── Rate limiting ──────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: int('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  RATE_LIMIT_MAX: int('RATE_LIMIT_MAX', 100),
};

if (IS_PRODUCTION && config.ALLOWED_ORIGINS.length === 0) {
  problems.push('ALLOWED_ORIGINS is required in production (comma-separated list of frontend origins).');
}

if (config.SUPABASE_URL && !/^https?:\/\//.test(config.SUPABASE_URL)) {
  problems.push(`SUPABASE_URL must be an absolute URL (received "${config.SUPABASE_URL}").`);
}

if (problems.length > 0) {
  const detail = problems.map((p) => `  • ${p}`).join('\n');
  const message = `Invalid environment configuration (NODE_ENV=${NODE_ENV}):\n${detail}\n\nSee backend/.env.example for the full list of variables.`;
  if (IS_PRODUCTION) throw new Error(message);
  console.warn(`[env] ${message}`);
}

module.exports = Object.freeze(config);
