'use strict';

const { sb } = require('../config/supabase');
const { success, error } = require('../utils/response');
const { generateBookingRef } = require('../helpers/bookingRef');
const { ensureProfile } = require('../helpers/profile');
const { sendBookingConfirmationEmail } = require('../services/emailService');
const razorpay = require('../services/razorpayService');

// Every payment log line is prefixed and tagged with a correlation id (booking
// ref or id) so a single attempt can be followed end to end across the two
// requests. `plog.warn`/`plog.error` exist so failures that used to be silently
// swallowed now leave a trace — that is what hid the missing-column bug.
const plog = (id, msg, extra) => console.log(`[payment${id ? ' ' + id : ''}] ${msg}`, extra !== undefined ? extra : '');
plog.warn = (id, msg, extra) => console.warn(`[payment${id ? ' ' + id : ''}] ${msg}`, extra !== undefined ? extra : '');
plog.error = (id, msg, extra) => console.error(`[payment${id ? ' ' + id : ''}] ${msg}`, extra !== undefined ? extra : '');

/**
 * Payment flow, in two calls:
 *
 *   1. POST /api/payments/order   — client sends ONLY a quoteId. The price is
 *      read from the quote row, a booking is created as 'pending_payment', and
 *      a Razorpay order is opened for exactly that amount.
 *   2. POST /api/payments/verify  — the checkout callback is signature-checked,
 *      the payment is re-fetched from Razorpay to confirm it was captured for
 *      the right amount, and only then does the booking become 'confirmed'.
 *
 * No amount ever comes from the request body. A booking cannot reach
 * 'confirmed' on any other path.
 */

function notConfigured(res) {
  // Deliberately fail closed. Falling back to a free booking is the exact bug
  // this flow exists to remove.
  return error(res, 'Payments are not configured. Please contact SkyVayu to complete this booking.', 503);
}

/** Load the quote and its query, rejecting anything not bookable. */
async function loadBookable(quoteId) {
  const quoteRows = await sb('quotes').select('*').eq('id', quoteId).run();
  if (!quoteRows || !quoteRows.length) {
    const err = new Error('Quote not found.'); err.status = 404; throw err;
  }

  const quote = quoteRows[0];
  if (!['shared', 'accepted'].includes(quote.status)) {
    const err = new Error('This quote is no longer available for booking.'); err.status = 409; throw err;
  }

  let query = null;
  if (quote.query_id) {
    const queryRows = await sb('queries').select('*').eq('id', quote.query_id).run();
    query = queryRows && queryRows[0];
    if (query && query.status === 'confirmed') {
      const err = new Error('This trip has already been booked.'); err.status = 409; throw err;
    }
  }

  return { quote, query };
}

// POST /api/payments/order
async function createOrder(req, res, next) {
  try {
    if (!razorpay.isConfigured()) {
      plog.warn(null, 'order rejected — Razorpay not configured');
      return notConfigured(res);
    }

    const { quoteId, clientName, clientEmail, clientPhone } = req.body;
    if (!quoteId) return error(res, 'quoteId is required.', 400);
    if (!clientName || !clientEmail || !clientPhone) {
      return error(res, 'clientName, clientEmail and clientPhone are required.', 400);
    }

    plog(null, `order requested for quote ${quoteId} by ${clientEmail}`);

    const { quote, query } = await loadBookable(quoteId);

    // The one source of truth for what this trip costs.
    const amountInRupees = Number(quote.price);
    if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
      plog.warn(null, `order rejected — quote ${quoteId} has invalid price`, quote.price);
      return error(res, 'This quote has no valid price.', 409);
    }

    const ref = generateBookingRef(quote.operator_name);
    const route = query && query.departure && query.destination
      ? `${query.departure} → ${query.destination}`
      : null;

    // bookings.user_id has an FK to profiles.id; make sure that row exists
    // before stamping it, otherwise the insert dies on bookings_user_id_fkey.
    const userId = await ensureProfile(req.user);

    const bookingRows = await sb('bookings').insert({
      query_id: quote.query_id || null,
      quote_id: quote.id,
      ref,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      operator_name: quote.operator_name,
      aircraft: quote.aircraft_type || null,
      route,
      flight_date: (query && query.flight_date) || null,
      passengers: (query && query.passengers) || null,
      total_amount: amountInRupees,
      platform_fee: 0,
      status: 'pending_payment',
      user_id: userId,
    }).run();

    const booking = bookingRows && bookingRows[0];
    plog(ref, `booking created (id ${booking.id}) — pending_payment ₹${amountInRupees}`);

    const order = await razorpay.createOrder({
      amountInRupees,
      receipt: ref,
      notes: { bookingId: booking.id, quoteId: quote.id, ref },
    });
    plog(ref, `razorpay order created ${order.id} for ${order.amount} paise`);

    // Persist the order↔booking link so verify can reject a replayed signature.
    // If this fails (e.g. the payment_order_id column is missing) it used to be
    // swallowed silently; now it is logged loudly, because verify will break.
    try {
      await sb('bookings').update({ payment_order_id: order.id }).eq('id', booking.id).run();
    } catch (linkErr) {
      plog.error(ref, `FAILED to store payment_order_id — run migration 001_payment_columns.sql`, linkErr.message);
    }

    return success(res, {
      orderId: order.id,
      amount: order.amount,          // paise — what Razorpay will charge
      currency: order.currency,
      keyId: razorpay.KEY_ID,        // publishable key id, safe for the browser
      bookingId: booking.id,
      bookingRef: ref,
    }, 201);
  } catch (err) {
    plog.error(null, `order failed: ${err.message}`);
    next(err);
  }
}

// POST /api/payments/verify
async function verifyPayment(req, res, next) {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;
  // Correlation id for this attempt — the payment id ties the log to Razorpay.
  const tag = razorpayPaymentId || bookingId || null;

  try {
    if (!razorpay.isConfigured()) {
      plog.warn(tag, 'verify rejected — Razorpay not configured');
      return notConfigured(res);
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !bookingId) {
      plog.warn(tag, 'verify rejected — incomplete payload', {
        hasOrder: !!razorpayOrderId, hasPayment: !!razorpayPaymentId,
        hasSignature: !!razorpaySignature, hasBooking: !!bookingId,
      });
      return error(res, 'Incomplete payment confirmation.', 400);
    }

    plog(tag, `verify started — order ${razorpayOrderId}, booking ${bookingId}`);

    if (!razorpay.verifySignature({
      orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature: razorpaySignature,
    })) {
      plog.error(tag, `signature mismatch for order ${razorpayOrderId}`);
      return error(res, 'Payment could not be verified.', 400);
    }
    plog(tag, 'signature verified');

    const bookingRows = await sb('bookings').select('*').eq('id', bookingId).run();
    if (!bookingRows || !bookingRows.length) {
      plog.error(tag, `booking ${bookingId} not found`);
      return error(res, 'Booking not found.', 404);
    }
    const booking = bookingRows[0];

    // Replaying a signature against someone else's booking must not work.
    if (booking.payment_order_id && booking.payment_order_id !== razorpayOrderId) {
      plog.error(tag, `order mismatch: booking expected ${booking.payment_order_id}, got ${razorpayOrderId}`);
      return error(res, 'Payment does not belong to this booking.', 409);
    }

    if (booking.status === 'confirmed') {
      // Checkout can fire its callback more than once; stay idempotent.
      plog(tag, `booking ${booking.ref} already confirmed — idempotent return`);
      return success(res, booking);
    }

    // Signature only proves the callback came from Razorpay. Ask Razorpay what
    // actually happened before treating the money as received.
    const payment = await razorpay.fetchPayment(razorpayPaymentId);
    plog(tag, `razorpay payment status=${payment.status} amount=${payment.amount}`);

    if (!['captured', 'authorized'].includes(payment.status)) {
      plog.warn(tag, `payment not captured (${payment.status}) — not confirming`);
      return error(res, `Payment is ${payment.status}. Booking not confirmed.`, 402);
    }

    const expectedPaise = Math.round(Number(booking.total_amount) * 100);
    if (Number(payment.amount) !== expectedPaise) {
      plog.error(tag, `amount mismatch: paid ${payment.amount}, expected ${expectedPaise}`);
      return error(res, 'Paid amount does not match the booking total.', 409);
    }

    const updated = await sb('bookings').update({
      status: 'confirmed',
      payment_id: razorpayPaymentId,
      paid_at: new Date().toISOString(),
    }).eq('id', bookingId).run();

    const confirmed = (updated && updated[0]) || booking;
    plog(tag, `booking ${booking.ref} CONFIRMED (₹${booking.total_amount})`);

    if (booking.query_id) {
      sb('queries').update({ status: 'confirmed', booking_ref: booking.ref }).eq('id', booking.query_id).run()
        .catch((e) => plog.warn(tag, `could not mark query ${booking.query_id} confirmed`, e.message));
    }
    if (booking.quote_id) {
      sb('quotes').update({ status: 'confirmed' }).eq('id', booking.quote_id).run()
        .catch((e) => plog.warn(tag, `could not mark quote ${booking.quote_id} confirmed`, e.message));
    }

    sendBookingConfirmationEmail({
      clientEmail: booking.client_email,
      clientName: booking.client_name,
      ref: booking.ref,
      route: booking.route || '—',
      flightDate: booking.flight_date || '—',
      aircraft: booking.aircraft || '—',
      operatorName: booking.operator_name,
      totalAmount: booking.total_amount || 0,
    }).catch((e) => plog.warn(tag, 'confirmation email failed', e.message));

    return success(res, confirmed);
  } catch (err) {
    plog.error(tag, `verify failed: ${err.message}`);
    next(err);
  }
}

module.exports = { createOrder, verifyPayment };
