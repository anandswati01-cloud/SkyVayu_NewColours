import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { signInWithGoogle, signInAsDevUser } from '../../services/supabase'
import { showToast } from '../ui/Toast'
import OperatorLoginForm from '../../pages/operator/OperatorLoginForm'
import logo from '../../assets/sv-new-logo.png'
import './layout.css'

// The header mirrors the previous charter site. These three are plain
// destinations, each a real page — deliberately NOT scroll targets, because an
// earlier version mapped these labels onto home-page section ids and left
// "Home" pointing at an id that does not exist.
//
// "Operator Login" is not in this list on purpose: it opens the sign-in card in
// a modal over whatever page you are on, rather than navigating away, and it is
// only offered on the home page (see isHome below). The /operator route still
// exists and still works for anyone who bookmarked it, and the footer links to
// it from every page.
const LINKS = [
  ['/', 'Home'],
  ['/fleet', 'Fleet'],
  ['/about', 'About Us'],
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [operatorOpen, setOperatorOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, signOut } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile panel whenever the route changes, otherwise it stays open
  // over the new page.
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Escape closes the operator modal. Bound only while it is open so the
  // listener is not sitting on every page for the whole session.
  useEffect(() => {
    if (!operatorOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setOperatorOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [operatorOpen])

  // Operator Login is offered on the home page only; inner pages keep one
  // unambiguous action instead. It does not become unreachable — the footer
  // links /operator from every page.
  const isHome = location.pathname === '/'

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''
  // The name is the link to the profile, so it comes down on the profile itself
  // — the page already opens with "Welcome {name}", and a link to the page you
  // are standing on is not navigation.
  const isProfile = location.pathname === '/profile'

  // A signed-in customer is not an operator, so the operator entry point comes
  // down once they have a session rather than sitting beside their own name.
  const showOperatorLogin = isHome && !user

  return (
    <>
      <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav__i">
          <Link to="/" className="nav__logo" aria-label="SkyVayu — home">
            <img src={logo} alt="SkyVayu mark" />
            <div className="nav__wordmark">
              <span className="nav__brand">Sky Vayu</span>
            </div>
          </Link>

          <ul className="nav__links">
            {LINKS.map(([to, label]) => (
              <li key={to}>
                {/* `end` matters most for "/" — without it the home link would
                    match every route and stay underlined everywhere. */}
                <NavLink to={to} end className={({ isActive }) => (isActive ? 'active' : undefined)}>
                  {label}
                </NavLink>
              </li>
            ))}
            {/* Member Access sits in the links row, straight after "About Us".
                It is a sign-in action rather than a destination, so it is a
                plain <a> — never a NavLink — and can never be marked active. */}
            {!user && (
              <li><a onClick={signInWithGoogle}>Member Access</a></li>
            )}
          </ul>

          <div className="nav__r">
            {user ? (
              <div className="nav__user">
                {!isProfile && <Link to="/profile" className="nav__si">{displayName}</Link>}
                <button className="nav__si" onClick={() => signOut()}>Sign out</button>
              </div>
            ) : (
              import.meta.env.DEV && (
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
              )
            )}
            {showOperatorLogin && (
              <button className="nav__op" onClick={() => setOperatorOpen(true)}>Operator Login</button>
            )}
            <button className="nav__burger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="nav__panel">
          {/* Same destinations, in the same order, as the desktop bar. The panel
              used to render these twice — once as scroll buttons, once as links
              — which showed Fleet, About Us and Operator Login as duplicate rows
              that behaved differently. Closing on click is explicit because
              tapping "Home" from the home page leaves the path unchanged, so the
              effect that watches location.pathname never fires. */}
          {LINKS.map(([to, label]) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)}>{label}</Link>
          ))}
          {!user && <button onClick={signInWithGoogle}>Member Access</button>}
          {showOperatorLogin && (
            <button className="nav__op" onClick={() => { setMenuOpen(false); setOperatorOpen(true) }}>Operator Login</button>
          )}
        </div>
      )}

      {/* Operator sign-in, opened over the current page instead of routing to
          /operator. The card and its own forgot-password / registration dialogs
          come from OperatorLoginForm, which the /operator page also renders —
          one implementation, two entry points. Its inner dialogs sit at a higher
          z-index than this backdrop so they stack on top rather than behind. */}
      {operatorOpen && (
        <div
          onClick={() => setOperatorOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24, overflowY: 'auto' }}>
          <div
            onClick={e => e.stopPropagation()}
            /* Same base colour the /operator page sits on, so the card's
               translucent surface reads identically in both places. */
            style={{ position: 'relative', width: '100%', maxWidth: 400, margin: 'auto', background: '#0a0f1e', borderRadius: 8 }}>
            <button
              onClick={() => setOperatorOpen(false)}
              aria-label="Close operator login"
              style={{ position: 'absolute', top: -34, right: 0, background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>
              ✕
            </button>
            <OperatorLoginForm onSuccess={() => setOperatorOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
