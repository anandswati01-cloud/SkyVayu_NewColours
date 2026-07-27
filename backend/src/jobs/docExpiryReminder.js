'use strict';

/**
 * Aircraft document expiry reminders.
 *
 * Run daily from a scheduler (Render Cron Job, GitHub Action, system cron):
 *
 *   npm run docs:check
 *
 * Read-only against the database — it emails operators, it does not deactivate
 * anything. Enforcement happens at quote time in helpers/aircraftDocs.js, so a
 * lapsed document blocks a quote whether or not this job has run.
 */

const { sb } = require('../config/supabase');
const { expiredDocuments, expiringSoon } = require('../helpers/aircraftDocs');
const { sendDocExpiryReminderEmail } = require('../services/emailService');

const WARN_WITHIN_DAYS = 30;

async function run() {
  const aircraft = await sb('aircraft').select('*').eq('is_active', true).run();
  if (!aircraft || !aircraft.length) {
    console.log('[docs] No active aircraft to check.');
    return { checked: 0, notified: 0 };
  }

  const operators = await sb('operators').select('id,company_name,email').run();
  const byId = new Map((operators || []).map((o) => [o.id, o]));

  let notified = 0;
  const problems = [];

  for (const ac of aircraft) {
    const expired = expiredDocuments(ac);
    const soon = expiringSoon(ac, WARN_WITHIN_DAYS);
    if (!expired.length && !soon.length) continue;

    const operator = byId.get(ac.operator_id);
    problems.push({
      registration: ac.registration,
      operator: operator ? operator.company_name : ac.operator_id,
      expired: expired.map((d) => `${d.label} (${d.expiry})`),
      soon: soon.map((d) => `${d.label} in ${d.daysLeft}d`),
    });

    if (!operator || !operator.email) {
      console.warn(`[docs] ${ac.registration}: no operator email on file, skipping reminder.`);
      continue;
    }

    // One email per lapsing document keeps the subject line specific.
    for (const doc of [...expired, ...soon]) {
      await sendDocExpiryReminderEmail({
        operatorEmail: operator.email,
        operatorName: operator.company_name,
        docName: `${doc.label} — ${ac.registration}`,
        expiryDate: doc.expiry,
      }).catch((err) => console.error(`[docs] Email failed for ${ac.registration}:`, err.message));
      notified += 1;
    }
  }

  console.log(`[docs] Checked ${aircraft.length} aircraft, ${problems.length} with issues, ${notified} reminders sent.`);
  for (const p of problems) {
    const bits = [...p.expired.map((e) => `EXPIRED ${e}`), ...p.soon];
    console.log(`  ${p.registration} (${p.operator}): ${bits.join(' · ')}`);
  }

  return { checked: aircraft.length, flagged: problems.length, notified };
}

module.exports = { run };

// Allow `node src/jobs/docExpiryReminder.js` as well as programmatic use.
if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[docs] Job failed:', err.message);
      process.exit(1);
    });
}
