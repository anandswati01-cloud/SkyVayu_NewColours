/**
 * Membership request page.
 *
 * Reached from the MEMBERSHIP_REQUIRED redirect in Home.jsx. The membership
 * product itself is not defined anywhere in the codebase — no pricing, tiers or
 * benefits exist — so this page deliberately does NOT invent any. It explains
 * the situation and captures the request through the existing contact endpoint.
 * Replace with a real signup flow once the commercial model is decided.
 */

import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DocPage, { doc } from '../components/layout/DocPage'
import { feedbackApi } from '../services/api'
import { showToast } from '../components/ui/Toast'
import useAuthStore from '../store/authStore'

export default function Register() {
  const [params] = useSearchParams()
  const { user } = useAuthStore()
  const gated = params.get('reason') === 'membership_required'

  const [form, setForm] = useState({
    name: user?.user_metadata?.full_name || '',
    email: params.get('email') || user?.email || '',
    phone: '',
    message: '',
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  function set(key, value) { setForm(f => ({ ...f, [key]: value })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      showToast('Please fill in your name, email and phone number.', 'error')
      return
    }
    setSending(true)
    try {
      await feedbackApi.contact({
        name: form.name,
        email: form.email,
        subject: 'Membership request',
        message: `Phone: ${form.phone}\nFlying needs: ${form.message || '—'}`,
      })
      setSent(true)
    } catch (err) {
      showToast(err.message || 'Could not send your request. Please try again.', 'error')
    } finally {
      setSending(false)
    }
  }

  const input = { background: 'var(--white-10)', border: '1px solid var(--white-10)', borderRadius: 2, padding: '12px 16px', color: 'var(--white)', fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none', width: '100%' }
  const label = { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--white-60)', marginBottom: 8, display: 'block' }

  return (
    <DocPage
      eyebrow="Membership"
      title={gated ? 'Let us set up your account' : 'SkyVayu Membership'}
      intro={gated
        ? 'You have used your complimentary charter request. To keep requesting quotations, our team will set up a member account for you — it takes one conversation.'
        : 'For travellers who fly often enough that a booking should take a minute, not a morning.'}
    >
      {sent ? (
        <div style={doc.note}>
          <strong style={doc.strong}>Request received.</strong> Our team will contact you at {form.email} — usually
          the same working day. In the meantime you can{' '}
          <Link to="/fleet" style={{ color: 'var(--gold)' }}>browse the fleet</Link>.
        </div>
      ) : (
        <>
          <h2 style={doc.h2}>What members get</h2>
          <ul style={doc.ul}>
            <li style={doc.li}>Unlimited charter requests, with priority routing to operators</li>
            <li style={doc.li}>A named contact on the charter desk instead of a general queue</li>
            <li style={doc.li}>Saved traveller profiles and routes, so repeat trips take one step</li>
            <li style={doc.li}>Early access to empty-leg availability on your regular sectors</li>
          </ul>
          <p style={doc.p}>
            Membership terms and pricing depend on how much you fly, so we set them per account rather than
            publishing a fixed plan. Tell us a little about your travel and we will come back with the details.
          </p>

          <h2 style={doc.h2}>Request an account</h2>
          <form onSubmit={submit} style={{ display: 'grid', gap: 18, marginTop: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
              <div>
                <label style={label}>Full Name</label>
                <input style={input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your full name" />
              </div>
              <div>
                <label style={label}>Email</label>
                <input style={input} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" />
              </div>
            </div>
            <div>
              <label style={label}>Phone</label>
              <input style={input} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label style={label}>How do you usually fly? (optional)</label>
              <textarea style={{ ...input, minHeight: 120, resize: 'vertical' }} value={form.message}
                onChange={e => set('message', e.target.value)}
                placeholder="Routes you fly often, roughly how many trips a year, typical passenger count" />
            </div>
            <button type="submit" disabled={sending}
              style={{ justifySelf: 'start', background: sending ? 'rgba(251,191,36,0.5)' : 'var(--gold)', color: 'var(--navy)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '14px 32px', borderRadius: 2, border: 'none', cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
              {sending ? 'Sending…' : 'Request Membership'}
            </button>
          </form>

          <p style={{ ...doc.p, marginTop: 32 }}>
            Not what you were looking for? The <Link to="/help" style={{ color: 'var(--gold)' }}>Help Centre</Link>{' '}
            covers booking, payments and cancellations.
          </p>
        </>
      )}
    </DocPage>
  )
}
