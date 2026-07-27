'use strict';

const { sb } = require('../config/supabase');

/**
 * Resolve the profiles.id to stamp onto a row that references it (queries.user_id,
 * bookings.user_id — both FK to profiles.id).
 *
 * Customers arrive with a Supabase auth id (req.user.id), but a profiles row only
 * exists once /api/auth/sync-profile has run. If it never did (or raced the first
 * write), the FK target is missing and the insert dies on
 * queries_user_id_fkey / bookings_user_id_fkey. Create it here so these writes are
 * self-healing instead of depending on an earlier call.
 *
 * @param {{id?: string, email?: string|null, fullName?: string|null}} user - req.user, or null for a guest.
 * @returns {Promise<string|null>} the id to stamp, or null when it can't be recorded (store as guest).
 */
async function ensureProfile(user) {
  if (!user || !user.id) return null;

  const existing = await sb('profiles').select('id').eq('id', user.id).run();
  if (existing && existing.length) return user.id;

  // profiles.email is NOT NULL; Google sign-in always carries one. Without it
  // we can't create a valid row, so fall back to an unattributed (guest) row.
  if (!user.email) return null;

  await sb('profiles')
    .upsert({ id: user.id, email: user.email, full_name: user.fullName || null }, { onConflict: 'id' })
    .run();

  return user.id;
}

module.exports = { ensureProfile };
