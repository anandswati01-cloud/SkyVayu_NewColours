import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'

const ADMIN_EMAIL = 'anandswati01@gmail.com'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState({ text: '', type: '' })

  async function doLogin() {
    if (!password) { setError('Please enter your password.'); return }
    setLoading(true); setError('')
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password })
      if (authErr) { setError(authErr.message || 'Invalid password.'); return }

      // Check is_admin flag in profiles table
      const { data: profile, error: profileErr } = await supabase
        .from('profiles').select('is_admin').eq('id', data.user.id).single()

      if (profileErr || !profile?.is_admin) {
        await supabase.auth.signOut()
        setError('Access denied. Not an admin account.')
        return
      }

      // Store session token for admin API calls
      localStorage.setItem('sv_admin_token', data.session.access_token)
      localStorage.setItem('sv_admin_user', JSON.stringify({ id: data.user.id, email: data.user.email }))
      navigate('/admin/dashboard')
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally { setLoading(false) }
  }

  async function sendReset() {
    if (!forgotEmail) { setForgotMsg({ text: 'Please enter your email.', type: 'error' }); return }
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo: window.location.origin + '/admin/reset' })
    if (error) setForgotMsg({ text: 'No account found for this email.', type: 'error' })
    else setForgotMsg({ text: 'Reset link sent! Check your inbox.', type: 'success' })
  }

  const s = {
    page: { minHeight: '100vh', background: '#0c1324', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' },
    bg: { position: 'absolute', inset: 0, backgroundImage: "url('/airplane.png')", backgroundSize: 'cover', backgroundPosition: '50% 40%', filter: 'brightness(0.35)', zIndex: 0 },
    overlay: { position: 'absolute', inset: 0, background: 'linear-gradient(rgba(12,19,36,0.5) 0%, rgba(12,19,36,0.65) 55%, #0c1324 100%)', zIndex: 1 },
    box: { background: 'rgba(12,19,36,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '0.5px solid rgba(251,191,36,0.18)', borderRadius: 12, padding: '36px 36px', width: '100%', maxWidth: 380, position: 'relative', zIndex: 2, boxShadow: '0 8px 48px rgba(0,0,0,0.5)' },
    logo: { fontFamily: 'var(--font-display)', fontSize: 26, fontStyle: 'italic', color: 'var(--gold)', textAlign: 'center', marginBottom: 6 },
    tag: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: 28 },
    label: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 7 },
    input: { width: '100%', height: 44, padding: '0 14px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none' },
    btn: { width: '100%', height: 44, background: 'var(--gold)', color: '#0c1324', border: 'none', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', marginTop: 8, transition: 'background 0.2s' },
    err: { background: 'rgba(226,75,74,0.1)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#e24b4a', marginBottom: 16 },
  }

  return (
    <div style={s.page}>
      <div style={s.bg} />
      <div style={s.overlay} />
      <div style={s.box}>
        <div style={s.logo}>SkyVayu</div>
        <div style={s.tag}>Super Admin Panel</div>

        {error && <div style={s.err}>{error}</div>}

        <label style={s.label}>Password</label>
        <div style={{ position: 'relative', marginBottom: 4 }}>
          <input style={{ ...s.input, paddingRight: 44 }} type={showPw ? 'text' : 'password'} placeholder="Enter admin password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} />
          <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 16 }}>{showPw ? '🙈' : '👁'}</button>
        </div>

        <div style={{ textAlign: 'right', marginBottom: 14 }}>
          <button onClick={() => setShowForgot(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Forgot password?</button>
        </div>

        <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} onClick={doLogin} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => { setShowForgot(false); setForgotMsg({ text: '', type: '' }) }}>
          <div style={{ background: 'rgba(22,32,64,0.9)', backdropFilter: 'blur(16px)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '36px 32px', width: '100%', maxWidth: 400, position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowForgot(false)} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 22, cursor: 'pointer' }}>✕</button>
            <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: 20, marginBottom: 6 }}>Reset Password</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 18 }}>Enter your admin email and we'll send a reset link.</p>
            <input style={{ ...s.input, marginBottom: 12 }} type="email" placeholder="Enter your email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
            <button style={{ ...s.btn, marginTop: 0 }} onClick={sendReset}>Send reset link</button>
            {forgotMsg.text && <p style={{ fontSize: 12, marginTop: 8, color: forgotMsg.type === 'error' ? '#f87272' : '#6ee7b7' }}>{forgotMsg.text}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
