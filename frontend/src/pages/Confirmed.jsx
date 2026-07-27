import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { generateInvoice } from '../utils/invoice'

export default function Confirmed() {
  const [booking] = useState(() => { try { return JSON.parse(sessionStorage.getItem('sv_booking') || '{}') } catch { return {} } })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', paddingTop: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 48px' }}>
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, background: 'rgba(46,125,82,0.15)', border: '1px solid #2E7D52', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 32px' }}>✓</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#2E7D52', marginBottom: 16 }}>Booking Confirmed</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 400, marginBottom: 16 }}>You're all set!</h1>
        <p style={{ fontSize: 16, color: 'var(--white-60)', lineHeight: 1.7, marginBottom: 32 }}>
          Your charter flight has been confirmed. A confirmation email has been sent to <strong style={{ color: 'var(--white)' }}>{booking.client_email || 'your email'}</strong>.
        </p>

        {booking.ref && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--white-10)', borderRadius: 4, padding: '20px 28px', marginBottom: 32, textAlign: 'left' }}>
            {[
              ['Booking Ref', booking.ref],
              ['Route', booking.route || '—'],
              ['Aircraft', booking.aircraft || '—'],
              ['Operator', booking.operator_name || '—'],
              ['Date', booking.flight_date || '—'],
              ['Total', booking.total_amount ? '₹' + Number(booking.total_amount).toLocaleString('en-IN') : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                <span style={{ color: 'var(--white-60)' }}>{k}</span>
                <span style={{ color: k === 'Booking Ref' ? 'var(--gold)' : 'var(--white)', fontFamily: k === 'Booking Ref' ? 'var(--font-mono)' : 'inherit', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '12px 24px', border: '1px solid var(--white-10)', borderRadius: 2, color: 'var(--white-60)', textDecoration: 'none' }}>
            Book Another Flight
          </Link>
          {booking.ref && (
            <button onClick={() => generateInvoice(booking)} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '12px 24px', border: '1px solid var(--gold)', borderRadius: 2, color: 'var(--gold)', background: 'transparent', cursor: 'pointer' }}>
              Download Invoice
            </button>
          )}
          <Link to="/profile" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '12px 24px', background: 'var(--gold)', color: 'var(--navy)', borderRadius: 2, textDecoration: 'none' }}>
            View My Bookings
          </Link>
        </div>
      </div>
    </div>
  )
}
