/**
 * SkyVayu Email Service
 * Sends transactional emails via Resend API (HTTP fetch — no extra SDK needed).
 * Falls back to console.log in development if RESEND_API_KEY is not set.
 */

const { RESEND_API_KEY, EMAIL_FROM, ADMIN_EMAIL, NODE_ENV } = require('../config/env');

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    if (NODE_ENV === 'development') {
      console.log(`[EmailService DEV] To: ${to} | Subject: ${subject}`);
    }
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[EmailService] Failed to send email:', body);
  }
}

// ── Email templates ────────────────────────────────────────────────────────────

async function sendNewQueryEmail({ queryId, departure, destination, flightDate, passengers }) {
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New Charter Query — ${departure} → ${destination}`,
    html: `
      <h2>New Charter Query Received</h2>
      <p><strong>Query ID:</strong> ${queryId}</p>
      <p><strong>Route:</strong> ${departure} → ${destination}</p>
      <p><strong>Date:</strong> ${flightDate}</p>
      <p><strong>Passengers:</strong> ${passengers}</p>
    `,
  });
}

async function sendBookingConfirmationEmail({ clientEmail, clientName, ref, route, flightDate, aircraft, operatorName, totalAmount }) {
  await sendEmail({
    to: clientEmail,
    subject: `Booking Confirmed — ${ref} | SkyVayu`,
    html: `
      <h2>Your SkyVayu Booking is Confirmed</h2>
      <p>Hi ${clientName},</p>
      <p>Your charter flight has been confirmed. Here are your details:</p>
      <table>
        <tr><td><strong>Booking Ref:</strong></td><td>${ref}</td></tr>
        <tr><td><strong>Route:</strong></td><td>${route}</td></tr>
        <tr><td><strong>Date:</strong></td><td>${flightDate}</td></tr>
        <tr><td><strong>Aircraft:</strong></td><td>${aircraft}</td></tr>
        <tr><td><strong>Operator:</strong></td><td>${operatorName}</td></tr>
        <tr><td><strong>Total Amount:</strong></td><td>₹${Number(totalAmount).toLocaleString('en-IN')}</td></tr>
      </table>
      <p>Thank you for choosing SkyVayu.</p>
    `,
  });
}

/**
 * Sent to the charter desk the moment a booking is paid for.
 *
 * Nothing else told anyone on the SkyVayu side that money had arrived — the
 * confirmation went to the customer alone, so a booking placed overnight sat
 * unseen until somebody happened to open the dashboard. Includes how it was
 * confirmed, because a booking confirmed by the webhook means the customer
 * never saw the success screen and may not realise it went through.
 */
async function sendBookingAlertEmail({ ref, clientName, clientEmail, clientPhone, route, flightDate, aircraft, operatorName, totalAmount, paymentId, paymentMethod, source }) {
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Booking Confirmed — ${ref} · ₹${Number(totalAmount || 0).toLocaleString('en-IN')}`,
    html: `
      <h2>Booking Confirmed</h2>
      <p><strong>${route}</strong> on ${flightDate} — ₹${Number(totalAmount || 0).toLocaleString('en-IN')} received.</p>
      <table>
        <tr><td><strong>Booking Ref:</strong></td><td>${ref}</td></tr>
        <tr><td><strong>Client:</strong></td><td>${clientName}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${clientEmail}</td></tr>
        <tr><td><strong>Phone:</strong></td><td>${clientPhone || '—'}</td></tr>
        <tr><td><strong>Route:</strong></td><td>${route}</td></tr>
        <tr><td><strong>Date:</strong></td><td>${flightDate}</td></tr>
        <tr><td><strong>Aircraft:</strong></td><td>${aircraft}</td></tr>
        <tr><td><strong>Operator:</strong></td><td>${operatorName}</td></tr>
        <tr><td><strong>Amount:</strong></td><td>₹${Number(totalAmount || 0).toLocaleString('en-IN')}</td></tr>
        <tr><td><strong>Payment:</strong></td><td>${paymentId || '—'}${paymentMethod ? ` (${paymentMethod})` : ''}</td></tr>
        <tr><td><strong>Confirmed via:</strong></td><td>${source}</td></tr>
      </table>
      ${source === 'webhook'
        ? '<p><em>Confirmed by the payment webhook — the customer likely closed the tab before the confirmation screen, so they may not know the booking went through. Worth a call.</em></p>'
        : ''}
    `,
  });
}

/**
 * Sent when a refund is issued. Deliberately states the settlement window —
 * the money leaves Razorpay immediately but takes days to appear on the card
 * or account, and "where is my refund" is otherwise the next support ticket.
 */
async function sendRefundEmail({ clientEmail, clientName, ref, route, amount, isPartial, reason }) {
  const label = isPartial ? 'Partial refund' : 'Refund';

  await sendEmail({
    to: clientEmail,
    subject: `${label} Issued — ${ref} | SkyVayu`,
    html: `
      <h2>${label} Issued</h2>
      <p>Hi ${clientName},</p>
      <p>A ${isPartial ? 'partial refund' : 'refund'} has been issued for your booking.</p>
      <table>
        <tr><td><strong>Booking Ref:</strong></td><td>${ref}</td></tr>
        <tr><td><strong>Route:</strong></td><td>${route}</td></tr>
        <tr><td><strong>Refunded:</strong></td><td>₹${Number(amount).toLocaleString('en-IN')}</td></tr>
        ${reason ? `<tr><td><strong>Reason:</strong></td><td>${reason}</td></tr>` : ''}
      </table>
      <p>The amount goes back to the payment method you used. Banks typically take
      5–7 working days to post it, so it may not appear on your statement immediately.</p>
      <p>If you have not seen it after 7 working days, reply to this email with your booking ref.</p>
    `,
  });
}

async function sendQuoteSubmittedEmail({ quoteId, operatorName, route }) {
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New Quote Submitted — ${operatorName}`,
    html: `
      <h2>New Quote Submitted</h2>
      <p><strong>Quote ID:</strong> ${quoteId}</p>
      <p><strong>Operator:</strong> ${operatorName}</p>
      <p><strong>Route:</strong> ${route}</p>
    `,
  });
}

async function sendDocExpiryReminderEmail({ operatorEmail, operatorName, docName, expiryDate }) {
  await sendEmail({
    to: operatorEmail,
    subject: `Document Expiry Reminder — ${docName} | SkyVayu`,
    html: `
      <h2>Document Expiry Reminder</h2>
      <p>Hi ${operatorName},</p>
      <p>Your <strong>${docName}</strong> is expiring on <strong>${expiryDate}</strong>.</p>
      <p>Please upload the renewed document in the operator portal to avoid disruption.</p>
    `,
  });
}

async function sendPasswordResetEmail({ email, resetToken }) {
  await sendEmail({
    to: email,
    subject: 'Password Reset Request — SkyVayu Operator Portal',
    html: `
      <h2>Password Reset</h2>
      <p>A password reset was requested for your SkyVayu operator account.</p>
      <p>Your reset token is: <strong>${resetToken}</strong></p>
      <p>This token expires in 1 hour. If you did not request this, please ignore this email.</p>
    `,
  });
}

module.exports = {
  sendEmail,
  sendNewQueryEmail,
  sendBookingConfirmationEmail,
  sendBookingAlertEmail,
  sendRefundEmail,
  sendQuoteSubmittedEmail,
  sendDocExpiryReminderEmail,
  sendPasswordResetEmail,
};
