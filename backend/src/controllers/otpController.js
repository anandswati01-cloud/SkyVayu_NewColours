'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { sb } = require('../config/supabase');
const { success, error } = require('../utils/response');
const { normalisePhone, maskPhone } = require('../utils/phone');
const { sendOtpSms } = require('../services/smsService');
const { ensureProfile } = require('../helpers/profile');
const {
  JWT_SECRET,
  IS_PRODUCTION,
  OTP_TTL_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_MAX_PER_PHONE_PER_DAY,
  OTP_MAX_PER_IP_PER_HOUR,
  PHONE_TOKEN_TTL_DAYS,
} = require('../config/env');

const PHONE_TOKEN_PURPOSE = 'phone_verify';

const hash = (code) => crypto.createHash('sha256').update(code).digest('hex');

/**
 * Six digits, from the CSPRNG. Math.random() is seeded predictably enough that
 * a determined caller could narrow the search space, and this code is the only
 * thing standing between a stranger and someone else's phone number.
 */
function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Constant-time compare, so a wrong code cannot be narrowed by response time. */
function codeMatches(candidate, storedHash) {
  const a = Buffer.from(hash(candidate), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Signed proof that this browser completed an OTP for this number. It travels
 * to /api/queries, where the phone is read out of the token rather than the
 * request body — the whole point of verifying is that the number cannot then be
 * swapped for a fake one on submit.
 */
function issuePhoneToken(phone) {
  return jwt.sign(
    { phone, purpose: PHONE_TOKEN_PURPOSE },
    JWT_SECRET,
    { expiresIn: `${PHONE_TOKEN_TTL_DAYS}d` },
  );
}

/**
 * @returns {string|null} the verified E.164 number, or null if the token is
 * missing, malformed, expired, or was issued for something else.
 */
function readPhoneToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.purpose !== PHONE_TOKEN_PURPOSE || !payload.phone) return null;
    return payload.phone;
  } catch {
    return null;
  }
}

// POST /api/otp/send
async function sendOtp(req, res, next) {
  try {
    const phone = normalisePhone(req.body.phone);
    if (!phone) {
      return error(res, 'Enter a valid mobile number.', 400);
    }

    const now = Date.now();
    const ip = req.ip || null;

    // ── Resend cooldown ─────────────────────────────────────────────────────
    // Checked before the daily cap so a customer tapping "Resend" early is told
    // to wait rather than being charged one of their ten sends.
    const recent = await sb('phone_otps')
      .select('created_at')
      .eq('phone', phone)
      .order('created_at', 'desc')
      .limit(1)
      .run();

    if (recent && recent.length) {
      const elapsed = (now - new Date(recent[0].created_at).getTime()) / 1000;
      if (elapsed < OTP_RESEND_COOLDOWN_SECONDS) {
        return error(
          res,
          `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsed)}s before requesting another code.`,
          429,
        );
      }
    }

    // ── Daily cap per number ────────────────────────────────────────────────
    // Every send costs money and lands on somebody's handset. Without this, one
    // script can bill the account dry and harass a stranger at the same time.
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const todays = await sb('phone_otps')
      .select('id')
      .eq('phone', phone)
      .gte('created_at', dayAgo)
      .run();

    if (todays && todays.length >= OTP_MAX_PER_PHONE_PER_DAY) {
      return error(res, 'Too many codes requested for this number today. Please try again tomorrow.', 429);
    }

    // ── Hourly cap per origin ───────────────────────────────────────────────
    // The per-number cap alone does not stop one host walking a list of
    // thousands of numbers, one send each.
    if (ip) {
      const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
      const fromIp = await sb('phone_otps')
        .select('id')
        .eq('request_ip', ip)
        .gte('created_at', hourAgo)
        .run();

      if (fromIp && fromIp.length >= OTP_MAX_PER_IP_PER_HOUR) {
        return error(res, 'Too many verification attempts. Please try again later.', 429);
      }
    }

    const code = generateCode();
    const expiresAt = new Date(now + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    // Sent first, recorded second. If delivery fails there is no row, so the
    // customer's cooldown and daily cap are not spent on a message that never
    // arrived.
    await sendOtpSms(phone, code);

    await sb('phone_otps').insert({
      phone,
      code_hash: hash(code),
      expires_at: expiresAt,
      request_ip: ip,
    }).run();

    console.log(`[otp] Code sent to ${maskPhone(phone)}`);

    return success(res, {
      phone: maskPhone(phone),
      expiresInSeconds: OTP_TTL_MINUTES * 60,
      resendInSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    });
  } catch (err) {
    // A provider outage is not the customer's fault and not a 500 in our code.
    if (err.status === 502 || err.status === 503) {
      console.error('[otp] SMS delivery failed:', err.message);
      return error(res, 'Could not send the code right now. Please try again in a moment.', err.status);
    }
    next(err);
  }
}

// POST /api/otp/verify
async function verifyOtp(req, res, next) {
  try {
    const phone = normalisePhone(req.body.phone);
    const code = String(req.body.code || '').trim();

    if (!phone) return error(res, 'Enter a valid mobile number.', 400);
    if (!/^\d{6}$/.test(code)) return error(res, 'Enter the 6-digit code.', 400);

    const rows = await sb('phone_otps')
      .select('id,code_hash,expires_at,attempts,consumed_at')
      .eq('phone', phone)
      .order('created_at', 'desc')
      .limit(1)
      .run();

    const otp = rows && rows[0];

    // One message for "never requested", "already used" and "expired" on
    // purpose: distinguishing them tells a caller which numbers are in play.
    if (!otp || otp.consumed_at || new Date(otp.expires_at).getTime() < Date.now()) {
      return error(res, 'That code has expired. Request a new one.', 400);
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      return error(res, 'Too many incorrect attempts. Request a new code.', 429);
    }

    if (!codeMatches(code, otp.code_hash)) {
      const attempts = otp.attempts + 1;
      await sb('phone_otps').update({ attempts }).eq('id', otp.id).run();
      const left = Math.max(0, OTP_MAX_ATTEMPTS - attempts);
      return error(
        res,
        left > 0
          ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
          : 'Too many incorrect attempts. Request a new code.',
        400,
      );
    }

    // Burn it. A code that stays valid after use is a code that can be replayed
    // from a shared device or a leaked log.
    await sb('phone_otps').update({ consumed_at: new Date().toISOString() }).eq('id', otp.id).run();

    // If this browser is signed in, the number belongs on the account too —
    // that is what the membership tier will read later. Failure here must not
    // fail the verification: the customer proved the number either way.
    const userId = await ensureProfile(req.user).catch(() => null);
    if (userId) {
      sb('profiles')
        .update({ phone, phone_verified_at: new Date().toISOString() })
        .eq('id', userId)
        .run()
        .catch((err) => console.error('[otp] Could not stamp profile phone:', err.message));
    }

    console.log(`[otp] Verified ${maskPhone(phone)}`);

    return success(res, {
      phone,
      phoneToken: issuePhoneToken(phone),
      expiresInDays: PHONE_TOKEN_TTL_DAYS,
    });
  } catch (err) { next(err); }
}

// GET /api/otp/status — is the token this browser is holding still good?
//
// Lets the frontend skip the whole modal for a returning customer without
// having to trust, or parse, the token on its own.
function tokenStatus(req, res) {
  const phone = readPhoneToken(req.query.token);
  return success(res, {
    valid: !!phone,
    phone: phone || null,
    ...(IS_PRODUCTION ? {} : { provider: 'see SMS_PROVIDER' }),
  });
}

module.exports = { sendOtp, verifyOtp, tokenStatus, readPhoneToken };
