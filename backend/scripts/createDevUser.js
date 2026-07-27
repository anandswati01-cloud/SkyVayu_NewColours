'use strict';

/**
 * Create (or reset) a local test customer, so the app can be signed into on
 * localhost with email + password — no Google OAuth, no redirect to the
 * production Site URL.
 *
 *   cd backend && npm run dev:user
 *
 * Idempotent: run it again to reset the password if you forget it. Uses the
 * Supabase Auth Admin API with the service role key, and creates the user with
 * email already confirmed so sign-in works immediately.
 *
 * Refuses to run when NODE_ENV=production — this is a development convenience,
 * not something that should ever touch a production auth store on purpose.
 */

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IS_PRODUCTION } = require('../src/config/env');

const EMAIL = process.env.DEV_USER_EMAIL || 'dev@skyvayu.local';
const PASSWORD = process.env.DEV_USER_PASSWORD || 'devpassword123';

async function admin(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Admin API ${method} ${path} → ${res.status}: ${data.msg || data.error || JSON.stringify(data)}`);
  }
  return data;
}

async function findByEmail(email) {
  // The admin list endpoint has no server-side email filter, so page through.
  for (let page = 1; page <= 20; page++) {
    const { users } = await admin(`/users?page=${page}&per_page=200`);
    if (!users || !users.length) return null;
    const match = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (users.length < 200) return null;
  }
  return null;
}

async function main() {
  if (IS_PRODUCTION) {
    console.error('[dev:user] Refusing to run with NODE_ENV=production.');
    process.exit(1);
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[dev:user] SUPABASE_SERVICE_ROLE_KEY is not set.');
    process.exit(1);
  }

  const existing = await findByEmail(EMAIL);

  if (existing) {
    await admin(`/users/${existing.id}`, {
      method: 'PUT',
      body: { password: PASSWORD, email_confirm: true },
    });
    console.log(`[dev:user] Reset password for existing user ${EMAIL}`);
  } else {
    const created = await admin('/users', {
      method: 'POST',
      body: {
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: 'Dev Tester' },
      },
    });
    console.log(`[dev:user] Created user ${EMAIL} (id ${created.id})`);
  }

  console.log('');
  console.log('  Sign in on http://localhost:5173 with the "Dev sign-in" button, or:');
  console.log(`    email    : ${EMAIL}`);
  console.log(`    password : ${PASSWORD}`);
  console.log('');
  console.log('  Override via DEV_USER_EMAIL / DEV_USER_PASSWORD env vars.');
}

main().catch((err) => {
  console.error('[dev:user] Failed:', err.message);
  process.exit(1);
});
