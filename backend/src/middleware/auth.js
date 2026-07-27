const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { verifySupabaseToken, toUser } = require('../services/supabaseAuth');
const { sb } = require('../config/supabase');

/**
 * Two kinds of caller reach this API:
 *   • operators and admins — tokens this API issued itself, signed with JWT_SECRET
 *   • customers — tokens issued by Supabase after Google sign-in
 *
 * They are kept on separate middleware deliberately. `authenticate` stays
 * operator/admin only: routes behind it (e.g. GET /api/fleet) are not scoped by
 * customer, so letting customer tokens through would widen them silently.
 */

function bearer(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

/**
 * Verifies an operator/admin JWT issued by this API.
 * Attaches req.user = { id, email, role, type } on success.
 */
async function authenticate(req, res, next) {
  const token = bearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET); // { id, email, role, type }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * Verifies a Supabase access token — the customer equivalent of `authenticate`.
 * Attaches req.user = { id, email, fullName, role: 'customer', type: 'customer' }.
 */
async function authenticateSupabase(req, res, next) {
  const token = bearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  try {
    req.user = toUser(await verifySupabaseToken(token));
    next();
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || 'Invalid token.' });
  }
}

/**
 * Verifies a Supabase token AND that the account is flagged as an admin.
 *
 * The admin login screen checks profiles.is_admin in the browser, which proves
 * nothing — anyone with any Supabase account could set localStorage and open the
 * dashboard. The flag is re-read here, server-side, on every admin request.
 */
async function authenticateAdmin(req, res, next) {
  const token = bearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  try {
    const user = toUser(await verifySupabaseToken(token));

    const rows = await sb('profiles').select('id,is_admin').eq('id', user.id).run();
    if (!rows || !rows.length || rows[0].is_admin !== true) {
      console.warn(`[auth] Admin access denied for ${user.email || user.id}`);
      return res.status(403).json({ error: 'Not an admin account.' });
    }

    req.user = { ...user, role: 'admin', type: 'admin' };
    next();
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || 'Invalid token.' });
  }
}

/**
 * Require a specific role.
 * Usage: requireRole('admin') or requireRole('operator')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden — insufficient permissions.' });
    }
    next();
  };
}

/**
 * Optional auth — attaches req.user if a valid token of either kind is present,
 * but never blocks. Used where guests are allowed but a signed-in user should be
 * recorded (e.g. stamping user_id onto a new query).
 */
async function optionalAuth(req, res, next) {
  const token = bearer(req);
  if (!token) return next();

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    // Not one of ours — fall through and try Supabase.
  }

  try {
    req.user = toUser(await verifySupabaseToken(token));
  } catch {
    // Invalid or expired token is not an error here; the caller stays a guest.
  }

  next();
}

module.exports = { authenticate, authenticateSupabase, authenticateAdmin, requireRole, optionalAuth };
