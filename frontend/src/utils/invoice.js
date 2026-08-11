/**
 * SkyVayu Invoice Generator
 * Generates a styled HTML invoice and triggers browser print-to-PDF.
 * No external library needed.
 *
 * The supplier block (legal name, address, GSTIN, place of supply) comes from
 * config rather than being hardcoded, and each line disappears when unset — an
 * invoice with a blank GSTIN label is worse than one without the line. Fill
 * VITE_COMPANY_* before taking live payments: a supplier charging 18% GST has
 * to show its GSTIN on the document.
 */

import { config } from '../config/env'

/**
 * Booking fields are customer-supplied and land in an HTML document, so they are
 * escaped rather than interpolated raw. A client name containing a tag would
 * otherwise execute in the invoice window.
 */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function generateInvoice(booking) {
  const {
    ref, client_name, client_email, client_phone,
    operator_name, aircraft, route, flight_date,
    passengers, total_amount, platform_fee, created_at,
    payment_id, paid_at, payment_method, status,
    refund_amount,
  } = booking

  const invoiceDate = new Date(paid_at || created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  const total = Number(total_amount || 0)
  const gst = Math.round(total - total / 1.18)
  const baseAmount = total - gst
  const refunded = Number(refund_amount || 0)

  // Not every booking is a clean "Confirmed" — a refunded one must not print a
  // document claiming the customer still owes or holds the full amount.
  const stateLabel = status === 'refunded' ? 'Refunded'
    : status === 'partially_refunded' ? 'Partially refunded'
      : status === 'cancelled' ? 'Cancelled'
        : 'Confirmed'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>SkyVayu Invoice — ${ref}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', -apple-system, sans-serif; background: #fff; color: #1a1a2e; font-size: 14px; line-height: 1.6; }
    .page { max-width: 800px; margin: 0 auto; padding: 48px 56px; }
    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 2px solid #0c1324; }
    .brand { font-family: Georgia, serif; font-style: italic; font-size: 36px; color: #0c1324; letter-spacing: -1px; }
    .brand-sub { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #666; margin-top: 4px; }
    .invoice-meta { text-align: right; }
    .invoice-title { font-size: 28px; font-weight: 700; color: #0c1324; letter-spacing: -0.5px; }
    .invoice-ref { font-family: monospace; font-size: 16px; color: #fbbf24; background: #0c1324; padding: 4px 12px; border-radius: 4px; margin-top: 6px; display: inline-block; }
    .invoice-date { font-size: 12px; color: #666; margin-top: 6px; }
    /* Parties */
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
    .party-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #999; margin-bottom: 8px; font-weight: 600; }
    .party-name { font-size: 16px; font-weight: 600; color: #0c1324; margin-bottom: 4px; }
    .party-detail { font-size: 13px; color: #555; }
    /* Flight details */
    .section-title { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #999; font-weight: 600; margin-bottom: 12px; }
    .details-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 40px; }
    .detail-cell { padding: 16px 20px; border-right: 1px solid #e5e7eb; }
    .detail-cell:last-child { border-right: none; }
    .detail-cell:nth-child(n+4) { border-top: 1px solid #e5e7eb; }
    .detail-key { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #999; margin-bottom: 4px; }
    .detail-val { font-size: 14px; font-weight: 500; color: #0c1324; }
    /* Amount table */
    .amount-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    .amount-table th { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #999; padding: 8px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .amount-table td { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; color: #374151; }
    .amount-table tr.total td { font-size: 16px; font-weight: 700; color: #0c1324; border-top: 2px solid #0c1324; border-bottom: none; padding-top: 16px; }
    .amount-table td.right, .amount-table th.right { text-align: right; }
    /* Footer */
    .footer { border-top: 1px solid #e5e7eb; padding-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-note { font-size: 12px; color: #999; max-width: 400px; line-height: 1.5; }
    .footer-brand { font-family: Georgia, serif; font-style: italic; font-size: 22px; color: #0c1324; }
    /* Status badge */
    .status { display: inline-block; background: #d1fae5; color: #065f46; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 24px 32px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="brand">SkyVayu</div>
        <div class="brand-sub">Private Charter Aviation</div>
        <div style="margin-top: 12px; font-size: 12px; color: #666;">
          ${config.COMPANY_LEGAL_NAME ? `${esc(config.COMPANY_LEGAL_NAME)}<br/>` : ''}
          ${config.COMPANY_ADDRESS ? `${esc(config.COMPANY_ADDRESS)}<br/>` : 'Mumbai · Delhi · Dubai<br/>'}
          support@skyvayu.com · www.skyvayu.com
          ${config.COMPANY_GSTIN ? `<br/><strong>GSTIN: ${esc(config.COMPANY_GSTIN)}</strong>` : ''}
          ${config.COMPANY_STATE ? `<br/>Place of supply: ${esc(config.COMPANY_STATE)}` : ''}
        </div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">${config.COMPANY_GSTIN ? 'TAX INVOICE' : 'INVOICE'}</div>
        <div class="invoice-ref">${esc(ref)}</div>
        <div class="invoice-date">Date: ${invoiceDate}</div>
        <div style="margin-top: 8px;"><span class="status">${stateLabel}</span></div>
      </div>
    </div>

    <!-- Parties -->
    <div class="parties">
      <div>
        <div class="party-label">Bill To</div>
        <div class="party-name">${esc(client_name) || '—'}</div>
        <div class="party-detail">${esc(client_email)}</div>
        <div class="party-detail">${esc(client_phone)}</div>
      </div>
      <div>
        <div class="party-label">Operator</div>
        <div class="party-name">${esc(operator_name) || '—'}</div>
        <div class="party-detail">Aircraft: ${esc(aircraft) || '—'}</div>
        <div class="party-detail">DGCA Licensed Operator</div>
      </div>
    </div>

    <!-- Flight Details -->
    <div class="section-title">Flight Details</div>
    <div class="details-grid">
      <div class="detail-cell">
        <div class="detail-key">Route</div>
        <div class="detail-val">${esc(route) || '—'}</div>
      </div>
      <div class="detail-cell">
        <div class="detail-key">Date</div>
        <div class="detail-val">${esc(flight_date) || '—'}</div>
      </div>
      <div class="detail-cell">
        <div class="detail-key">Passengers</div>
        <div class="detail-val">${esc(passengers) || '—'}</div>
      </div>
      <div class="detail-cell">
        <div class="detail-key">Aircraft</div>
        <div class="detail-val">${esc(aircraft) || '—'}</div>
      </div>
      <div class="detail-cell">
        <div class="detail-key">Booking Ref</div>
        <div class="detail-val" style="font-family: monospace;">${esc(ref)}</div>
      </div>
      <div class="detail-cell">
        <div class="detail-key">Status</div>
        <div class="detail-val" style="color: #065f46;">${stateLabel}</div>
      </div>
    </div>

    <!-- Payment reference — what ties this document to the money that moved -->
    ${payment_id ? `
    <div class="section-title">Payment</div>
    <div class="details-grid">
      <div class="detail-cell">
        <div class="detail-key">Transaction ID</div>
        <div class="detail-val" style="font-family: monospace; font-size: 12px;">${esc(payment_id)}</div>
      </div>
      <div class="detail-cell">
        <div class="detail-key">Method</div>
        <div class="detail-val" style="text-transform: capitalize;">${esc(payment_method) || 'Online'}</div>
      </div>
      <div class="detail-cell">
        <div class="detail-key">Paid On</div>
        <div class="detail-val">${paid_at ? new Date(paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
      </div>
    </div>` : ''}

    <!-- Amount Breakdown -->
    <div class="section-title">Amount Breakdown</div>
    <table class="amount-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Charter flight — ${esc(route) || '—'}<br/><span style="font-size:12px;color:#999;">${esc(aircraft)} · ${esc(passengers)} passenger${passengers !== 1 ? 's' : ''}</span></td>
          <td class="right">₹${baseAmount.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>GST (18%)</td>
          <td class="right">₹${gst.toLocaleString('en-IN')}</td>
        </tr>
        ${platform_fee ? `<tr><td>Platform fee</td><td class="right">₹${Number(platform_fee).toLocaleString('en-IN')}</td></tr>` : ''}
        <tr class="total">
          <td><strong>Total Amount</strong></td>
          <td class="right"><strong>₹${total.toLocaleString('en-IN')}</strong></td>
        </tr>
        ${refunded > 0 ? `
        <tr>
          <td style="color:#b45309;">Less: refunded</td>
          <td class="right" style="color:#b45309;">− ₹${refunded.toLocaleString('en-IN')}</td>
        </tr>
        <tr class="total">
          <td><strong>Net Amount Retained</strong></td>
          <td class="right"><strong>₹${(total - refunded).toLocaleString('en-IN')}</strong></td>
        </tr>` : ''}
      </tbody>
    </table>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-note">
        This is a computer-generated invoice and does not require a physical signature.<br/>
        For support, contact support@skyvayu.com<br/>
        All charter operations are subject to DGCA regulations.
      </div>
      <div class="footer-brand">SkyVayu</div>
    </div>
  </div>
</body>
</html>`

  // Open in new tab and trigger print
  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.onload = () => {
    win.focus()
    win.print()
  }
}
