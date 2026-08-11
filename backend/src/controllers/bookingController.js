const { sb } = require('../config/supabase');
const { success, error } = require('../utils/response');
const { generateBookingRef } = require('../helpers/bookingRef');
const { sendBookingConfirmationEmail } = require('../services/emailService');

/**
 * Bookings are read by three different audiences and each sees a different
 * slice:
 *
 *   customer  — only bookings stamped with their own profile id
 *   operator  — only bookings for their own operator
 *   admin     — everything
 *
 * That scoping is enforced here, in one place, by `scopeFor`. It used to be a
 * single line that filtered customers and let operator tokens through
 * unfiltered, which meant any operator could list every booking on the
 * platform — client names, emails, phone numbers and amounts belonging to
 * competitors.
 *
 * Writes are narrower still: money and payment state are owned by
 * /api/payments, never by this controller. See createBooking and updateBooking.
 */

/** True for a token this API issued to an admin, or a Supabase admin session. */
function isAdmin(user) {
  return user && (user.role === 'admin' || user.type === 'admin');
}

function isOperator(user) {
  return user && user.type === 'operator';
}

/**
 * Narrow a bookings query to what this caller is allowed to see.
 * @returns the query, or null if the caller can be shown nothing at all.
 */
function scopeFor(query, user) {
  if (isAdmin(user)) return query;

  if (isOperator(user)) {
    // Bookings made before migration 003, and staff-created ones with no quote,
    // have no operator_id. They stay admin-only rather than defaulting to
    // visible — an unscoped row is not evidence of ownership.
    if (!user.operatorId) return null;
    return query.eq('operator_id', user.operatorId);
  }

  // Customer (Supabase session).
  if (!user || !user.id) return null;
  return query.eq('user_id', user.id);
}

/** Whether this caller may see one already-loaded booking. */
function mayView(booking, user) {
  if (isAdmin(user)) return true;
  if (isOperator(user)) return Boolean(user.operatorId) && booking.operator_id === user.operatorId;
  return Boolean(user && user.id) && booking.user_id === user.id;
}

// POST /api/bookings — admin only
async function createBooking(req, res, next) {
  try {
    const { queryId, quoteId, clientName, clientEmail, clientPhone, operatorName, aircraft, route, flightDate, passengers, totalAmount, platformFee, operatorId } = req.body;
    const ref = generateBookingRef(operatorName);

    // This mints a 'confirmed' booking at whatever price is in the body, with no
    // payment behind it — the offline/phone-booking path. It is admin-only for
    // that reason (enforced on the route); an operator reaching it could confirm
    // their own bookings for free.
    const rows = await sb('bookings').insert({
      query_id: queryId || null,
      quote_id: quoteId || null,
      ref, client_name: clientName, client_email: clientEmail, client_phone: clientPhone,
      operator_name: operatorName, aircraft: aircraft || null, route: route || null,
      flight_date: flightDate || null, passengers: parseInt(passengers) || null,
      total_amount: parseFloat(totalAmount) || null, platform_fee: parseFloat(platformFee) || null,
      // bookings.user_id has an FK to profiles.id, but req.user here is the
      // admin (id from operator_users, not in profiles) — stamping it would
      // violate bookings_user_id_fkey. The client is identified by client_email.
      status: 'confirmed', user_id: null,
    }).run();

    const booking = rows && rows[0];

    // operator_id arrives with migration 003. Set separately and best-effort so
    // an unapplied migration cannot fail the insert itself; without it the
    // booking is admin-only to view, which is the safe default.
    if (operatorId) {
      await sb('bookings').update({ operator_id: operatorId }).eq('id', booking.id).run()
        .catch(e => console.error(`[bookings] could not set operator_id on ${booking.id} — run migration 003:`, e.message));
    }

    if (queryId) sb('queries').update({ status: 'confirmed', booking_ref: ref }).eq('id', queryId).run().catch(() => {});
    if (quoteId) sb('quotes').update({ status: 'confirmed' }).eq('id', quoteId).run().catch(() => {});

    sendBookingConfirmationEmail({ clientEmail, clientName, ref, route: route || '—', flightDate: flightDate || '—', aircraft: aircraft || '—', operatorName, totalAmount: totalAmount || 0 }).catch(() => {});

    return success(res, booking, 201);
  } catch (err) { next(err); }
}

// GET /api/bookings
async function listBookings(req, res, next) {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = sb('bookings').select('*').order('created_at', 'desc').limit(parseInt(limit)).offset(parseInt(offset));
    if (status) query = query.eq('status', status);

    query = scopeFor(query, req.user);
    if (!query) return success(res, [], 200, { total: 0 });

    let rows;
    try {
      rows = await query.run();
    } catch (err) {
      // The operator filter needs bookings.operator_id, which arrives with
      // migration 003. Until it is applied PostgREST rejects the whole query.
      // Return nothing rather than surfacing an error: an operator seeing an
      // empty list is a degraded feature, an unscoped list is a data breach.
      if (isOperator(req.user)) {
        console.error('[bookings] operator scoping failed — run migration 003_bookings_operator_id.sql:', err.message);
        return success(res, [], 200, { total: 0 });
      }
      throw err;
    }

    return success(res, rows || [], 200, { total: rows ? rows.length : 0 });
  } catch (err) { next(err); }
}

// GET /api/bookings/:id
async function getBooking(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await sb('bookings').select('*').eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Booking not found.', 404);

    const booking = rows[0];
    if (!mayView(booking, req.user)) return error(res, 'Forbidden.', 403);

    return success(res, booking);
  } catch (err) { next(err); }
}

// PUT /api/bookings/:id — admin only
//
// Deliberately cannot touch `status` or `total_amount`.
//
// `status` is owned by the payment flow: a booking becomes 'confirmed' only
// after Razorpay confirms the money, and 'refunded' only after a refund goes
// through. Accepting it here reopened exactly that hole — this route used to let
// any operator token flip an unpaid booking to 'confirmed' and rewrite its
// price. Admins change status through /api/admin/bookings/:id, which whitelists
// the field and logs who did it.
//
// `total_amount` is what /api/payments compares the captured payment against and
// what the refund ceiling is computed from. Editing it after the fact would make
// both of those lie.
async function updateBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { aircraft, route, flightDate, passengers } = req.body;

    const data = {};
    if (aircraft) data.aircraft = aircraft;
    if (route) data.route = route;
    if (flightDate) data.flight_date = flightDate;
    if (passengers) data.passengers = parseInt(passengers);

    if (Object.keys(data).length === 0) {
      return error(res, 'Nothing to update. Allowed fields: aircraft, route, flightDate, passengers.', 400);
    }

    const rows = await sb('bookings').update(data).eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Booking not found.', 404);

    console.log(`[bookings] ${req.user.email} updated ${id}: ${JSON.stringify(data)}`);
    return success(res, rows[0]);
  } catch (err) { next(err); }
}

// DELETE /api/bookings/:id — admin only
async function deleteBooking(req, res, next) {
  try {
    const { id } = req.params;
    await sb('bookings').delete().eq('id', id).run();
    console.log(`[bookings] ${req.user.email} deleted ${id}`);
    return success(res, { message: 'Booking deleted.' });
  } catch (err) { next(err); }
}

module.exports = { createBooking, listBookings, getBooking, updateBooking, deleteBooking };
