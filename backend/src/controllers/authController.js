const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sb } = require('../config/supabase');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { success, error } = require('../utils/response');
const { sendPasswordResetEmail } = require('../services/emailService');

/**
 * Every condition that must still hold for an account to be usable.
 *
 * Login checked all of these; refresh checked only `is_active`. That gap meant
 * revoking an operator's approval did not actually lock anyone out — an already
 * signed-in user could keep minting fresh access tokens off their 30-day
 * refresh token for a month. Both paths now run the same check.
 *
 * @returns {Promise<{status: number, message: string}|null>} null when usable
 */
async function checkAccountUsable(user) {
  if (!user.is_active) return { status: 403, message: 'This account has been deactivated.' };
  if (user.role === 'employee' && !user.is_approved) return { status: 403, message: 'Your account is pending approval.' };

  // An account with no operator_id reached the operators lookup as
  // `id=eq.null`, which Postgres rejects — leaking a raw driver error to the
  // caller as a 400. There is one such row today (the super_admin account),
  // which cannot sign in either way; this just says so honestly.
  if (!user.operator_id) {
    return { status: 403, message: 'This account is not linked to an operator.' };
  }

  const opRows = await sb('operators').select('*').eq('id', user.operator_id).run();
  if (!opRows || !opRows.length) return { status: 404, message: 'Operator account not found.' };

  const status = opRows[0].approval_status;
  if (status === 'pending') return { status: 403, message: 'Your operator registration is pending approval.' };
  if (status === 'rejected') return { status: 403, message: 'Your operator registration was not approved.' };

  return null;
}

/** Reset tokens are stored hashed; the raw value only ever exists in the email. */
function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    // Find by username, then by email.
    let rows = await sb('operator_users').select('*').eq('username', username.toLowerCase()).run();
    if (!rows || !rows.length) {
      rows = await sb('operator_users').select('*').eq('email', username.toLowerCase()).run();
    }

    if (!rows || !rows.length) return error(res, 'Invalid username or password.', 401);
    const user = rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return error(res, 'Invalid username or password.', 401);

    const gate = await checkAccountUsable(user);
    if (gate) return error(res, gate.message, gate.status);

    const opRows = await sb('operators').select('*').eq('id', user.operator_id).run();
    const operator = opRows[0];

    // Update last_login (fire and forget)
    sb('operator_users').update({ last_login: new Date().toISOString() }).eq('id', user.id).run().catch(() => {});

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      type: 'operator',
      operatorId: user.operator_id,
    };

    return success(res, {
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken({ id: user.id, type: 'operator' }),
      user: { id: user.id, username: user.username, fullName: user.full_name, email: user.email, role: user.role },
      operator: { id: operator.id, companyName: operator.company_name, aircraftCategory: operator.aircraft_category, approvalStatus: operator.approval_status, aopExpiryDate: operator.aop_expiry_date },
    });
  } catch (err) { next(err); }
}

// POST /api/auth/logout
function logout(req, res) {
  return success(res, { message: 'Logged out successfully.' });
}

// GET /api/auth/profile
async function profile(req, res, next) {
  try {
    const { id, type } = req.user;
    if (type === 'operator') {
      const rows = await sb('operator_users').select('*').eq('id', id).run();
      if (!rows || !rows.length) return error(res, 'User not found.', 404);
      const user = rows[0];
      const opRows = await sb('operators').select('*').eq('id', user.operator_id).run();
      const operator = opRows && opRows[0];
      return success(res, {
        id: user.id, username: user.username, fullName: user.full_name,
        email: user.email, role: user.role,
        operator: operator ? { id: operator.id, companyName: operator.company_name, approvalStatus: operator.approval_status } : null,
      });
    }
    const rows = await sb('profiles').select('*').eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Profile not found.', 404);
    return success(res, rows[0]);
  } catch (err) { next(err); }
}

/**
 * Fields a customer is allowed to change about themselves.
 *
 * Deliberately a whitelist, and deliberately missing two columns that live on
 * the same row: `kyc_verified`, which only the charter desk may set after
 * looking at the documents, and `is_admin`, which grants the admin dashboard.
 * The profile page used to write to this table straight from the browser, where
 * both were one request away.
 */
const PROFILE_UPDATABLE = [
  'phone',
  'date_of_birth',
  'nationality',
  'passport_number',
  'aadhaar_number',
  'passport_uploaded',
  'aadhaar_uploaded',
];

// PATCH /api/auth/profile — a customer editing their own profile and KYC details
async function updateProfile(req, res, next) {
  try {
    const { id, type } = req.user;
    if (type === 'operator') {
      return error(res, 'Operator accounts are managed from the operator portal.', 403);
    }

    const data = {};
    for (const field of PROFILE_UPDATABLE) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }

    if (Object.keys(data).length === 0) {
      return error(res, `Nothing to update. Allowed fields: ${PROFILE_UPDATABLE.join(', ')}.`, 400);
    }

    // The row is keyed by the id on the verified token, never one from the body,
    // so this can only ever touch the caller's own profile.
    data.updated_at = new Date().toISOString();
    const rows = await sb('profiles').update(data).eq('id', id).run();

    if (!rows || !rows.length) return error(res, 'Profile not found.', 404);
    return success(res, rows[0]);
  } catch (err) { next(err); }
}

// POST /api/auth/refresh
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 'Refresh token required.', 400);
    let payload;
    try { payload = verifyRefreshToken(refreshToken); } catch { return error(res, 'Invalid or expired refresh token.', 401); }

    const rows = await sb('operator_users').select('*').eq('id', payload.id).run();
    if (!rows || !rows.length) return error(res, 'User not found or deactivated.', 401);
    const user = rows[0];

    // Re-run every condition login enforces. A refresh token outlives an access
    // token by weeks, so this is the only point at which a revoked approval or
    // a deactivated account actually takes effect.
    const gate = await checkAccountUsable(user);
    if (gate) return error(res, gate.message, gate.status);

    return success(res, { accessToken: signAccessToken({ id: user.id, email: user.email, role: user.role, type: 'operator', operatorId: user.operator_id }) });
  } catch (err) { next(err); }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return error(res, 'Email is required.', 400);
    const rows = await sb('operator_users').select('id,email').eq('email', email.toLowerCase()).run();
    if (!rows || !rows.length) return success(res, { message: 'If an account exists, a reset link has been sent.' });
    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');

    // Stored before the email goes out — a token the user has but we do not is
    // an unredeemable link. Deliberately allowed to throw: pretending a reset
    // was sent when it cannot be redeemed is worse than a visible failure.
    await sb('operator_users').update({
      reset_token_hash: hashResetToken(token),
      reset_token_expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }).eq('id', user.id).run();

    await sendPasswordResetEmail({ email: user.email, resetToken: token });
    return success(res, { message: 'If an account exists, a reset link has been sent.' });
  } catch (err) { next(err); }
}

// POST /api/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return error(res, 'Token and new password are required.', 400);
    if (newPassword.length < 8) return error(res, 'Password must be at least 8 characters.', 400);
    const rows = await sb('operator_users')
      .select('id,reset_token_expires')
      .eq('reset_token_hash', hashResetToken(token))
      .run();

    // Same message whether the token is unknown, already used or expired — the
    // distinction is only useful to someone guessing tokens.
    if (!rows || !rows.length) return error(res, 'Invalid or expired reset token.', 400);

    const user = rows[0];
    if (!user.reset_token_expires || new Date(user.reset_token_expires).getTime() < Date.now()) {
      return error(res, 'Invalid or expired reset token.', 400);
    }

    const hash = await bcrypt.hash(newPassword, 12);

    // Password and token are cleared together, so the link is single-use.
    await sb('operator_users').update({
      password_hash: hash,
      reset_token_hash: null,
      reset_token_expires: null,
    }).eq('id', user.id).run();

    return success(res, { message: 'Password reset successfully.' });
  } catch (err) { next(err); }
}

// POST /api/auth/sync-profile
async function syncProfile(req, res, next) {
  try {
    // Identity comes from the verified Supabase token, never from the body.
    // This runs with the service role key, so trusting a body-supplied id would
    // let anyone overwrite any user's profile row.
    const { id, email } = req.user;
    const fullName = req.body.fullName || req.user.fullName || null;

    if (!id) return error(res, 'Token is missing a subject.', 401);

    const rows = await sb('profiles').upsert({ id, full_name: fullName, email }, { onConflict: 'id' }).run();
    return success(res, rows && rows[0] ? rows[0] : { id, fullName, email });
  } catch (err) { next(err); }
}

module.exports = { login, logout, profile, updateProfile, refresh, forgotPassword, resetPassword, syncProfile };
