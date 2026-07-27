'use strict';

// config/env must be the first import — it loads and validates the environment
// before any other module reads configuration off it.
const config = require('./config/env');
const app = require('./app');
const { migrate } = require('./db/migrate');

let server;

async function verifyDatabase() {
  const res = await fetch(`${config.SUPABASE_URL}/rest/v1/queries?limit=1`, {
    headers: {
      apikey: config.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  // 406 is expected when the table has no matching rows.
  if (!res.ok && res.status !== 406) {
    throw new Error(`Supabase health check returned ${res.status}`);
  }
}

async function start() {
  try {
    // Best-effort schema sync at boot. A migration failure here is logged
    // loudly but does NOT abort startup — an unreachable DATABASE_URL (e.g. the
    // IPv6-only direct host) should not take the whole API offline. Deploy
    // pipelines that need a hard gate run `npm run migrate` separately, which
    // exits non-zero on failure.
    if (config.RUN_MIGRATIONS_ON_BOOT) {
      try {
        await migrate();
      } catch (err) {
        console.error('[server] Boot migration failed (continuing anyway):', err.message);
        console.error('[server] Apply pending migrations manually with: npm run migrate');
      }
    }

    await verifyDatabase();
    console.log('[db] Connected to Supabase REST API.');

    server = app.listen(config.PORT, () => {
      console.log(`[server] SkyVayu API listening on port ${config.PORT} (${config.NODE_ENV})`);
      if (!config.IS_PRODUCTION) {
        console.log(`[server] Health check: http://localhost:${config.PORT}/health`);
      }
    });
  } catch (err) {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
}

/**
 * Stop accepting new connections and let in-flight requests finish before
 * exiting, so a deploy does not drop a request mid-flight.
 */
function shutdown(signal) {
  console.log(`[server] ${signal} received — shutting down.`);
  if (!server) process.exit(0);

  server.close(() => {
    console.log('[server] Closed remaining connections.');
    process.exit(0);
  });

  // Don't hang forever on a stuck connection.
  setTimeout(() => {
    console.error('[server] Forced shutdown after 10s timeout.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
  process.exit(1);
});

start();
