/**
 * Supabase REST client
 * Replaces Prisma — uses Supabase REST API with the service role key.
 */

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = require('./env');

const BASE = `${SUPABASE_URL}/rest/v1`;

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
};

/**
 * sb(table) — returns a query builder for the given table
 *
 * Usage:
 *   await sb('queries').select('*').eq('status', 'open').order('created_at', 'desc').limit(50).run()
 *   await sb('queries').insert({ ... }).run()
 *   await sb('queries').update({ status: 'confirmed' }).eq('id', id).run()
 *   await sb('queries').delete().eq('id', id).run()
 */
function sb(table) {
  let method = 'GET';
  let body = null;
  let params = new URLSearchParams();
  let headers = { ...HEADERS };
  let selectCols = '*';

  const builder = {
    // ── SELECT ──────────────────────────────────────────────────────────────
    select(cols) { selectCols = cols || '*'; return builder; },

    // ── FILTERS ─────────────────────────────────────────────────────────────
    eq(col, val) { params.append(col, `eq.${val}`); return builder; },
    neq(col, val) { params.append(col, `neq.${val}`); return builder; },
    gt(col, val) { params.append(col, `gt.${val}`); return builder; },
    gte(col, val) { params.append(col, `gte.${val}`); return builder; },
    lt(col, val) { params.append(col, `lt.${val}`); return builder; },
    lte(col, val) { params.append(col, `lte.${val}`); return builder; },
    like(col, val) { params.append(col, `like.${val}`); return builder; },
    ilike(col, val) { params.append(col, `ilike.${val}`); return builder; },
    is(col, val) { params.append(col, `is.${val}`); return builder; },
    in(col, vals) { params.append(col, `in.(${vals.join(',')})`); return builder; },

    // ── ORDER / LIMIT / OFFSET ───────────────────────────────────────────────
    order(col, dir = 'asc') { params.append('order', `${col}.${dir}`); return builder; },
    limit(n) { params.append('limit', n); return builder; },
    offset(n) { params.append('offset', n); return builder; },

    // ── SINGLE ROW ───────────────────────────────────────────────────────────
    single() { headers['Accept'] = 'application/vnd.pgrst.object+json'; return builder; },
    maybeSingle() { params.append('limit', 1); return builder; },

    // ── MUTATIONS ────────────────────────────────────────────────────────────
    insert(data) {
      method = 'POST';
      body = JSON.stringify(data);
      headers['Prefer'] = 'return=representation';
      return builder;
    },
    upsert(data, { onConflict } = {}) {
      method = 'POST';
      body = JSON.stringify(data);
      headers['Prefer'] = `resolution=merge-duplicates,return=representation`;
      if (onConflict) params.append('on_conflict', onConflict);
      return builder;
    },
    update(data) {
      method = 'PATCH';
      body = JSON.stringify(data);
      headers['Prefer'] = 'return=representation';
      return builder;
    },
    delete() {
      method = 'DELETE';
      headers['Prefer'] = 'return=representation';
      return builder;
    },

    // ── EXECUTE ──────────────────────────────────────────────────────────────
    async run() {
      if (method === 'GET') params.append('select', selectCols);
      const url = `${BASE}/${table}?${params.toString()}`;
      const res = await fetch(url, { method, headers, body });
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      if (!res.ok) {
        const msg = (data && data.message) ? data.message : `Supabase error ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.supabaseCode = data && data.code;
        throw err;
      }
      return data;
    },
  };

  return builder;
}

/**
 * Call a Supabase RPC function
 */
async function rpc(fnName, params = {}) {
  const res = await fetch(`${BASE}/rpc/${fnName}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(params),
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && data.message) ? data.message : `RPC error ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

module.exports = { sb, rpc };
