const { sb } = require('../config/supabase');
const { success, error } = require('../utils/response');
const { generateBookingRef } = require('../helpers/bookingRef');
const { sendBookingConfirmationEmail } = require('../services/emailService');

// POST /api/bookings
async function createBooking(req, res, next) {
  try {
    const { queryId, quoteId, clientName, clientEmail, clientPhone, operatorName, aircraft, route, flightDate, passengers, totalAmount, platformFee } = req.body;
    const ref = generateBookingRef(operatorName);

    const rows = await sb('bookings').insert({
      query_id: queryId || null,
      quote_id: quoteId || null,
      ref, client_name: clientName, client_email: clientEmail, client_phone: clientPhone,
      operator_name: operatorName, aircraft: aircraft || null, route: route || null,
      flight_date: flightDate || null, passengers: parseInt(passengers) || null,
      total_amount: parseFloat(totalAmount) || null, platform_fee: parseFloat(platformFee) || null,
      // Staff-created booking on behalf of a client. bookings.user_id has an FK to
      // profiles.id, but req.user here is the operator/admin (id from operator_users,
      // not in profiles) — stamping it would violate bookings_user_id_fkey. The
      // client is identified by client_email, so this stays unattributed.
      status: 'confirmed', user_id: null,
    }).run();

    const booking = rows && rows[0];

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
    if (req.user && req.user.type !== 'operator') query = query.eq('user_id', req.user.id);
    const rows = await query.run();
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
    if (req.user && req.user.type !== 'operator' && booking.user_id !== req.user.id) return error(res, 'Forbidden.', 403);
    return success(res, booking);
  } catch (err) { next(err); }
}

// PUT /api/bookings/:id
async function updateBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { status, aircraft, route, flightDate, passengers, totalAmount } = req.body;
    const data = {};
    if (status) data.status = status;
    if (aircraft) data.aircraft = aircraft;
    if (route) data.route = route;
    if (flightDate) data.flight_date = flightDate;
    if (passengers) data.passengers = parseInt(passengers);
    if (totalAmount) data.total_amount = parseFloat(totalAmount);
    const rows = await sb('bookings').update(data).eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Booking not found.', 404);
    return success(res, rows[0]);
  } catch (err) { next(err); }
}

// DELETE /api/bookings/:id
async function deleteBooking(req, res, next) {
  try {
    const { id } = req.params;
    await sb('bookings').delete().eq('id', id).run();
    return success(res, { message: 'Booking deleted.' });
  } catch (err) { next(err); }
}

module.exports = { createBooking, listBookings, getBooking, updateBooking, deleteBooking };
