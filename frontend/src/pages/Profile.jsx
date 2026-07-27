import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { bookingApi } from '../services/api'
import { signInWithGoogle } from '../services/supabase'
import { generateInvoice } from '../utils/invoice'

function fmt(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }

export default function Profile() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')

  useEffect(() => {
    if (!user) return
    bookingApi.list().then(res => {
      setBookings(res.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--navy)', paddingTop: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 48 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, marginBottom: 16 }}>Sign in to view your profile</div>
          <p style={{ color: 'var(--white-60)', marginBottom: 32 }}>You need to be signed in to view your bookings and profile.</p>
          <button onClick={signInWithGoogle} style={{ background: 'var(--gold)', color: 'var(--navy)', border: 'none', padding: '14px 28px', borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer' }}>
            Sign In with Google
          </button>
        </div>
      </div>
    )
  }

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const confirmed = bookings.filter(b => b.status === 'confirmed')
  const past = bookings.filter(b => b.status !== 'confirmed')

  const tabStyle = (active) => ({ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', padding: '10px 20px', border: 'none', background: active ? 'rgba(251,191,36,0.1)' : 'transparent', color: active ? 'var(--gold)' : 'var(--white-60)', borderBottom: `2px solid ${active ? 'var(--gold)' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.2s' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', paddingTop: 72 }}>
      {/* Header */}
      <div style={{ background: 'var(--navy-mid)', borderBottom: '1px solid var(--white-10)', padding: '48px 48px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>My Account</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 400, marginBottom: 8 }}>{displayName}</h1>
              <div style={{ fontSize: 14, color: 'var(--white-60)' }}>{user.email}</div>
            </div>
            <button onClick={() => signOut()} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', padding: '10px 20px', border: '1px solid var(--white-10)', borderRadius: 2, background: 'transparent', color: 'var(--white-60)', cursor: 'pointer' }}>Sign Out</button>
          </div>
          <div style={{ display: 'flex', gap: 0 }}>
            <button style={tabStyle(tab === 'active')} onClick={() => setTab('active')}>Active Bookings</button>
            <button style={tabStyle(tab === 'past')} onClick={() => setTab('past')}>Past Bookings</button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 48px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--white-60)', padding: 80 }}>Loading bookings…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(tab === 'active' ? confirmed : past).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 80, color: 'var(--white-60)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✈</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>No bookings yet</div>
                <div style={{ fontSize: 14 }}>Ready to fly? <a href="/" style={{ color: 'var(--gold)' }}>Book a charter flight</a></div>
              </div>
            ) : (tab === 'active' ? confirmed : past).map(b => (
              <div key={b.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--white-10)', borderRadius: 4, padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gold)', letterSpacing: 1 }}>{b.ref}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', background: '#2E7D52', color: '#fff', padding: '3px 8px', borderRadius: 2 }}>{b.status}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 4 }}>{b.route || '—'}</div>
                  <div style={{ fontSize: 13, color: 'var(--white-60)' }}>{b.flight_date || '—'} · {b.aircraft || '—'} · {b.operator_name || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--gold)' }}>{fmt(b.total_amount)}</div>
                  <div style={{ fontSize: 12, color: 'var(--white-30)', marginTop: 4 }}>{b.passengers} Pax</div>
                  <button onClick={() => generateInvoice(b)} style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', padding: '5px 10px', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 2, color: 'var(--gold)', background: 'transparent', cursor: 'pointer' }}>
                    Invoice
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
