const { sb } = require('../config/supabase');
const { success, error } = require('../utils/response');

async function listFleet(req, res, next) {
  try {
    const { docStatus, limit = 100, offset = 0 } = req.query;
    let query = sb('aircraft').select('*').order('created_at', 'asc').limit(parseInt(limit)).offset(parseInt(offset));
    if (req.user.type === 'operator') query = query.eq('operator_id', req.user.operatorId);
    if (docStatus) query = query.eq('doc_status', docStatus);
    const rows = await query.run();
    return success(res, rows || [], 200, { total: rows ? rows.length : 0 });
  } catch (err) { next(err); }
}

async function getAircraft(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await sb('aircraft').select('*').eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Aircraft not found.', 404);
    if (req.user.type === 'operator' && rows[0].operator_id !== req.user.operatorId) return error(res, 'Forbidden.', 403);
    return success(res, rows[0]);
  } catch (err) { next(err); }
}

async function addAircraft(req, res, next) {
  try {
    const { aircraftType, registration, seatsAvailable, corUrl, corExpiry, coaUrl, coaExpiry, arcUrl, arcExpiry, insuranceUrl, insuranceExpiry } = req.body;
    const rows = await sb('aircraft').insert({
      operator_id: req.user.operatorId, aircraft_type: aircraftType, registration,
      seats_available: parseInt(seatsAvailable) || null, doc_status: 'pending',
      cor_url: corUrl || null, cor_expiry: corExpiry || null,
      coa_url: coaUrl || null, coa_expiry: coaExpiry || null,
      arc_url: arcUrl || null, arc_expiry: arcExpiry || null,
      insurance_url: insuranceUrl || null, insurance_expiry: insuranceExpiry || null,
    }).run();
    return success(res, rows && rows[0], 201);
  } catch (err) {
    if (err.supabaseCode === '23505') return error(res, 'An aircraft with this registration already exists.', 409);
    next(err);
  }
}

async function updateAircraft(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await sb('aircraft').select('operator_id').eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Aircraft not found.', 404);
    if (req.user.type === 'operator' && rows[0].operator_id !== req.user.operatorId) return error(res, 'Forbidden.', 403);
    const { aircraftType, registration, seatsAvailable, isActive, corUrl, corExpiry, coaUrl, coaExpiry, arcUrl, arcExpiry, insuranceUrl, insuranceExpiry } = req.body;
    const data = { doc_status: 'pending' };
    if (aircraftType !== undefined) data.aircraft_type = aircraftType;
    if (registration !== undefined) data.registration = registration;
    if (seatsAvailable !== undefined) data.seats_available = parseInt(seatsAvailable);
    if (isActive !== undefined) data.is_active = !!isActive;
    if (corUrl !== undefined) data.cor_url = corUrl;
    if (corExpiry !== undefined) data.cor_expiry = corExpiry;
    if (coaUrl !== undefined) data.coa_url = coaUrl;
    if (coaExpiry !== undefined) data.coa_expiry = coaExpiry;
    if (arcUrl !== undefined) data.arc_url = arcUrl;
    if (arcExpiry !== undefined) data.arc_expiry = arcExpiry;
    if (insuranceUrl !== undefined) data.insurance_url = insuranceUrl;
    if (insuranceExpiry !== undefined) data.insurance_expiry = insuranceExpiry;
    const updated = await sb('aircraft').update(data).eq('id', id).run();
    return success(res, updated && updated[0]);
  } catch (err) { next(err); }
}

async function deleteAircraft(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await sb('aircraft').select('operator_id').eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Aircraft not found.', 404);
    if (req.user.type === 'operator' && rows[0].operator_id !== req.user.operatorId) return error(res, 'Forbidden.', 403);
    await sb('aircraft').delete().eq('id', id).run();
    return success(res, { message: 'Aircraft removed.' });
  } catch (err) { next(err); }
}

async function updateDocStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { docStatus } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(docStatus)) return error(res, 'Invalid docStatus.', 400);
    const updated = await sb('aircraft').update({ doc_status: docStatus }).eq('id', id).run();
    if (!updated || !updated.length) return error(res, 'Aircraft not found.', 404);
    return success(res, updated[0]);
  } catch (err) { next(err); }
}

module.exports = { listFleet, getAircraft, addAircraft, updateAircraft, deleteAircraft, updateDocStatus };
