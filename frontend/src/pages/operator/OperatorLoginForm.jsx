import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useOperatorStore from '../../store/operatorStore'
import { operatorApi, authApi } from '../../services/api'
import logo from '../../assets/skyvayu-wordmark.png'

/* The operator sign-in card, shared by two callers:
 *
 *   • /operator          — the full-screen page (OperatorLogin.jsx)
 *   • the site header    — opens this in a modal without leaving the page
 *
 * It lives in its own file so those two cannot drift apart. Previously the form
 * only existed inside the page component, so putting it in the header would have
 * meant a second copy of the login, forgot-password and registration logic.
 *
 * `onSuccess` runs after a successful sign-in, before the redirect — the modal
 * uses it to close itself.
 */

const BURGUNDY = 'oklch(64% 0.22 18)'
const BURGUNDY_LT = 'oklch(72% 0.20 18)'
const BG = 'oklch(6% 0.008 10)'

const s = {
  box: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '40px 40px', width: '100%', maxWidth: 400 },
  logo: { textAlign: 'center', marginBottom: 32 },
  mark: { height: 25, width: 'auto', display: 'block', margin: '0 auto' },
  sub: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginTop: 6 },
  title: { fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 400, marginBottom: 6, textAlign: 'center' },
  desc: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 28 },
  label: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8, display: 'block' },
  input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '11px 14px', color: '#fff', fontFamily: 'var(--font-b)', fontSize: 14, outline: 'none', marginBottom: 20 },
  btn: { width: '100%', background: BURGUNDY, color: '#fff', border: 'none', borderRadius: 4, padding: '13px', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, marginTop: 4 },
  err: { background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: '#e24b4a', marginBottom: 20 },
  link: { background: 'none', border: 'none', color: BURGUNDY_LT, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0 },
}

export default function OperatorLoginForm({ onSuccess }) {
  const navigate = useNavigate()
  const login = useOperatorStore(st => st.login)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showReg, setShowReg] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  async function doLogin() {
    if (!username || !password) { setError('Please enter username and password.'); return }
    setLoading(true); setError('')
    try {
      await login(username, password)
      onSuccess?.()
      navigate('/operator/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid username or password.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <div style={s.box}>
        <div style={s.logo}>
          <img src={logo} alt="SkyVayu" style={s.mark} />
          <div style={s.sub}>Operator Portal</div>
        </div>

        <div style={s.title}>Operator Portal</div>
        <div style={s.desc}>Sign in to manage your queries and quotes</div>

        {error && <div style={s.err}>{error}</div>}

        <label style={s.label}>Username or Email</label>
        <input style={s.input} type="text" placeholder="Enter your username or email" value={username} onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doLogin()}
          onFocus={e => e.target.style.borderColor = BURGUNDY} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />

        <label style={s.label}>Password</label>
        <div style={{ position: 'relative', marginBottom: 4 }}>
          <input style={{ ...s.input, marginBottom: 0, paddingRight: 44 }} type={showPw ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            onFocus={e => e.target.style.borderColor = BURGUNDY} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: 11, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16 }}>
            {showPw ? '🙈' : '👁'}
          </button>
        </div>

        <div style={{ textAlign: 'right', marginBottom: 20 }}>
          <button style={s.link} onClick={() => setShowForgot(true)}>Forgot password?</button>
        </div>

        <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} onClick={doLogin} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button onClick={() => setShowReg(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
            New operator? <span style={{ color: BURGUNDY_LT, textDecoration: 'underline' }}>Register your company</span>
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div onClick={() => setShowForgot(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }}>
          <div style={{ position: 'relative', width: '400px', background: 'oklch(9% 0.012 10)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '30px' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowForgot(false)}
              style={{ position: 'absolute', top: 12, right: 15, background: 'transparent', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>
              ✕
            </button>
            <div style={{ ...s.title, marginBottom: 8 }}>Reset Password</div>
            <div style={s.desc}>Enter your registered email and we'll send a reset link.</div>
            {forgotSent ? (
              <div style={{ color: '#4caf50', textAlign: 'center', padding: '20px 0' }}>✓ Reset link sent! Check your email.</div>
            ) : (
              <>
                <label style={s.label}>Email Address</label>
                <input style={s.input} type="email" placeholder="your@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
                <button style={s.btn} onClick={async () => {
                  try { await authApi.forgotPassword(forgotEmail); setForgotSent(true) } catch { /* silent — matches previous behaviour */ }
                }}>Send Reset Link</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showReg && <RegisterModal onClose={() => setShowReg(false)} />}
    </>
  )
}

function RegisterModal({ onClose }) {
  const [form, setForm] = useState({ companyName: '', ownerFullName: '', email: '', phone: '', address: '', ownerUsername: '', ownerPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const update = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit() {
    const { companyName, ownerFullName, email, phone, address, ownerUsername, ownerPassword } = form
    if (!companyName || !ownerFullName || !email || !phone || !ownerUsername || !ownerPassword) {
      setError('Please fill in all fields.'); return
    }
    if (ownerPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true); setError('')
    try {
      await operatorApi.register({ companyName, ownerFullName, email, phone, address, ownerUsername, ownerPassword })
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally { setLoading(false) }
  }

  const s2 = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, overflowY: 'auto', padding: 24 },
    modal: { background: 'oklch(9% 0.012 10)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '32px', width: '100%', maxWidth: 480, margin: 'auto' },
    hdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    inp: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '11px 14px', color: '#fff', fontFamily: 'var(--font-b)', fontSize: 14, outline: 'none', marginBottom: 16 },
  }

  return (
    <div style={s2.overlay} onClick={onClose}>
      <div style={s2.modal} onClick={e => e.stopPropagation()}>
        <div style={s2.hdr}>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: 20 }}>Register your company</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 22, color: BURGUNDY, marginBottom: 12 }}>Registration submitted</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 24 }}>Your registration is under review. You will be able to log in once approved by SkyVayu.</div>
            <button onClick={onClose} style={{ background: BURGUNDY, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>Back to Login</button>
          </div>
        ) : (
          <>
            {error && <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: '#e24b4a', marginBottom: 16 }}>{error}</div>}
            {[
              ['Company Name', 'companyName', 'text', 'e.g. Club One Air Pvt Ltd'],
              ['Owner / Director Name', 'ownerFullName', 'text', 'Full name'],
              ['Email', 'email', 'email', 'company@example.com'],
              ['Phone', 'phone', 'tel', '+91 98765 43210'],
              ['Address', 'address', 'text', 'Fill the address'],
              ['Username', 'ownerUsername', 'text', 'Used to log in'],
              ['Password', 'ownerPassword', 'password', 'Min 8 characters'],
            ].map(([label, key, type, placeholder]) => (
              <div key={key}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{label}</div>
                <input style={s2.inp} type={type} placeholder={placeholder} value={form[key]} onChange={(e) => {
                  update(key)(e)
                  if (key === 'ownerPassword') {
                    if (e.target.value.length > 0 && e.target.value.length < 8) {
                      setError('Password must be at least 8 characters long.')
                    } else {
                      setError('')
                    }
                  }
                }} />
              </div>
            ))}
            <button onClick={submit} disabled={loading} style={{ width: '100%', background: BURGUNDY, color: '#fff', border: 'none', borderRadius: 4, padding: 13, fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, opacity: loading ? 0.6 : 1, marginTop: 4 }}>
              {loading ? 'Submitting…' : 'Submit application'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
