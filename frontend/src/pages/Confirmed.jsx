import { useState } from 'react'
import { Link } from 'react-router-dom'
import { generateInvoice } from '../utils/invoice'

const IS_MOCK  = import.meta.env.VITE_MOCK === 'true'
const MOCK_BOOKING = { ref: 'SV-2610-0042', route: 'Mumbai → Goa', aircraft: 'Cessna Citation XLS', operator_name: 'SkyVayu Air', flight_date: '15 October 2026', total_amount: 285000, client_email: 'traveller@example.com' }

const BURG     = '#8a1f2e'
const BURG_LT  = '#b83a50'
const GOLD     = '#c9a96e'
const WINE_BG  = '#160a0d'
const WINE_CARD = '#220d14'

export default function Confirmed() {
  const [booking] = useState(() => { try { const b = JSON.parse(sessionStorage.getItem('sv_booking') || '{}'); return b.ref ? b : (IS_MOCK ? MOCK_BOOKING : {}) } catch { return IS_MOCK ? MOCK_BOOKING : {} } })

  return (
    <div style={{ minHeight: '100vh', background: WINE_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 60px' }}>
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>

        {/* Check ring */}
        <div style={{ width: 72, height: 72, background: 'rgba(138,31,46,0.15)', border: '1px solid rgba(138,31,46,0.35)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: BURG_LT, margin: '0 auto 28px' }}>✓</div>

        {/* Eyebrow */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '3px', textTransform: 'uppercase', color: BURG_LT, marginBottom: 14 }}>Booking Confirmed</div>

        {/* Headline */}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 50, fontWeight: 300, color: 'rgba(255,255,255,0.95)', lineHeight: 1.1, marginBottom: 16 }}>You're all set.</h1>

        {/* Sub */}
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, marginBottom: 36, maxWidth: 400, margin: '0 auto 36px' }}>
          Your charter flight has been confirmed. A confirmation email has been sent to{' '}
          <strong style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{booking.client_email || 'your email'}</strong>.
        </p>

        {/* Booking card */}
        {booking.ref && (
          <div style={{ background: WINE_CARD, border: '1px solid rgba(138,31,46,0.22)', borderRadius: 4, padding: '24px 28px', marginBottom: 28, textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              Booking Summary
            </div>
            {[
              ['Booking Ref', booking.ref, true],
              ['Route',       booking.route || '—', false],
              ['Aircraft',    booking.aircraft || '—', false],
              ['Operator',    booking.operator_name || '—', false],
              ['Date',        booking.flight_date || '—', false],
            ].map(([k, v, isMono]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-b)' }}>{k}</span>
                <span style={{ color: isMono ? BURG_LT : 'rgba(255,255,255,0.9)', fontFamily: isMono ? 'var(--font-mono)' : 'var(--font-b)', fontSize: isMono ? 13 : 14, fontWeight: 500, letterSpacing: isMono ? '1px' : 0 }}>{v}</span>
              </div>
            ))}
            {booking.total_amount && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Total Paid</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: GOLD }}>{'₹' + Number(booking.total_amount).toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '13px 22px', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 2, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>
            Book Another
          </Link>
          {booking.ref && (
            <button onClick={() => generateInvoice(booking)} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '13px 22px', border: `1px solid rgba(138,31,46,0.4)`, borderRadius: 2, color: BURG_LT, background: 'transparent', cursor: 'pointer' }}>
              Download Invoice
            </button>
          )}
          <Link to="/profile" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '13px 22px', background: BURG, color: '#fff', borderRadius: 2, textDecoration: 'none', border: '1px solid transparent' }}>
            View My Bookings
          </Link>
        </div>

      </div>
    </div>
  )
}
