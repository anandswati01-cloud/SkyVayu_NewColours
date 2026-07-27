import { useState } from 'react'
import { Link } from 'react-router-dom'
import { feedbackApi } from '../../services/api'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  async function handleNewsletter(e) {
    e.preventDefault()
    if (!email) return
    try {
      await feedbackApi.newsletter(email)
      setSubscribed(true)
      setEmail('')
    } catch {}
  }

  const s = {
    footer: { background: 'var(--navy-mid)', borderTop: '1px solid rgba(251,191,36,0.35)', padding: '64px 48px 32px' },
    grid: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: 48, marginBottom: 48, maxWidth: 1280, marginLeft: 'auto', marginRight: 'auto' },
    logo: { fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 28, color: 'var(--gold)', marginBottom: 16, display: 'block', textDecoration: 'none' },
    tagline: { fontSize: 14, color: 'var(--white-60)', lineHeight: 1.7, marginBottom: 24 },
    heading: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 20 },
    link: { fontSize: 14, color: 'var(--white-60)', textDecoration: 'none', display: 'block', marginBottom: 12, transition: 'color 0.2s' },
    bottom: { borderTop: '1px solid var(--white-10)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1280, margin: '0 auto' },
  }

  return (
    <footer style={s.footer}>
      <div style={s.grid}>
        <div>
          <Link to="/" style={s.logo}>SkyVayu</Link>
          <p style={s.tagline}>Elevating the standards of private aviation through technical precision and elite service.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            {[['https://www.linkedin.com/company/skyvayu', 'in'], ['https://twitter.com/skyvayu', '𝕏'], ['https://www.instagram.com/skyvayu', 'ig']].map(([href, label]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, border: '1px solid var(--white-10)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', color: 'var(--white-60)', textDecoration: 'none' }}>
                {label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <div style={s.heading}>Company</div>
          <Link to="/fleet" style={s.link}>Fleet</Link>
          <Link to="/about" style={s.link}>About Us</Link>
        </div>

        <div>
          <div style={s.heading}>Support</div>
          <Link to="/help" style={s.link}>Help Center</Link>
          <Link to="/privacy" style={s.link}>Privacy Policy</Link>
          <Link to="/terms" style={s.link}>Terms of Service</Link>
          <Link to="/cookies" style={s.link}>Cookie Policy</Link>
        </div>

        <div>
          <div style={s.heading}>Newsletter</div>
          <p style={s.tagline}>Receive curated aviation insights and empty leg alerts.</p>
          {subscribed ? (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gold)' }}>Subscribed! ✓</p>
          ) : (
            <form onSubmit={handleNewsletter} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email address"
                style={{ flex: 1, background: 'var(--white-10)', border: '1px solid var(--white-10)', borderRadius: 2, padding: '10px 14px', color: 'var(--white)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none' }} />
              <button type="submit" style={{ background: 'var(--gold)', color: 'var(--navy)', border: 'none', padding: '10px 16px', borderRadius: 2, cursor: 'pointer', fontSize: 16 }}>→</button>
            </form>
          )}
        </div>
      </div>

      <div style={s.bottom}>
        <div style={{ fontSize: 12, color: 'var(--white-30)' }}>© 2026 SkyVayu Aviation. The Celestial Navigator.</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--white-30)' }}>Global Ops: Mumbai · Delhi · Dubai</div>
      </div>
    </footer>
  )
}
