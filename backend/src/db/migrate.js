'use strict';

/**
 * SQL migration runner.
 *
 * Applies every file in sql/migrations/ exactly once, in filename order, and
 * records what it applied in a schema_migrations table.
 *
 * Why a direct Postgres connection rather than the REST client the rest of the
 * app uses: PostgREST speaks tables and RPC, not DDL. ALTER TABLE and CREATE
 * INDEX cannot go through it at any privilege level, so migrations need a real
 * database connection — DATABASE_URL.
 *
 * Usage:
 *   npm run migrate          — apply pending migrations
 *   npm run migrate:status   — list applied vs pending, change nothing
 *
 * Also runs automatically at boot unless RUN_MIGRATIONS_ON_BOOT=false.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const { DATABASE_URL } = require('../config/env');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'sql', 'migrations');

// Any constant works; it just has to be the same in every process so two
// instances booting at once cannot apply the same migration twice.
const ADVISORY_LOCK_KEY = 8172534;

function checksum(sql) {
  return crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16);
}

function readMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()  // 001_, 002_, ... — zero-pad new files to keep this honest
    .map((name) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
      return { name, sql, checksum: checksum(sql) };
    });
}

function connect() {
  // Supabase requires TLS. rejectUnauthorized stays off because the pooler
  // presents a certificate for a different hostname than the one dialled.
  return new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    // A migration that hangs should fail the deploy, not wedge it.
    statement_timeout: 60_000,
    connectionTimeoutMillis: 15_000,
  });
}

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name        text PRIMARY KEY,
      checksum    text NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
}

/**
 * @param {{ dryRun?: boolean }} options
 * @returns {Promise<{applied: string[], pending: string[], skipped: number}>}
 */
async function migrate({ dryRun = false } = {}) {
  if (!DATABASE_URL) {
    console.warn('[migrate] DATABASE_URL is not set — skipping migrations.');
    console.warn('[migrate] Supabase Dashboard → Project Settings → Database → Connection string (URI).');
    return { applied: [], pending: [], skipped: 0, skippedReason: 'no DATABASE_URL' };
  }

  const migrations = readMigrations();
  if (!migrations.length) {
    console.log('[migrate] No migration files found.');
    return { applied: [], pending: [], skipped: 0 };
  }

  const client = connect();
  await client.connect();

  const applied = [];
  const pending = [];

  try {
    // Session-scoped lock: only one process applies migrations at a time.
    // Needs a direct or session-mode connection — the transaction pooler
    // (port 6543) hands out a different backend per statement and will not
    // hold this.
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);

    await ensureTable(client);

    const { rows } = await client.query('SELECT name, checksum FROM public.schema_migrations');
    const alreadyApplied = new Map(rows.map((r) => [r.name, r.checksum]));

    for (const migration of migrations) {
      const previous = alreadyApplied.get(migration.name);

      if (previous) {
        if (previous !== migration.checksum) {
          // Editing an applied migration means environments have silently
          // diverged. Loud failure beats a database nobody can reason about.
          throw new Error(
            `Migration ${migration.name} was modified after it was applied ` +
            `(recorded ${previous}, now ${migration.checksum}). ` +
            `Add a new migration instead of editing an applied one.`,
          );
        }
        continue;
      }

      pending.push(migration.name);
      if (dryRun) continue;

      // Each migration is atomic — a failure halfway leaves nothing behind.
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)',
          [migration.name, migration.checksum],
        );
        await client.query('COMMIT');
        applied.push(migration.name);
        console.log(`[migrate] applied ${migration.name}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${migration.name} failed: ${err.message}`);
      }
    }

    if (dryRun) {
      console.log(`[migrate] ${alreadyApplied.size} applied, ${pending.length} pending.`);
      for (const name of pending) console.log(`  pending: ${name}`);
    } else if (applied.length === 0) {
      console.log(`[migrate] Up to date (${alreadyApplied.size} applied).`);
    } else {
      console.log(`[migrate] Applied ${applied.length} migration(s).`);
    }

    return { applied, pending, skipped: 0 };
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => {});
    await client.end().catch(() => {});
  }
}

module.exports = { migrate, readMigrations };

if (require.main === module) {
  const dryRun = process.argv.includes('--status') || process.argv.includes('--dry-run');
  migrate({ dryRun })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate] FAILED:', err.message);
      process.exit(1);
    });
}
