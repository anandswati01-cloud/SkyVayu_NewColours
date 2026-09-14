import { useState } from 'react'
import { Link } from 'react-router-dom'
import { generateInvoice } from '../utils/invoice'
import logo from '../assets/sv-new-logo.png'

const BURGUNDY = 'oklch(62% 0.20 8)'

export default function Confirmed() {
  const [booking] = useState(() => { try { return JSON.parse(sessionStorage.getItem('sv_booking') || '{}') } catch { return {} } })

  return (
    <div style={{ minHeight: '100vh', background: 'oklch(6% 0.008 10)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 48px' }}>

      {/* Logo unit — top left */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: '20px 40px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={logo} alt="SkyVayu mark" style={{ height: 36, width: 'auto', display: 'block' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-b)', fontSize: 15, fontWeight: 500, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.95)', lineHeight: 1 }}>Sky Vayu</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Private Charter</span>
        </div>
      </div>

      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, background: 'rgba(46,125,82,0.12)', border: '1px solid rgba(46,125,82,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 32px' }}>✓</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: BURGUNDY, marginBottom: 16 }}>Booking Confirmed</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 400, color: 'rgba(255,255,255,0.95)', marginBottom: 16 }}>You're all set!</h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 32 }}>
          Your charter flight has been confirmed. A confirmation email has been sent to <strong style={{ color: 'rgba(255,255,255,0.95)' }}>{booking.client_email || 'your email'}</strong>.
        </p>

        {booking.ref && (
          <div style={{ background: 'oklch(9% 0.012 10)', border: `1px solid oklch(62% 0.20 8 / 0.18)`, borderRadius: 4, padding: '20px 28px', marginBottom: 32, textAlign: 'left' }}>
            {[
              ['Booking Ref', booking.ref],
              ['Route', booking.route || '—'],
              ['Aircraft', booking.aircraft || '—'],
              ['Operator', booking.operator_name || '—'],
              ['Date', booking.flight_date || '—'],
              ['Total', booking.total_amount ? '₹' + Number(booking.total_amount).toLocaleString('en-IN') : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{k}</span>
                <span style={{ color: k === 'Booking Ref' ? BURGUNDY : 'rgba(255,255,255,0.95)', fontFamily: k === 'Booking Ref' ? 'var(--font-mono)' : 'inherit', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '12px 24px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>
            Book Another Flight
          </Link>
          {booking.ref && (
            <button onClick={() => generateInvoice(booking)} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '12px 24px', border: `1px solid oklch(62% 0.20 8 / 0.5)`, borderRadius: 2, color: BURGUNDY, background: 'transparent', cursor: 'pointer' }}>
              Download Invoice
            </button>
          )}
          <Link to="/profile" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '12px 24px', background: BURGUNDY, color: '#fff', borderRadius: 2, textDecoration: 'none' }}>
            View My Bookings
          </Link>
        </div>
      </div>
    </div>
  )
}
