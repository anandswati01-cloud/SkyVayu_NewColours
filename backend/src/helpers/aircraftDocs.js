'use strict';

/**
 * Aircraft airworthiness document rules.
 *
 * The Fleet page tells customers that "an expired certificate takes the
 * aircraft off the platform until it is renewed". This module is what makes
 * that true: expiry dates were being stored but never checked, so an aircraft
 * with a lapsed Certificate of Airworthiness could still be quoted.
 */

const DOCUMENTS = [
  { key: 'cor', label: 'Certificate of Registration', expiryField: 'cor_expiry', urlField: 'cor_url' },
  { key: 'coa', label: 'Certificate of Airworthiness', expiryField: 'coa_expiry', urlField: 'coa_url' },
  { key: 'arc', label: 'Airworthiness Review Certificate', expiryField: 'arc_expiry', urlField: 'arc_url' },
  { key: 'insurance', label: 'Insurance', expiryField: 'insurance_expiry', urlField: 'insurance_url' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Document status for one aircraft.
 *
 * A missing expiry date is not treated as expired — some operators are approved
 * on documents without a machine-readable date. Only a date that has actually
 * passed counts against the aircraft.
 *
 * @returns {Array<{key, label, expiry: string|null, daysLeft: number|null, expired: boolean}>}
 */
function documentStatus(aircraft) {
  const today = startOfToday();

  return DOCUMENTS.map((doc) => {
    const raw = aircraft[doc.expiryField];
    if (!raw) {
      return { key: doc.key, label: doc.label, expiry: null, daysLeft: null, expired: false, missing: true };
    }

    const expiry = new Date(raw);
    if (Number.isNaN(expiry.getTime())) {
      return { key: doc.key, label: doc.label, expiry: raw, daysLeft: null, expired: false, invalid: true };
    }

    const daysLeft = Math.floor((expiry - today) / DAY_MS);
    return { key: doc.key, label: doc.label, expiry: raw, daysLeft, expired: daysLeft < 0, missing: false };
  });
}

/** Documents that have already lapsed. */
function expiredDocuments(aircraft) {
  return documentStatus(aircraft).filter((d) => d.expired);
}

/** Documents lapsing within `days` (default 30) — for reminder emails. */
function expiringSoon(aircraft, days = 30) {
  return documentStatus(aircraft).filter((d) => !d.expired && d.daysLeft !== null && d.daysLeft <= days);
}

/**
 * Can this aircraft be put on a quote right now?
 * @returns {{ ok: boolean, reason?: string }}
 */
function isQuotable(aircraft) {
  if (!aircraft) return { ok: false, reason: 'Aircraft not found.' };
  if (aircraft.is_active === false) return { ok: false, reason: 'This aircraft is marked inactive.' };
  if (aircraft.doc_status !== 'approved') {
    return { ok: false, reason: 'This aircraft is not approved yet. Documents are still under review.' };
  }

  const expired = expiredDocuments(aircraft);
  if (expired.length) {
    const names = expired.map((d) => `${d.label} (expired ${d.expiry})`).join(', ');
    return { ok: false, reason: `Cannot quote — expired documents: ${names}. Upload renewals in Fleet.` };
  }

  return { ok: true };
}

module.exports = { DOCUMENTS, documentStatus, expiredDocuments, expiringSoon, isQuotable };
