const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sb } = require('../config/supabase');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { success, error } = require('../utils/response');
const { sendPasswordResetEmail } = require('../services/emailService');

const resetTokens = new Map();

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    const users = await sb('operator_users')
      .select('*')
      .or ? null : null; // fallback to two queries

    // Find by username
    let rows = await sb('operator_users').select('*').eq('username', username.toLowerCase()).run();
    if (!rows || !rows.length) {
      rows = await sb('operator_users').select('*').eq('email', username.toLowerCase()).run();
    }

    if (!rows || !rows.length) return error(res, 'Invalid username or password.', 401);
    const user = rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return error(res, 'Invalid username or password.', 401);

    if (!user.is_active) return error(res, 'This account has been deactivated.', 403);
    if (user.role === 'employee' && !user.is_approved) return error(res, 'Your account is pending approval.', 403);

    const opRows = await sb('operators').select('*').eq('id', user.operator_id).run();
    if (!opRows || !opRows.length) return error(res, 'Operator account not found.', 404);
    const operator = opRows[0];

    if (operator.approval_status === 'pending') return error(res, 'Your operator registration is pending approval.', 403);
    if (operator.approval_status === 'rejected') return error(res, 'Your operator registration was not approved.', 403);

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

// POST /api/auth/refresh
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 'Refresh token required.', 400);
    let payload;
    try { payload = verifyRefreshToken(refreshToken); } catch { return error(res, 'Invalid or expired refresh token.', 401); }
    const rows = await sb('operator_users').select('*').eq('id', payload.id).run();
    if (!rows || !rows.length || !rows[0].is_active) return error(res, 'User not found or deactivated.', 401);
    const user = rows[0];
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
    resetTokens.set(token, { userId: user.id, expires: Date.now() + 60 * 60 * 1000 });
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
    const entry = resetTokens.get(token);
    if (!entry || Date.now() > entry.expires) return error(res, 'Invalid or expired reset token.', 400);
    const hash = await bcrypt.hash(newPassword, 12);
    await sb('operator_users').update({ password_hash: hash }).eq('id', entry.userId).run();
    resetTokens.delete(token);
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

module.exports = { login, logout, profile, refresh, forgotPassword, resetPassword, syncProfile };
