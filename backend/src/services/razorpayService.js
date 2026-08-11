'use strict';

/**
 * Razorpay integration over plain REST — no SDK dependency.
 *
 * The rule this module exists to enforce: the browser never states a price.
 * Amounts are read from the quote row in our own database, the order is created
 * server-side, and the payment is re-fetched from Razorpay after checkout so the
 * captured amount is checked against what we asked for. A tampered client can
 * change what it *displays*, never what it *pays*.
 */

const crypto = require('crypto');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET } = require('../config/env');

const API = 'https://api.razorpay.com/v1';

/** Payments are only live once both credentials are present. */
function isConfigured() {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

/**
 * The webhook secret is separate from the key secret — it is set per-webhook in
 * the Razorpay dashboard. Without it we cannot tell a real delivery from a
 * forged POST, so the endpoint refuses to act rather than trusting the caller.
 */
function isWebhookConfigured() {
  return Boolean(RAZORPAY_WEBHOOK_SECRET);
}

function authHeader() {
  const token = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = (data.error && data.error.description) || `Razorpay returned ${res.status}`;
    const err = new Error(`Payment gateway error: ${detail}`);
    // 4xx from Razorpay is usually our own misconfiguration, not the customer's
    // fault — surface it as a server-side failure.
    err.status = res.status === 400 ? 400 : 502;
    throw err;
  }

  return data;
}

/**
 * @param {{ amountInRupees: number, receipt: string, notes?: object }} params
 * @returns {Promise<{id: string, amount: number, currency: string}>}
 */
async function createOrder({ amountInRupees, receipt, notes }) {
  // Razorpay works in the smallest currency unit. Rounding here rather than
  // truncating avoids a 1-paise shortfall failing the later amount check.
  const amount = Math.round(Number(amountInRupees) * 100);

  if (!Number.isFinite(amount) || amount <= 0) {
    const err = new Error('Invalid payable amount.');
    err.status = 400;
    throw err;
  }

  return call('/orders', {
    method: 'POST',
    body: { amount, currency: 'INR', receipt: String(receipt).slice(0, 40), notes: notes || {} },
  });
}

async function fetchPayment(paymentId) {
  return call(`/payments/${encodeURIComponent(paymentId)}`);
}

/**
 * Every payment attempted against an order, successful or not.
 *
 * Used to reconcile a booking that never got its callback: the order id is
 * stored on the booking, so Razorpay can be asked directly whether the money
 * actually arrived instead of guessing from a missing callback.
 *
 * @returns {Promise<{count: number, items: Array<object>}>}
 */
async function fetchOrderPayments(orderId) {
  return call(`/orders/${encodeURIComponent(orderId)}/payments`);
}

/**
 * Refund a captured payment, in full or in part.
 *
 * `speed: 'normal'` puts the refund through the regular settlement cycle
 * (5–7 working days) rather than paying Razorpay's instant-refund fee. Pass
 * 'optimum' to let Razorpay use instant rails where the bank supports it.
 *
 * @param {string} paymentId
 * @param {{ amountInRupees?: number, notes?: object, speed?: 'normal'|'optimum', receipt?: string }} params
 * @returns {Promise<{id: string, amount: number, status: string}>}
 */
async function createRefund(paymentId, { amountInRupees, notes, speed = 'normal', receipt } = {}) {
  const body = { speed, notes: notes || {} };

  // Omitting the amount refunds the whole payment — that is Razorpay's rule,
  // not a default of ours, so only send it when a partial refund was asked for.
  if (amountInRupees !== undefined && amountInRupees !== null) {
    const amount = Math.round(Number(amountInRupees) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      const err = new Error('Invalid refund amount.');
      err.status = 400;
      throw err;
    }
    body.amount = amount;
  }

  if (receipt) body.receipt = String(receipt).slice(0, 40);

  return call(`/payments/${encodeURIComponent(paymentId)}/refund`, { method: 'POST', body });
}

/**
 * Verify the checkout callback signature: HMAC-SHA256(order_id|payment_id).
 * Compared in constant time so the check cannot be probed byte by byte.
 */
function verifySignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) return false;

  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Verify a webhook delivery: HMAC-SHA256 of the exact request body.
 *
 * `rawBody` must be the bytes Razorpay sent, not a re-serialised object. Key
 * order and whitespace both change the hash, and JSON.stringify of a parsed
 * body reliably produces neither — which is why the webhook route is mounted
 * ahead of the JSON body parser.
 *
 * @param {Buffer|string} rawBody
 * @param {string} signature  value of the x-razorpay-signature header
 */
function verifyWebhookSignature(rawBody, signature) {
  if (!RAZORPAY_WEBHOOK_SECRET || !rawBody || !signature) return false;

  const expected = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8'))
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = {
  isConfigured,
  isWebhookConfigured,
  createOrder,
  fetchPayment,
  fetchOrderPayments,
  createRefund,
  verifySignature,
  verifyWebhookSignature,
  KEY_ID: RAZORPAY_KEY_ID,
};
