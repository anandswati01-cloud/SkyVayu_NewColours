'use strict';

const { sb } = require('../config/supabase');
const { success, error } = require('../utils/response');
const { generateBookingRef } = require('../helpers/bookingRef');
const { ensureProfile } = require('../helpers/profile');
const { sendBookingConfirmationEmail, sendBookingAlertEmail, sendRefundEmail } = require('../services/emailService');
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
 *
 * Step 2 depends on the customer's browser still being alive. It often is not —
 * the tab gets closed, the phone locks, the network drops on the way back from
 * the bank's 3-D Secure page. POST /api/payments/webhook is the second,
 * server-to-server route to the same outcome, and POST /api/payments/reconcile
 * is the manual one for anything that still slips through. All three funnel
 * into confirmBooking(), so a booking looks identical however it got confirmed.
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

/**
 * Write columns that only exist once migration 002 has been applied.
 *
 * These are all reporting fields — how the customer paid, why a payment failed,
 * what was refunded. None of them decide whether a booking is paid for, so none
 * of them may be allowed to fail the write that does. Sending them in the same
 * UPDATE as `status` means an unapplied migration takes down confirmation
 * entirely: PostgREST rejects the whole statement over one unknown column.
 *
 * Best-effort by design. Logs loudly, never throws.
 *
 * @returns {Promise<boolean>} whether the columns were actually written
 */
async function writeOptionalColumns(bookingId, data, tag) {
  try {
    await sb('bookings').update(data).eq('id', bookingId).run();
    return true;
  } catch (err) {
    plog.error(tag, `could not write ${Object.keys(data).join(', ')} — run migration 002_payment_webhooks_and_refunds.sql`, err.message);
    return false;
  }
}

/**
 * Promote a booking to 'confirmed' once the money is known to be real.
 *
 * Called from three places that can race each other — the browser callback, the
 * webhook, and manual reconciliation. The UPDATE is therefore conditional on the
 * row still being 'pending_payment': whichever caller gets there first flips it
 * and gets the row back, the losers get an empty result and return null. That
 * single condition is what stops two confirmation emails going out for one
 * booking, so it must stay on the update rather than move to a read-then-write.
 *
 * @param {object} booking  the booking row as currently stored
 * @param {object} payment  the payment entity as Razorpay reports it
 * @param {{ tag?: string, source: string }} ctx
 * @returns {Promise<object|null>} the confirmed row, or null if already confirmed
 */
async function confirmBooking(booking, payment, { tag, source }) {
  // Only migration-001 columns here. This is the statement that decides whether
  // the customer has a booking, so nothing optional rides along with it.
  const updated = await sb('bookings').update({
    status: 'confirmed',
    payment_id: payment.id,
    paid_at: new Date().toISOString(),
  })
    .eq('id', booking.id)
    .eq('status', 'pending_payment')
    .run();

  if (!updated || !updated.length) {
    plog(tag, `booking ${booking.ref} was already confirmed — ${source} is a no-op`);
    return null;
  }

  const confirmed = updated[0];
  plog(tag, `booking ${booking.ref} CONFIRMED via ${source} (₹${booking.total_amount})`);

  // Reporting only, and from migration 002 — written separately so it cannot
  // take the confirmation down with it.
  if (payment.method && await writeOptionalColumns(booking.id, { payment_method: payment.method }, tag)) {
    confirmed.payment_method = payment.method;
  }

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

  // The charter desk needs to know too. Fire-and-forget like the customer's
  // copy — a booking is confirmed whether or not the notification lands.
  sendBookingAlertEmail({
    ref: booking.ref,
    clientName: booking.client_name,
    clientEmail: booking.client_email,
    clientPhone: booking.client_phone,
    route: booking.route || '—',
    flightDate: booking.flight_date || '—',
    aircraft: booking.aircraft || '—',
    operatorName: booking.operator_name,
    totalAmount: booking.total_amount || 0,
    paymentId: payment.id,
    paymentMethod: payment.method || null,
    source,
  }).catch((e) => plog.warn(tag, 'admin alert email failed', e.message));

  return confirmed;
}

/** Reject a payment that Razorpay says was not actually captured. */
function isCaptured(payment) {
  return ['captured', 'authorized'].includes(payment && payment.status);
}

/** The amount we asked for, in paise, so it can be compared to what was paid. */
function expectedPaise(booking) {
  return Math.round(Number(booking.total_amount) * 100);
}

// -----------------------------------------------------------------------------
// POST /api/payments/order
// -----------------------------------------------------------------------------
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

    // Persist the order↔booking link. This is not bookkeeping: the webhook has
    // only the order id to work from, and verify uses it to reject a replayed
    // signature. If it fails, both of those break — hence the loud log rather
    // than the silent catch this used to have.
    try {
      await sb('bookings').update({ payment_order_id: order.id }).eq('id', booking.id).run();
    } catch (linkErr) {
      plog.error(ref, `FAILED to store payment_order_id — run migration 001_payment_columns.sql`, linkErr.message);
    }

    // Which operator may later see this booking. Taken from the quote, never the
    // request — same rule as the price. Written after the insert rather than in
    // it, and best-effort, so an unapplied migration 003 cannot stop anyone
    // paying; without it the booking is simply admin-only to view.
    if (quote.operator_id) {
      await writeOptionalColumns(booking.id, { operator_id: quote.operator_id }, ref);
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

// -----------------------------------------------------------------------------
// POST /api/payments/verify
// -----------------------------------------------------------------------------
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
      // Checkout can fire its callback more than once, and the webhook may have
      // got here first. Either way the customer should see success.
      plog(tag, `booking ${booking.ref} already confirmed — idempotent return`);
      return success(res, booking);
    }

    // Signature only proves the callback came from Razorpay. Ask Razorpay what
    // actually happened before treating the money as received.
    const payment = await razorpay.fetchPayment(razorpayPaymentId);
    plog(tag, `razorpay payment status=${payment.status} amount=${payment.amount}`);

    if (!isCaptured(payment)) {
      plog.warn(tag, `payment not captured (${payment.status}) — not confirming`);
      return error(res, `Payment is ${payment.status}. Booking not confirmed.`, 402);
    }

    if (Number(payment.amount) !== expectedPaise(booking)) {
      plog.error(tag, `amount mismatch: paid ${payment.amount}, expected ${expectedPaise(booking)}`);
      return error(res, 'Paid amount does not match the booking total.', 409);
    }

    const confirmed = await confirmBooking(booking, payment, { tag, source: 'checkout callback' });

    // A null here means the webhook confirmed it in the last few milliseconds.
    // Re-read so the customer still receives the real, confirmed row.
    if (!confirmed) {
      const fresh = await sb('bookings').select('*').eq('id', bookingId).run();
      return success(res, (fresh && fresh[0]) || booking);
    }

    return success(res, confirmed);
  } catch (err) {
    plog.error(tag, `verify failed: ${err.message}`);
    next(err);
  }
}

// -----------------------------------------------------------------------------
// POST /api/payments/webhook
// -----------------------------------------------------------------------------

/**
 * Claim an event id in the ledger so a redelivery is a no-op.
 *
 * Razorpay retries a webhook until it gets a 2xx, and can deliver the same
 * event more than once even after success. The primary key on payment_events.id
 * is what makes the second attempt lose.
 *
 * If the ledger itself is unreachable — most likely migration 002 has not been
 * applied — this returns 'unavailable' rather than throwing. Processing is safe
 * to continue without it because confirmBooking is independently idempotent;
 * refusing every webhook over a missing audit table would be the worse failure.
 *
 * @returns {Promise<'claimed'|'duplicate'|'unavailable'>}
 */
async function claimEvent({ eventId, event, paymentId, orderId, payload }) {
  try {
    await sb('payment_events').insert({
      id: eventId,
      event,
      payment_id: paymentId || null,
      order_id: orderId || null,
      payload,
    }).run();
    return 'claimed';
  } catch (err) {
    // 23505 / 409 — the row is already there, so this is a redelivery.
    if (err.supabaseCode === '23505' || err.status === 409) return 'duplicate';
    plog.error(eventId, `payment_events unavailable — run migration 002. Continuing without replay protection.`, err.message);
    return 'unavailable';
  }
}

/** Record the outcome of an event. Best-effort — never fails the delivery. */
async function markEvent(eventId, status, extra = {}) {
  try {
    await sb('payment_events').update({ status, ...extra }).eq('id', eventId).run();
  } catch (err) {
    plog.warn(eventId, `could not update payment_events status to ${status}`, err.message);
  }
}

/** Find the booking an event refers to, by order id first, then by the note. */
async function bookingForEvent(entity) {
  const orderId = entity && entity.order_id;

  if (orderId) {
    const rows = await sb('bookings').select('*').eq('payment_order_id', orderId).run();
    if (rows && rows.length) return rows[0];
  }

  // Fallback for a booking whose payment_order_id never got written (migration
  // 001 missing at the time the order was created). The note is set by us in
  // createOrder, so it is as trustworthy as the order id.
  const noteId = entity && entity.notes && entity.notes.bookingId;
  if (noteId) {
    const rows = await sb('bookings').select('*').eq('id', noteId).run();
    if (rows && rows.length) return rows[0];
  }

  return null;
}

async function handlePaymentCaptured(payment, tag) {
  const booking = await bookingForEvent(payment);
  if (!booking) {
    plog.error(tag, `payment.captured for order ${payment.order_id} matched no booking`);
    return { status: 'failed', error: 'no matching booking', bookingId: null };
  }

  if (booking.status === 'confirmed') {
    plog(tag, `booking ${booking.ref} already confirmed`);
    return { status: 'ignored', bookingId: booking.id };
  }

  // The webhook is authenticated by its signature, but the amount still has to
  // match what we asked for — a captured payment against the right order for
  // the wrong amount is not a confirmed booking.
  if (Number(payment.amount) !== expectedPaise(booking)) {
    plog.error(tag, `amount mismatch on webhook: paid ${payment.amount}, expected ${expectedPaise(booking)}`);
    return { status: 'failed', error: 'amount mismatch', bookingId: booking.id };
  }

  await confirmBooking(booking, payment, { tag, source: 'webhook' });
  return { status: 'processed', bookingId: booking.id };
}

async function handlePaymentFailed(payment, tag) {
  const booking = await bookingForEvent(payment);
  if (!booking) return { status: 'ignored', error: 'no matching booking', bookingId: null };

  // Never overwrite a confirmed booking: the customer may have failed once and
  // succeeded on a retry, and the two events can arrive out of order.
  if (booking.status !== 'pending_payment') {
    return { status: 'ignored', bookingId: booking.id };
  }

  const reason = (payment.error_description || payment.error_reason || 'unknown').slice(0, 300);

  await sb('bookings').update({ status: 'payment_failed' })
    .eq('id', booking.id).eq('status', 'pending_payment').run();
  await writeOptionalColumns(booking.id, { payment_failed_reason: reason }, tag);

  plog(tag, `booking ${booking.ref} marked payment_failed — ${reason}`);
  return { status: 'processed', bookingId: booking.id };
}

async function handleRefundProcessed(refund, tag) {
  const rows = await sb('bookings').select('*').eq('payment_id', refund.payment_id).run();
  const booking = rows && rows[0];
  if (!booking) {
    plog.warn(tag, `refund ${refund.id} for payment ${refund.payment_id} matched no booking`);
    return { status: 'ignored', error: 'no matching booking', bookingId: null };
  }

  // Razorpay reports the total refunded against the payment, so this is
  // authoritative even when the refund was issued from their dashboard rather
  // than through our admin endpoint.
  const refundedRupees = Number(refund.amount) / 100;
  const total = Number(booking.total_amount || 0);
  const fullyRefunded = refundedRupees >= total;

  await sb('bookings').update({ status: fullyRefunded ? 'refunded' : 'partially_refunded' })
    .eq('id', booking.id).run();
  await writeOptionalColumns(booking.id, {
    refund_id: refund.id,
    refund_amount: refundedRupees,
    refunded_at: new Date().toISOString(),
  }, tag);

  plog(tag, `booking ${booking.ref} ${fullyRefunded ? 'refunded' : 'partially refunded'} ₹${refundedRupees}`);
  return { status: 'processed', bookingId: booking.id };
}

/**
 * Razorpay webhook receiver.
 *
 * Mounted in app.js ahead of express.json() with a raw body parser, because the
 * signature is an HMAC over the exact bytes sent. A parsed-and-re-stringified
 * body has different bytes and would never verify.
 *
 * Response codes matter here — Razorpay retries anything that is not 2xx:
 *   400  bad signature or unparseable body   — retrying will not help
 *   200  understood, including events we deliberately ignore
 *   500  we understood it but our side broke — please retry
 */
async function webhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const eventId = req.headers['x-razorpay-event-id'] || null;
  const raw = Buffer.isBuffer(req.body) ? req.body : null;

  if (!razorpay.isWebhookConfigured()) {
    plog.error(eventId, 'webhook received but RAZORPAY_WEBHOOK_SECRET is not set — cannot verify, ignoring');
    return res.status(503).json({ error: 'Webhook not configured.' });
  }

  if (!raw || !razorpay.verifyWebhookSignature(raw, signature)) {
    plog.error(eventId, 'webhook signature verification FAILED — ignoring');
    return res.status(400).json({ error: 'Invalid signature.' });
  }

  let body;
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch {
    plog.error(eventId, 'webhook body is not valid JSON');
    return res.status(400).json({ error: 'Invalid payload.' });
  }

  const event = body.event || 'unknown';
  const entities = body.payload || {};
  const payment = entities.payment && entities.payment.entity;
  const refund = entities.refund && entities.refund.entity;
  const entity = payment || refund || {};

  // Razorpay always sends the header, but a manual replay through curl may not.
  // Falling back to the payment id keeps the ledger key stable per event type.
  const ledgerId = eventId || `${event}:${entity.id || 'unknown'}`;
  const tag = entity.id || ledgerId;

  plog(tag, `webhook received: ${event}`);

  const claim = await claimEvent({
    eventId: ledgerId,
    event,
    paymentId: payment ? payment.id : (refund ? refund.payment_id : null),
    orderId: entity.order_id || null,
    payload: body,
  });

  if (claim === 'duplicate') {
    plog(tag, `duplicate delivery of ${event} — already handled`);
    return res.status(200).json({ received: true, duplicate: true });
  }

  try {
    let result;

    // A handled event with its entity missing is malformed, not transient. It is
    // recorded and acknowledged rather than retried — a 500 here would have
    // Razorpay redelivering the same broken payload indefinitely.
    const missingEntity = (kind) => {
      plog.error(tag, `${event} arrived without a ${kind} entity — acknowledged, not retried`);
      return { status: 'failed', error: `missing ${kind} entity` };
    };

    switch (event) {
      case 'payment.captured':
        result = payment ? await handlePaymentCaptured(payment, tag) : missingEntity('payment');
        break;

      case 'payment.failed':
        result = payment ? await handlePaymentFailed(payment, tag) : missingEntity('payment');
        break;

      case 'refund.processed':
      case 'refund.created':
        result = refund ? await handleRefundProcessed(refund, tag) : missingEntity('refund');
        break;

      default:
        // order.paid, payment.authorized and the rest are covered by the events
        // above or are of no interest. Acknowledge so Razorpay stops retrying.
        plog(tag, `event ${event} not handled — acknowledged`);
        result = { status: 'ignored' };
    }

    if (claim === 'claimed') {
      await markEvent(ledgerId, result.status, {
        booking_id: result.bookingId || null,
        error: result.error || null,
      });
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    plog.error(tag, `webhook processing failed: ${err.message}`);

    // Release the claim so the retry is not swallowed as a duplicate.
    if (claim === 'claimed') {
      await sb('payment_events').delete().eq('id', ledgerId).run()
        .catch((e) => plog.warn(tag, 'could not release event claim', e.message));
    }

    // 500 asks Razorpay to try again — the money is real and the booking is not
    // yet confirmed, so another attempt is exactly what we want.
    return res.status(500).json({ error: 'Processing failed. Please retry.' });
  }
}

// -----------------------------------------------------------------------------
// POST /api/payments/reconcile/:bookingId   (admin)
// -----------------------------------------------------------------------------

/**
 * Ask Razorpay what happened to a booking that never got confirmed.
 *
 * The safety net behind the safety net: if the browser callback was lost and
 * the webhook was misconfigured or failed every retry, this settles it from the
 * authoritative source rather than by an admin guessing from a bank statement.
 * Read-only against Razorpay — it can confirm a booking, never charge one.
 */
async function reconcile(req, res, next) {
  const bookingId = req.params.bookingId;

  try {
    if (!razorpay.isConfigured()) return notConfigured(res);

    const rows = await sb('bookings').select('*').eq('id', bookingId).run();
    if (!rows || !rows.length) return error(res, 'Booking not found.', 404);
    const booking = rows[0];

    if (booking.status === 'confirmed') {
      return success(res, { booking, outcome: 'already_confirmed' });
    }

    if (!booking.payment_order_id) {
      return error(res, 'This booking has no Razorpay order to reconcile against.', 409);
    }

    plog(booking.ref, `reconcile requested by ${req.user.email} for order ${booking.payment_order_id}`);

    const { items = [] } = await razorpay.fetchOrderPayments(booking.payment_order_id);
    const captured = items.find((p) => isCaptured(p) && Number(p.amount) === expectedPaise(booking));

    if (!captured) {
      const summary = items.map((p) => `${p.id}:${p.status}:${p.amount}`).join(', ') || 'none';
      plog(booking.ref, `reconcile found no captured payment — attempts: ${summary}`);
      return success(res, { booking, outcome: 'no_captured_payment', attempts: items.length, summary });
    }

    const confirmed = await confirmBooking(booking, captured, { tag: booking.ref, source: 'reconcile' });
    return success(res, { booking: confirmed || booking, outcome: confirmed ? 'confirmed' : 'already_confirmed' });
  } catch (err) {
    plog.error(bookingId, `reconcile failed: ${err.message}`);
    next(err);
  }
}

// -----------------------------------------------------------------------------
// POST /api/payments/dismiss/:bookingId   (admin)
// -----------------------------------------------------------------------------

/**
 * Close out a booking that was never paid for.
 *
 * Most stuck bookings are simply abandoned checkouts — the customer opened the
 * payment page and left. Without a way to clear them the "needs attention"
 * queue fills with noise until nobody reads it, which is how a genuinely stuck
 * payment ends up sitting there unnoticed.
 *
 * Razorpay is re-checked first and the dismissal is refused if any payment was
 * captured. An admin cannot write off money that was actually taken, even by
 * mistake — that case has to go through reconcile.
 */
async function dismiss(req, res, next) {
  const bookingId = req.params.bookingId;

  try {
    const rows = await sb('bookings').select('*').eq('id', bookingId).run();
    if (!rows || !rows.length) return error(res, 'Booking not found.', 404);
    const booking = rows[0];

    if (!['pending_payment', 'payment_failed'].includes(booking.status)) {
      return error(res, `Only unpaid bookings can be dismissed (this one is '${booking.status}').`, 409);
    }

    // A booking with no order never reached checkout, so there is nothing to
    // check. One with an order gets verified against Razorpay before we write
    // it off.
    if (booking.payment_order_id) {
      if (!razorpay.isConfigured()) return notConfigured(res);

      const { items = [] } = await razorpay.fetchOrderPayments(booking.payment_order_id);
      const captured = items.find((p) => isCaptured(p));

      if (captured) {
        plog.warn(booking.ref, `dismiss REFUSED — Razorpay reports ${captured.id} as ${captured.status}`);
        return error(res, `Cannot dismiss: Razorpay reports payment ${captured.id} as ${captured.status}. Reconcile this booking instead.`, 409);
      }
    }

    const updated = await sb('bookings').update({ status: 'cancelled' })
      .eq('id', booking.id)
      .in('status', ['pending_payment', 'payment_failed'])
      .run();

    plog(booking.ref, `dismissed as unpaid by ${req.user.email}`);

    // The trip itself is still live — the customer never paid, so the query
    // should go back to the pipeline rather than dying with the booking.
    if (booking.query_id) {
      sb('queries').update({ status: 'open' }).eq('id', booking.query_id).eq('status', 'confirmed').run()
        .catch((e) => plog.warn(booking.ref, `could not reopen query ${booking.query_id}`, e.message));
    }

    return success(res, (updated && updated[0]) || booking);
  } catch (err) {
    plog.error(bookingId, `dismiss failed: ${err.message}`);
    next(err);
  }
}

// -----------------------------------------------------------------------------
// POST /api/payments/refund   (admin)
// -----------------------------------------------------------------------------

/**
 * Refund a confirmed booking, in full or in part.
 *
 * Admin-only, and the ceiling is computed here rather than trusted from the
 * request: a booking can be refunded at most down to zero, counting whatever
 * has already gone back. The booking row is updated optimistically, and the
 * refund.processed webhook later confirms it from Razorpay's side — so a refund
 * issued straight from the Razorpay dashboard lands in the same state.
 */
async function refund(req, res, next) {
  const { bookingId, amount, reason } = req.body;

  try {
    if (!razorpay.isConfigured()) return notConfigured(res);
    if (!bookingId) return error(res, 'bookingId is required.', 400);

    const rows = await sb('bookings').select('*').eq('id', bookingId).run();
    if (!rows || !rows.length) return error(res, 'Booking not found.', 404);
    const booking = rows[0];

    if (!booking.payment_id) {
      return error(res, 'This booking has no captured payment to refund.', 409);
    }

    const total = Number(booking.total_amount || 0);
    const alreadyRefunded = Number(booking.refund_amount || 0);
    const remaining = total - alreadyRefunded;

    if (remaining <= 0) {
      return error(res, 'This booking has already been fully refunded.', 409);
    }

    // Omitted amount means "refund what is left", which is the common case.
    const requested = amount === undefined || amount === null || amount === '' ? remaining : Number(amount);

    if (!Number.isFinite(requested) || requested <= 0) {
      return error(res, 'Refund amount must be a positive number.', 400);
    }
    // Rounded to paise before comparing, so a floating-point tail on a
    // full-amount request cannot trip the ceiling by a fraction of a paisa.
    if (Math.round(requested * 100) > Math.round(remaining * 100)) {
      return error(res, `Refund exceeds the refundable balance of ₹${remaining}.`, 409);
    }

    plog(booking.ref, `refund of ₹${requested} requested by ${req.user.email} (paid ₹${total}, already refunded ₹${alreadyRefunded})`);

    const created = await razorpay.createRefund(booking.payment_id, {
      amountInRupees: requested,
      receipt: `rf-${booking.ref}`,
      notes: { bookingId: booking.id, ref: booking.ref, reason: reason || 'Refund issued by SkyVayu' },
    });

    const refundedTotal = alreadyRefunded + requested;
    const fullyRefunded = Math.round(refundedTotal * 100) >= Math.round(total * 100);

    // The money has already left Razorpay by this point. Recording it must not
    // be able to throw and turn a completed refund into a 500 that reads like a
    // failure — an admin would reasonably retry it and refund twice.
    const updated = await sb('bookings')
      .update({ status: fullyRefunded ? 'refunded' : 'partially_refunded' })
      .eq('id', booking.id).run();

    const recorded = await writeOptionalColumns(booking.id, {
      refund_id: created.id,
      refund_amount: refundedTotal,
      refunded_at: new Date().toISOString(),
      refund_reason: reason || null,
    }, booking.ref);

    if (!recorded) {
      plog.error(booking.ref, `REFUND ${created.id} OF ₹${requested} WENT THROUGH BUT WAS NOT RECORDED — do not retry it`);
    }

    plog(booking.ref, `refund ${created.id} created — status ${created.status}, total refunded ₹${refundedTotal}`);

    // Release the trip back to the pipeline so it is not held by a booking that
    // no longer stands. Best-effort: the refund itself has already gone through.
    if (fullyRefunded && booking.query_id) {
      sb('queries').update({ status: 'open', booking_ref: null }).eq('id', booking.query_id).run()
        .catch((e) => plog.warn(booking.ref, `could not reopen query ${booking.query_id}`, e.message));
    }

    sendRefundEmail({
      clientEmail: booking.client_email,
      clientName: booking.client_name,
      ref: booking.ref,
      route: booking.route || '—',
      amount: requested,
      isPartial: !fullyRefunded,
      reason: reason || null,
    }).catch((e) => plog.warn(booking.ref, 'refund email failed', e.message));

    return success(res, {
      booking: (updated && updated[0]) || booking,
      refund: { id: created.id, amount: created.amount, status: created.status },
      recorded,
    });
  } catch (err) {
    plog.error(bookingId, `refund failed: ${err.message}`);
    next(err);
  }
}

module.exports = { createOrder, verifyPayment, webhook, reconcile, dismiss, refund };
