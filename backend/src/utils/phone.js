'use strict';

/**
 * Phone normalisation to E.164.
 *
 * Everything downstream — the OTP lookup, the resend cooldown, the daily cap —
 * keys on the phone string. If "9876543210" and "+91 98765 43210" are stored as
 * two different values then the caps count two different numbers and the
 * cooldown never applies, so normalising is a correctness requirement, not
 * cosmetics.
 *
 * India is the default country because that is where the charter fleet flies;
 * an explicit + prefix is always honoured, so international numbers still work.
 */

const DEFAULT_COUNTRY_CODE = '91';

/**
 * @param {string} input
 * @returns {string|null} E.164 (+919876543210) or null when it cannot be read.
 */
function normalisePhone(input) {
  if (typeof input !== 'string') return null;

  const trimmed = input.trim();
  const hadPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) return null;

  // Explicit international format — trust it, only sanity-check the length.
  if (hadPlus) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }

  // 0-prefixed domestic trunk form: 09876543210
  const local = digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;

  // Already carries the country code: 919876543210
  if (local.length === 12 && local.startsWith(DEFAULT_COUNTRY_CODE)) {
    return `+${local}`;
  }

  // Bare Indian mobile. Indian mobile numbers start 6–9; rejecting the rest
  // catches landlines and typos before an SMS is paid for.
  if (local.length === 10 && /^[6-9]/.test(local)) {
    return `+${DEFAULT_COUNTRY_CODE}${local}`;
  }

  return null;
}

/** Mask for logs and for echoing back to the UI: +9198*****210 */
function maskPhone(e164) {
  if (!e164 || e164.length < 6) return '';
  return `${e164.slice(0, 5)}${'*'.repeat(Math.max(0, e164.length - 8))}${e164.slice(-3)}`;
}

module.exports = { normalisePhone, maskPhone };
