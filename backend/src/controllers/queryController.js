const { sb } = require('../config/supabase');
const { success, error } = require('../utils/response');
const { sendNewQueryEmail } = require('../services/emailService');
const { MEMBERSHIP_GATE_ENABLED } = require('../config/env');
const { ensureProfile } = require('../helpers/profile');

// POST /api/queries
async function createQuery(req, res, next) {
  try {
    const { tripType, departure, destination, flightDate, flightTime, returnDate, returnTime, passengers, clientPhone, sectors, medivac, pets, infants, vip, aircraftCategory } = req.body;
    const userId = await ensureProfile(req.user);

    // Check user access gate (off by default — see MEMBERSHIP_GATE_ENABLED)
    if (userId && MEMBERSHIP_GATE_ENABLED) {
      const access = await sb('charter_user_access').select('*').eq('user_id', userId).run();
      if (access && access.length && !access[0].is_member && access[0].query_count >= 1) {
        return error(res, 'MEMBERSHIP_REQUIRED', 403);
      }
    }

    const rows = await sb('queries').insert({
      trip_type: tripType,
      departure, destination,
      flight_date: flightDate || null,
      flight_time: flightTime || null,
      return_date: returnDate || null,
      return_time: returnTime || null,
      passengers: parseInt(passengers) || 1,
      client_phone: clientPhone || null,
      sectors: sectors || null,
      medivac: !!medivac,
      pets: !!pets,
      infants: !!infants,
      vip: !!vip,
      aircraft_category: aircraftCategory || 'fixed_wing',
      status: 'open',
      user_id: userId,
    }).run();

    const query = rows && rows[0];

    // Upsert access counter (fire and forget)
    if (userId) {
      sb('charter_user_access').upsert({
        user_id: userId,
        query_count: 1,
        first_query_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' }).run().catch(() => {});
    }

    sendNewQueryEmail({ queryId: query.id, departure: query.departure, destination: query.destination, flightDate: query.flight_date, passengers: query.passengers }).catch(() => {});

    return success(res, query, 201);
  } catch (err) { next(err); }
}

// GET /api/queries
async function listQueries(req, res, next) {
  try {
    const { status, aircraftCategory, limit = 50, offset = 0 } = req.query;
    let query = sb('queries').select('*').order('created_at', 'desc').limit(parseInt(limit)).offset(parseInt(offset));

    if (status) query = query.eq('status', status);
    if (aircraftCategory) query = query.eq('aircraft_category', aircraftCategory);

    if (req.user && req.user.type === 'operator') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      query = sb('queries').select('*').eq('status', 'open').gte('created_at', oneHourAgo).order('created_at', 'desc').limit(parseInt(limit)).offset(parseInt(offset));
    }

    const rows = await query.run();
    return success(res, rows || [], 200, { total: rows ? rows.length : 0 });
  } catch (err) { next(err); }
}

// GET /api/queries/:id
async function getQuery(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await sb('queries').select('*').eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Query not found.', 404);
    const query = rows[0];

    // Fetch associated quotes
    const quotes = await sb('quotes').select('*').eq('query_id', id).eq('status', 'shared').order('price', 'asc').run();
    query.quotes = quotes || [];

    return success(res, query);
  } catch (err) { next(err); }
}

// PATCH /api/queries/:id
async function updateQuery(req, res, next) {
  try {
    const { id } = req.params;
    const { status, declineReason } = req.body;
    const data = {};
    if (status) data.status = status;
    if (declineReason) data.decline_reason = declineReason;
    const rows = await sb('queries').update(data).eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Query not found.', 404);
    return success(res, rows[0]);
  } catch (err) { next(err); }
}

// DELETE /api/queries/:id
async function deleteQuery(req, res, next) {
  try {
    const { id } = req.params;
    await sb('queries').delete().eq('id', id).run();
    return success(res, { message: 'Query deleted.' });
  } catch (err) { next(err); }
}

module.exports = { createQuery, listQueries, getQuery, updateQuery, deleteQuery };
