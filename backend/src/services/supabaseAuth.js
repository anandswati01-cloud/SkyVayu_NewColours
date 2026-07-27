'use strict';

/**
 * Supabase access token verification.
 *
 * Customers sign in with Google through Supabase, so their access token is
 * issued by Supabase — not by this API. This module verifies it so the backend
 * can trust the caller's identity instead of taking an id out of a request body.
 *
 * Two signing schemes are supported, chosen by the token's own header:
 *   • HS256 — legacy shared secret. Requires SUPABASE_JWT_SECRET.
 *   • RS256 / ES256 — asymmetric. Public keys are fetched from the project's
 *     JWKS endpoint and cached, so no secret is needed.
 *
 * The algorithm allowlist is pinned on both paths: a token can never talk the
 * verifier into using the wrong key type.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { SUPABASE_URL, SUPABASE_JWT_SECRET } = require('../config/env');

const BASE = String(SUPABASE_URL || '').replace(/\/+$/, '');
const ISSUER = `${BASE}/auth/v1`;
const JWKS_URL = `${ISSUER}/.well-known/jwks.json`;

const ASYMMETRIC_ALGS = ['RS256', 'ES256'];
const JWKS_TTL_MS = 10 * 60 * 1000;      // re-fetch keys at most every 10 min
const JWKS_MIN_INTERVAL_MS = 30 * 1000;  // ...but never hammer on unknown kid

let cache = { keys: [], fetchedAt: 0 };

function unauthorized(message) {
  const err = new Error(message);
  err.status = 401;
  return err;
}

async function fetchJwks() {
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`JWKS fetch failed with ${res.status}`);
  const body = await res.json();
  cache = { keys: Array.isArray(body.keys) ? body.keys : [], fetchedAt: Date.now() };
  return cache.keys;
}

/**
 * Resolve a signing key by `kid`. A rotated key produces an unknown kid, which
 * forces one refresh — rate limited so a bogus kid cannot be used to spam the
 * JWKS endpoint through us.
 */
async function publicKeyFor(kid) {
  const age = Date.now() - cache.fetchedAt;
  let keys = cache.keys;

  if (keys.length === 0 || age > JWKS_TTL_MS) {
    keys = await fetchJwks();
  }

  let jwk = keys.find((k) => k.kid === kid);

  if (!jwk && Date.now() - cache.fetchedAt > JWKS_MIN_INTERVAL_MS) {
    jwk = (await fetchJwks()).find((k) => k.kid === kid);
  }

  if (!jwk) throw unauthorized('Token signing key is not recognised.');

  return crypto.createPublicKey({ key: jwk, format: 'jwk' });
}

/**
 * Verify a Supabase access token and return its payload.
 * Throws a 401-tagged error on any failure.
 *
 * @param {string} token
 * @returns {Promise<object>} the verified JWT payload
 */
async function verifySupabaseToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header) throw unauthorized('Malformed token.');

  const { alg, kid } = decoded.header;
  const options = { audience: 'authenticated', issuer: ISSUER };

  try {
    if (alg === 'HS256') {
      if (!SUPABASE_JWT_SECRET) {
        // Configuration gap, not a caller problem — surface it in the log.
        console.error('[auth] Received an HS256 Supabase token but SUPABASE_JWT_SECRET is not set.');
        throw unauthorized('Token cannot be verified.');
      }
      return jwt.verify(token, SUPABASE_JWT_SECRET, { ...options, algorithms: ['HS256'] });
    }

    if (ASYMMETRIC_ALGS.includes(alg)) {
      const key = await publicKeyFor(kid);
      return jwt.verify(token, key, { ...options, algorithms: ASYMMETRIC_ALGS });
    }

    throw unauthorized(`Unsupported token algorithm: ${alg}.`);
  } catch (err) {
    if (err.status === 401) throw err;
    if (err.name === 'TokenExpiredError') throw unauthorized('Token expired.');
    throw unauthorized('Invalid token.');
  }
}

/**
 * Map a verified Supabase payload onto the shape the rest of the API expects.
 *
 * Supabase sets role to 'authenticated' for every signed-in user. That is
 * deliberately NOT passed through — it is rewritten to 'customer' so a Supabase
 * token can never satisfy requireRole('admin') or requireRole('operator').
 */
function toUser(payload) {
  return {
    id: payload.sub,
    email: payload.email || null,
    fullName: (payload.user_metadata && payload.user_metadata.full_name) || null,
    role: 'customer',
    type: 'customer',
  };
}

module.exports = { verifySupabaseToken, toUser };
