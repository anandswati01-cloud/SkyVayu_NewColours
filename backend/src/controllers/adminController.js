'use strict';

const { sb } = require('../config/supabase');
const { success, error } = require('../utils/response');

/**
 * Admin data access.
 *
 * The admin dashboard used to query PostgREST straight from the browser with
 * the anon key — which meant admin reach depended entirely on RLS policies, and
 * the "is this an admin?" check ran in the browser where anyone could skip it.
 *
 * Everything now comes through here: the caller is verified as an admin
 * server-side (authenticateAdmin), and only the resources and columns listed
 * below can be touched. Nothing accepts a caller-supplied table name or filter.
 */

const RESOURCES = {
  queries: {
    list: () => sb('queries').select('*').order('created_at', 'desc').limit(200),
  },
  quotes: {
    list: () => sb('quotes').select('*').order('created_at', 'desc').limit(200),
  },
  profiles: {
    list: () => sb('profiles').select('*').order('created_at', 'desc').limit(200),
  },
  bookings: {
    list: () => sb('bookings').select('*').order('created_at', 'desc').limit(200),
    table: 'bookings',
    updatable: ['status'],
  },
  // Bookings where money moved but the booking never landed on 'confirmed' —
  // a lost checkout callback, a webhook that never arrived, a card declined at
  // the last step. Anything sitting here for more than a few minutes needs a
  // human: reconcile it against Razorpay, or refund it.
  bookings_payment_issues: {
    list: () => sb('bookings')
      .select('*')
      .in('status', ['pending_payment', 'payment_failed'])
      .order('created_at', 'desc')
      .limit(200),
  },
  payment_events: {
    list: () => sb('payment_events').select('*').order('received_at', 'desc').limit(200),
  },
  operators: {
    list: () => sb('operators')
      .select('*,operator_users(id,username,full_name,role,email)')
      .order('created_at', 'desc'),
    table: 'operators',
    updatable: ['approval_status', 'rejection_reason'],
  },
  aircraft: {
    list: () => sb('aircraft').select('*,operators(company_name)').order('created_at', 'desc'),
    table: 'aircraft',
    updatable: ['doc_status', 'is_active', 'doc_rejection_reason'],
  },
  aircraft_pending: {
    list: () => sb('aircraft')
      .select('*,operators(company_name)')
      .eq('doc_status', 'pending')
      .order('created_at', 'desc'),
  },
  operator_users: {
    list: () => sb('operator_users').select('*,operators(company_name)').order('created_at', 'desc'),
    table: 'operator_users',
    updatable: ['is_approved', 'is_active'],
  },
  employees_pending: {
    list: () => sb('operator_users')
      .select('*,operators(company_name)')
      .eq('role', 'employee')
      .eq('is_approved', 'false')
      .order('created_at', 'desc'),
  },
  feedback: {
    list: () => sb('feedback').select('*').order('created_at', 'desc').limit(100),
    table: 'feedback',
    deletable: true,
  },
  contacts: {
    list: () => sb('contact_messages').select('*').order('created_at', 'desc').limit(100),
    table: 'contact_messages',
    deletable: true,
  },
};

function resolve(res, name) {
  const resource = RESOURCES[name];
  if (!resource) {
    error(res, `Unknown resource '${name}'.`, 404);
    return null;
  }
  return resource;
}

// GET /api/admin/:resource
async function list(req, res, next) {
  try {
    const resource = resolve(res, req.params.resource);
    if (!resource) return;

    const rows = await resource.list().run();
    return success(res, rows || [], 200, { total: rows ? rows.length : 0 });
  } catch (err) { next(err); }
}

// PATCH /api/admin/:resource/:id
async function update(req, res, next) {
  try {
    const resource = resolve(res, req.params.resource);
    if (!resource) return;

    if (!resource.table || !resource.updatable) {
      return error(res, `Resource '${req.params.resource}' is read-only.`, 405);
    }

    // Only whitelisted columns survive. An extra field in the body is dropped,
    // not written — so a tampered request cannot flip, say, a price or a user id.
    const data = {};
    for (const field of resource.updatable) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }

    if (Object.keys(data).length === 0) {
      return error(res, `Nothing to update. Allowed fields: ${resource.updatable.join(', ')}.`, 400);
    }

    const rows = await sb(resource.table).update(data).eq('id', req.params.id).run();
    if (!rows || !rows.length) return error(res, 'Record not found.', 404);

    console.log(`[admin] ${req.user.email} updated ${resource.table}/${req.params.id}: ${JSON.stringify(data)}`);
    return success(res, rows[0]);
  } catch (err) { next(err); }
}

// DELETE /api/admin/:resource/:id
async function remove(req, res, next) {
  try {
    const resource = resolve(res, req.params.resource);
    if (!resource) return;

    if (!resource.table || !resource.deletable) {
      return error(res, `Resource '${req.params.resource}' cannot be deleted.`, 405);
    }

    await sb(resource.table).delete().eq('id', req.params.id).run();

    console.log(`[admin] ${req.user.email} deleted ${resource.table}/${req.params.id}`);
    return success(res, { message: 'Deleted.' });
  } catch (err) { next(err); }
}

module.exports = { list, update, remove, RESOURCES };
