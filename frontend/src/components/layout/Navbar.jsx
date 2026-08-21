import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { signInWithGoogle, signInAsDevUser } from '../../services/supabase'
import { showToast } from '../ui/Toast'
import useSectionNav from './useSectionNav'
import logo from '../../assets/skyvayu-logo.png'
import './layout.css'

const SECTIONS = [
  ['fleet', 'Aircraft'],
  ['about', 'The Process'],
  ['destinations', 'Routes'],
  ['booking', 'Charter'],
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, signOut } = useAuthStore()
  const location = useLocation()
  const jumpTo = useSectionNav()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile panel whenever the route changes, otherwise it stays open
  // over the new page.
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  function goToSection(id) {
    setMenuOpen(false)
    jumpTo(id)
  }

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  return (
    <>
      <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav__i">
          <Link to="/" className="nav__logo" aria-label="SkyVayu — home">
            <img src={logo} alt="SkyVayu" />
          </Link>

          <ul className="nav__links">
            {SECTIONS.map(([id, label]) => (
              <li key={id}><a onClick={() => goToSection(id)}>{label}</a></li>
            ))}
          </ul>

          <div className="nav__r">
            {user ? (
              <div className="nav__user">
                <Link to="/profile" className="nav__si">{displayName}</Link>
                <Link to="/profile#tab-active" className="nav__si">My Bookings</Link>
                <button className="nav__si" onClick={() => signOut()}>Sign out</button>
              </div>
            ) : (
              <>
                {import.meta.env.DEV && (
                  <button
                    className="nav__dev"
                    title="Local only — email/password login, no Google redirect"
                    onClick={async () => {
                      const { error } = await signInAsDevUser()
                      if (error) showToast(error.message + ' — run: cd backend && npm run dev:user', 'error')
                      else showToast('Signed in as dev user', 'success')
                    }}>
                    Dev Sign In
                  </button>
                )}
                <button className="nav__si" onClick={signInWithGoogle}>Member Access</button>
              </>
            )}
            <a className="nav__cta" onClick={() => goToSection('booking')}>Request a Charter</a>
            <button className="nav__burger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="nav__panel">
          {SECTIONS.map(([id, label]) => (
            <button key={id} onClick={() => goToSection(id)}>{label}</button>
          ))}
          <Link to="/fleet">Fleet</Link>
          <Link to="/about">About Us</Link>
          <Link to="/operator">Operator Login</Link>
          {user
            ? <Link to="/profile">My Bookings</Link>
            : <button onClick={signInWithGoogle}>Member Access</button>}
        </div>
      )}
    </>
  )
}
