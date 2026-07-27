import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { signInWithGoogle, signInAsDevUser } from '../../services/supabase'
import { showToast } from '../ui/Toast'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(2,6,23,0.95)' : 'rgba(2,6,23,0.85)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      height: 72, display: 'flex', alignItems: 'center',
      padding: '0 48px', justifyContent: 'space-between',
      transition: 'background 0.3s',
    }}>
      {/* Logo */}
      <Link to="/" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--gold)', letterSpacing: '-0.5px', textDecoration: 'none' }}>
        SkyVayu
      </Link>

      {/* Desktop Links */}
      <ul style={{ display: 'flex', alignItems: 'center', gap: 40, listStyle: 'none', margin: 0 }}>
        {[['/', 'Home'], ['/fleet', 'Fleet'], ['/about', 'About Us'], ['/operator', 'Operator Login']].map(([to, label]) => (
          <li key={to}>
            <Link to={to} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--white-60)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'var(--gold)'}
              onMouseLeave={e => e.target.style.color = 'var(--white-60)'}>
              {label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user ? (
          <>
            <Link to="/profile" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1px', color: 'var(--gold)', textTransform: 'uppercase', textDecoration: 'none' }}>
              {displayName}
            </Link>
            <Link to="/profile#tab-active" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1px', color: 'var(--white-60)', textTransform: 'uppercase', textDecoration: 'none', borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 8 }}>
              My Bookings
            </Link>
            <button onClick={() => signOut()} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              ✕
            </button>
          </>
        ) : (
          <>
            {import.meta.env.DEV && (
              <button
                onClick={async () => {
                  const { error } = await signInAsDevUser()
                  if (error) showToast(error.message + ' — run: cd backend && npm run dev:user', 'error')
                  else showToast('Signed in as dev user', 'success')
                }}
                title="Local only — email/password login, no Google redirect"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: '#17b0d6', background: 'transparent', border: '1px dashed rgba(23,176,214,0.5)', padding: '8px 14px', borderRadius: 2, cursor: 'pointer' }}>
                Dev Sign In
              </button>
            )}
            <button onClick={signInWithGoogle} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--white-60)', background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', padding: '8px 16px', borderRadius: 2, cursor: 'pointer' }}>
              Sign In
            </button>
          </>
        )}
        <Link to="/#book" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--navy)', background: 'var(--gold)', padding: '10px 20px', borderRadius: 2, textDecoration: 'none', transition: 'background 0.2s' }}
          onMouseEnter={e => e.target.style.background = 'var(--gold-light)'}
          onMouseLeave={e => e.target.style.background = 'var(--gold)'}>
          Get Quotes
        </Link>

        {/* Hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', flexDirection: 'column', justifyContent: 'space-between', width: 24, height: 18, background: 'none', border: 'none', cursor: 'pointer' }}
          className="nav-hamburger">
          <span style={{ display: 'block', width: '100%', height: 2, background: 'var(--white-60)', borderRadius: 2 }} />
          <span style={{ display: 'block', width: '100%', height: 2, background: 'var(--white-60)', borderRadius: 2 }} />
          <span style={{ display: 'block', width: '100%', height: 2, background: 'var(--white-60)', borderRadius: 2 }} />
        </button>
      </div>
    </nav>
  )
}
