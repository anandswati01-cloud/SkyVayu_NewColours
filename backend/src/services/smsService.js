'use strict';

/**
 * SMS delivery.
 *
 * Three providers, chosen by SMS_PROVIDER:
 *
 *   generic — any Indian bulk-SMS gateway that takes a plain HTTP call. The
 *             whole request is described by SMS_GATEWAY_URL, so switching
 *             gateway is an env change and needs no code. Use this when you
 *             already hold a DLT-approved template on an existing account.
 *   msg91   — MSG91's own "flow" API. Note this wants MSG91's flow id, which is
 *             NOT the same number as the 19-digit DLT template id; if all you
 *             have is a DLT id, you want `generic`.
 *   twilio  — fine for international numbers; for +91 it still needs the same
 *             DLT registration done on Twilio's side.
 *   console — no provider configured. The code is printed to the server log and
 *             nothing is sent. This is the automatic fallback in development so
 *             the flow is testable without an SMS account, and it is REFUSED in
 *             production rather than silently pretending to deliver.
 *
 * Every provider returns { ok, provider, id } or throws. Callers never learn
 * which provider ran; swapping one for another is an env change.
 */

const {
  IS_PRODUCTION,
  SMS_PROVIDER,
  SMS_GATEWAY_URL,
  SMS_GATEWAY_METHOD,
  SMS_GATEWAY_BODY,
  SMS_GATEWAY_USER,
  SMS_GATEWAY_PASS,
  SMS_TEMPLATE,
  DLT_TE_ID,
  DLT_PE_ID,
  MSG91_AUTH_KEY,
  MSG91_TEMPLATE_ID,
  MSG91_SENDER_ID,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM_NUMBER,
} = require('../config/env');

/** Digits only, no leading +. What both providers want. */
const bare = (phone) => phone.replace(/\D/g, '');

/**
 * Generic HTTP gateway.
 *
 * SMS_GATEWAY_URL is the endpoint. For a GET gateway, put the parameters in the
 * URL itself; for a POST one, put them in SMS_GATEWAY_BODY and set
 * SMS_GATEWAY_METHOD=POST — the body is sent form-encoded, which is what these
 * gateways expect.
 *
 * Recognised placeholders, in both the URL and the body:
 *   {phone}       +919876543210
 *   {phone_bare}  919876543210     — country code, no +
 *   {phone_local} 9876543210       — last 10 digits, what Indian gateways want
 *   {otp}         483920
 *   {message}     SMS_TEMPLATE with {otp} substituted
 *   {dlt_te_id}   DLT_TE_ID
 *   {dlt_pe_id}   DLT_PE_ID
 *   {user}        SMS_GATEWAY_USER — account credentials, kept out of the
 *   {pass}        SMS_GATEWAY_PASS   template so they live in their own secrets
 *
 * Every value is URL-encoded on the way in, so a message containing & or a +
 * cannot break the request.
 *
 * SMS_TEMPLATE must reproduce the DLT-approved wording CHARACTER FOR CHARACTER
 * with {otp} standing in for the template's {#var#}. Carriers match the
 * delivered text against the registered template and silently drop anything
 * that differs — a changed comma is enough to stop delivery, with no error
 * anywhere to explain it.
 */
async function sendViaGeneric(phone, code) {
  if (!SMS_GATEWAY_URL) {
    const err = new Error('SMS is not configured (SMS_GATEWAY_URL missing).');
    err.status = 503;
    throw err;
  }
  if (!SMS_TEMPLATE) {
    const err = new Error('SMS is not configured (SMS_TEMPLATE missing).');
    err.status = 503;
    throw err;
  }

  const message = SMS_TEMPLATE.replaceAll('{otp}', code);
  const digits = bare(phone);

  const values = {
    phone,
    phone_bare: digits,
    phone_local: digits.slice(-10),
    otp: code,
    message,
    dlt_te_id: DLT_TE_ID,
    dlt_pe_id: DLT_PE_ID,
    user: SMS_GATEWAY_USER,
    pass: SMS_GATEWAY_PASS,
  };

  // Longest-first in the alternation, so {phone_bare} is not matched as
  // {phone} with a stray "_bare" left behind.
  const fill = (template) => template.replace(
    /\{(phone_local|phone_bare|phone|otp|message|dlt_te_id|dlt_pe_id|user|pass)\}/g,
    (_, key) => encodeURIComponent(values[key] ?? ''),
  );

  const method = (SMS_GATEWAY_METHOD || 'GET').toUpperCase();
  const url = fill(SMS_GATEWAY_URL);

  const res = await fetch(url, {
    method,
    ...(method === 'POST' && SMS_GATEWAY_BODY
      ? {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: fill(SMS_GATEWAY_BODY),
      }
      : {}),
  });
  const text = await res.text();

  if (!res.ok) {
    const err = new Error(`SMS gateway returned ${res.status}: ${text.slice(0, 200)}`);
    err.status = 502;
    throw err;
  }

  // Most of these gateways answer 200 with a plain-text body that says whether
  // it worked. There is no shared format, so the body is logged rather than
  // parsed — a send that "succeeded" with an error body shows up here.
  console.log(`[sms:gateway] ${res.status} ${text.slice(0, 200)}`);

  return { ok: true, provider: 'generic', id: null };
}

async function sendViaMsg91(phone, code) {
  if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) {
    const err = new Error('SMS is not configured (MSG91_AUTH_KEY / MSG91_TEMPLATE_ID missing).');
    err.status = 503;
    throw err;
  }

  const res = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: MSG91_AUTH_KEY },
    body: JSON.stringify({
      template_id: MSG91_TEMPLATE_ID,
      short_url: '0',
      ...(MSG91_SENDER_ID ? { sender: MSG91_SENDER_ID } : {}),
      // `otp` must match the variable name in the approved DLT template. If the
      // template calls it something else, the SMS goes out with a blank code.
      recipients: [{ mobiles: bare(phone), otp: code }],
    }),
  });

  const body = await res.json().catch(() => ({}));

  // MSG91 answers 200 with {type:'error'} for template and DLT problems, so the
  // status code alone is not enough to call it delivered.
  if (!res.ok || body.type === 'error') {
    const err = new Error(body.message || `MSG91 rejected the message (${res.status}).`);
    err.status = 502;
    throw err;
  }

  return { ok: true, provider: 'msg91', id: body.request_id || null };
}

async function sendViaTwilio(phone, code) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    const err = new Error('SMS is not configured (Twilio credentials missing).');
    err.status = 503;
    throw err;
  }

  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone,
        From: TWILIO_FROM_NUMBER,
        Body: `${code} is your SkyVayu verification code. It expires in 5 minutes. Do not share it with anyone.`,
      }),
    },
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || `Twilio rejected the message (${res.status}).`);
    err.status = 502;
    throw err;
  }

  return { ok: true, provider: 'twilio', id: body.sid || null };
}

function sendViaConsole(phone, code) {
  if (IS_PRODUCTION) {
    // Refusing here is the point. A production deploy with no provider would
    // otherwise "send" every code to a log file nobody reads, and every
    // customer would sit on a verification screen that can never pass.
    const err = new Error('SMS provider is not configured.');
    err.status = 503;
    throw err;
  }
  console.log(`\n[sms:dev] OTP for ${phone} is ${code}\n`);
  return { ok: true, provider: 'console', id: null };
}

/**
 * @param {string} phone E.164, e.g. +919876543210
 * @param {string} code  The plaintext code. Never logged outside dev.
 */
async function sendOtpSms(phone, code) {
  switch (SMS_PROVIDER) {
    case 'generic': return sendViaGeneric(phone, code);
    case 'msg91': return sendViaMsg91(phone, code);
    case 'twilio': return sendViaTwilio(phone, code);
    case 'console': return sendViaConsole(phone, code);
    default: {
      const err = new Error(`Unknown SMS_PROVIDER "${SMS_PROVIDER}".`);
      err.status = 500;
      throw err;
    }
  }
}

module.exports = { sendOtpSms };
