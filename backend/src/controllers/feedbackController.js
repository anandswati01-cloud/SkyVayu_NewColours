const { sb } = require('../config/supabase');
const { success, error } = require('../utils/response');

async function submitFeedback(req, res, next) {
  try {
    const { name, email, message, rating } = req.body;
    if (!message) return error(res, 'Message is required.', 400);
    const rows = await sb('feedback').insert({ name: name || null, email: email || null, message, rating: rating ? parseInt(rating) : null }).run();
    return success(res, rows && rows[0], 201);
  } catch (err) { next(err); }
}

async function listFeedback(req, res, next) {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const rows = await sb('feedback').select('*').order('created_at', 'desc').limit(parseInt(limit)).offset(parseInt(offset)).run();
    return success(res, rows || [], 200, { total: rows ? rows.length : 0 });
  } catch (err) { next(err); }
}

async function deleteFeedback(req, res, next) {
  try {
    const { id } = req.params;
    await sb('feedback').delete().eq('id', id).run();
    return success(res, { message: 'Feedback deleted.' });
  } catch (err) { next(err); }
}

async function subscribeNewsletter(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return error(res, 'Email is required.', 400);
    await sb('newsletter_subscribers').upsert({ email }, { onConflict: 'email' }).run();
    return success(res, { message: 'Subscribed successfully.' }, 201);
  } catch (err) { next(err); }
}

async function submitContact(req, res, next) {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) return error(res, 'name, email, and message are required.', 400);
    const rows = await sb('contact_messages').insert({ name, email, subject: subject || null, message }).run();
    return success(res, rows && rows[0], 201);
  } catch (err) { next(err); }
}

module.exports = { submitFeedback, listFeedback, deleteFeedback, subscribeNewsletter, submitContact };
