const { sb } = require('../config/supabase');
const { success, error } = require('../utils/response');
const { sendQuoteSubmittedEmail } = require('../services/emailService');
const { isQuotable } = require('../helpers/aircraftDocs');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/quotes
async function createQuote(req, res, next) {
  try {
    const { queryId, aircraftId, aircraftType, aircraftRegistration, notes, baseCharge, handlingFee, crewAccommodation, catering } = req.body;
    const operatorId = req.user.operatorId;
    const submittedBy = req.user.id;

    const queryRows = await sb('queries').select('*').eq('id', queryId).run();
    if (!queryRows || !queryRows.length) return error(res, 'Query not found.', 404);
    const query = queryRows[0];
    if (query.status !== 'open') return error(res, 'This query is no longer open.', 409);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    if (query.created_at < oneHourAgo) return error(res, 'The 60-minute quoting window has closed.', 409);

    const existing = await sb('quotes').select('id').eq('query_id', queryId).eq('operator_id', operatorId).run();
    if (existing && existing.length) return error(res, 'Your team already submitted a quote for this query. Use PATCH to revise it.', 409);

    const opRows = await sb('operators').select('*').eq('id', operatorId).run();
    if (!opRows || !opRows.length) return error(res, 'Operator not found.', 404);
    const operator = opRows[0];

    // An aircraft with a lapsed CoA / ARC / insurance cannot be offered. This is
    // the check behind the platform's "expired certificate takes the aircraft
    // off the platform" promise.
    if (aircraftId) {
      const acRows = await sb('aircraft').select('*').eq('id', aircraftId).run();
      const aircraft = acRows && acRows[0];
      if (!aircraft) return error(res, 'Aircraft not found.', 404);
      if (aircraft.operator_id !== operatorId) return error(res, 'That aircraft belongs to another operator.', 403);

      const check = isQuotable(aircraft);
      if (!check.ok) return error(res, check.reason, 409);
    }

    const base = parseFloat(baseCharge) || 0;
    const handling = parseFloat(handlingFee) || 0;
    const crew = parseFloat(crewAccommodation) || 0;
    const cat = parseFloat(catering) || 0;
    const subtotal = base + handling + crew + cat;
    const gst = Math.round(subtotal * 0.18);
    const total = subtotal + gst;

    const quoteRows = await sb('quotes').insert({
      query_id: queryId, operator_id: operatorId, operator_name: operator.company_name,
      aircraft_id: aircraftId || null, aircraft_type: aircraftType || null,
      aircraft_registration: aircraftRegistration || null,
      price: total, notes: notes || null, status: 'shared', submitted_by: submittedBy,
    }).run();

    const quote = quoteRows && quoteRows[0];

    // Save itemised breakdown
    sb('quote_items').insert({ quote_id: quote.id, base_charge: base, handling_fee: handling, crew_accommodation: crew, catering: cat, gst_amount: gst, total }).run().catch(() => {});

    sendQuoteSubmittedEmail({ quoteId: quote.id, operatorName: operator.company_name, route: `${query.departure || '—'} → ${query.destination || '—'}` }).catch(() => {});

    return success(res, quote, 201);
  } catch (err) { next(err); }
}

// GET /api/quotes
async function listQuotes(req, res, next) {
  try {
    const { queryId, status, limit = 50, offset = 0 } = req.query;
    const isOperator = req.user && req.user.type === 'operator';

    let query = sb('quotes').select('*').order('price', 'asc').limit(parseInt(limit)).offset(parseInt(offset));

    if (queryId) query = query.eq('query_id', queryId);

    if (isOperator) {
      if (status) query = query.eq('status', status);
      query = query.eq('operator_id', req.user.operatorId);
    } else {
      // Customer or guest viewing the results page. The query's UUID is the
      // capability — without it, nothing is returned — and only 'shared' quotes
      // are ever visible, so drafts and internal statuses cannot be read by
      // passing ?status=... in the URL.
      if (!queryId) return error(res, 'queryId is required.', 400);
      query = query.eq('status', 'shared');
    }

    const rows = await query.run();

    // Sanitise competitor quotes for operators
    const sanitised = (rows || []).map((q) => {
      if (isOperator && q.operator_id !== req.user.operatorId) {
        return { id: q.id, query_id: q.query_id, aircraft_type: q.aircraft_type, price: q.price, status: q.status, created_at: q.created_at };
      }
      return q;
    });

    return success(res, sanitised, 200, { total: sanitised.length });
  } catch (err) { next(err); }
}

// GET /api/quotes/:id
async function getQuote(req, res, next) {
  try {
    const { id } = req.params;
    // A non-UUID id (e.g. a mis-routed /api/quotes/claim) would otherwise reach
    // Postgres and throw a raw 22P02 with a stack trace. Reject it cleanly.
    if (!UUID_RE.test(id)) return error(res, 'Invalid quote id.', 400);
    const rows = await sb('quotes').select('*').eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Quote not found.', 404);
    const quote = rows[0];
    if (req.user.type === 'operator' && quote.operator_id !== req.user.operatorId) return error(res, 'Forbidden.', 403);
    return success(res, quote);
  } catch (err) { next(err); }
}

// PATCH /api/quotes/:id
async function updateQuote(req, res, next) {
  try {
    const { id } = req.params;
    const { aircraftId, aircraftType, aircraftRegistration, notes, baseCharge, handlingFee, crewAccommodation, catering } = req.body;

    const rows = await sb('quotes').select('*').eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Quote not found.', 404);
    const quote = rows[0];
    if (req.user.type === 'operator' && quote.operator_id !== req.user.operatorId) return error(res, 'Forbidden.', 403);

    let updatedPrice = quote.price;
    if (baseCharge !== undefined) {
      const base = parseFloat(baseCharge) || 0;
      const handling = parseFloat(handlingFee) || 0;
      const crew = parseFloat(crewAccommodation) || 0;
      const cat = parseFloat(catering) || 0;
      const subtotal = base + handling + crew + cat;
      const gst = Math.round(subtotal * 0.18);
      updatedPrice = subtotal + gst;
      sb('quote_items').update({ base_charge: base, handling_fee: handling, crew_accommodation: crew, catering: cat, gst_amount: gst, total: updatedPrice }).eq('quote_id', id).run().catch(() => {});
    }

    const data = { price: updatedPrice };
    if (aircraftId !== undefined) data.aircraft_id = aircraftId;
    if (aircraftType !== undefined) data.aircraft_type = aircraftType;
    if (aircraftRegistration !== undefined) data.aircraft_registration = aircraftRegistration;
    if (notes !== undefined) data.notes = notes;

    const updated = await sb('quotes').update(data).eq('id', id).run();
    return success(res, updated && updated[0]);
  } catch (err) { next(err); }
}

// DELETE /api/quotes/:id
async function deleteQuote(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await sb('quotes').select('operator_id').eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Quote not found.', 404);
    if (req.user.type === 'operator' && rows[0].operator_id !== req.user.operatorId) return error(res, 'Forbidden.', 403);
    await sb('quote_items').delete().eq('quote_id', id).run();
    await sb('quotes').delete().eq('id', id).run();
    return success(res, { message: 'Quote deleted.' });
  } catch (err) { next(err); }
}

// POST /api/quotes/claim
async function claimQuery(req, res, next) {
  try {
    const { queryId } = req.body;
    if (!queryId) return error(res, 'queryId is required.', 400);
    const operatorId = req.user.operatorId;
    const userId = req.user.id;
    const userName = req.user.fullName || req.user.username || 'Operator';
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    const existing = await sb('query_claims').select('*').eq('query_id', queryId).run();
    const activeClaim = existing && existing.find(c => new Date(c.expires_at) > new Date());

    if (activeClaim) {
      if (activeClaim.claimed_by === userId) {
        const refreshed = await sb('query_claims').update({ expires_at: expiresAt }).eq('id', activeClaim.id).run();
        return success(res, { claim: refreshed && refreshed[0] });
      }
      return error(res, `Query is locked by ${activeClaim.claimed_by_name || 'a teammate'}.`, 409);
    }

    await sb('query_claims').delete().eq('query_id', queryId).eq('operator_id', operatorId).run();
    const claim = await sb('query_claims').insert({ query_id: queryId, operator_id: operatorId, claimed_by: userId, claimed_by_name: userName, expires_at: expiresAt }).run();
    return success(res, { claim: claim && claim[0] }, 201);
  } catch (err) { next(err); }
}

// DELETE /api/quotes/claims/:claimId
async function releaseClaim(req, res, next) {
  try {
    const { claimId } = req.params;
    await sb('query_claims').delete().eq('id', claimId).eq('claimed_by', req.user.id).run();
    return success(res, { message: 'Claim released.' });
  } catch (err) { next(err); }
}

module.exports = { createQuote, listQuotes, getQuote, updateQuote, deleteQuote, claimQuery, releaseClaim };
