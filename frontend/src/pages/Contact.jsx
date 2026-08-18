/**
 * Contact Us.
 *
 * Two jobs. The obvious one is letting customers reach the charter desk. The
 * other is that Razorpay's activation review requires a reachable contact page
 * carrying a real registered address and phone number — a form alone does not
 * satisfy it. The [BRACKETED] values below must be filled with the registered
 * entity's real details before going live.
 *
 * The form posts to the same /api/feedback/contact endpoint the admin dashboard
 * reads under Feedback → Contact Messages.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import DocPage, { doc } from '../components/layout/DocPage'
import { feedbackApi } from '../services/api'
import { showToast } from '../components/ui/Toast'

const CHANNELS = [
  ['Charter desk', 'For quotations, changes and anything about a flight in progress.', 'charter@skyvayu.com', '[+91 XXXXX XXXXX]'],
  ['Support', 'Bookings, refunds, invoices and account questions.', 'support@skyvayu.com', '[+91 XXXXX XXXXX]'],
  ['Operators', 'Aircraft operators applying to join the platform.', 'operators@skyvayu.com', null],
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Valid email required'
    if (form.message.trim().length < 10) errs.message = 'Please give us a little more detail'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function submit(e) {
    e.preventDefault()
    if (!validate() || sending) return

    setSending(true)
    try {
      await feedbackApi.contact({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim() || null,
        message: form.message.trim(),
      })
      setSent(true)
    } catch (err) {
      // Never claim a message was sent when it was not — the customer would
      // wait for a reply that is never coming.
      showToast(err.message || 'Could not send your message. Please email us directly.', 'error')
    } finally {
      setSending(false)
    }
  }

  const label = { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--white-60)', marginBottom: 8, display: 'block' }
  const field = { background: 'var(--white-10)', border: '1px solid var(--white-10)', borderRadius: 2, padding: '12px 16px', color: 'var(--white)', fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none', width: '100%' }
  const errStyle = { color: '#e05f5f', fontSize: 12, marginTop: 4 }

  return (
    <DocPage
      eyebrow="Get in touch"
      title="Contact Us"
      intro="The charter desk is staffed around the clock. For anything time-critical about a flight, call rather than email."
    >
      <h2 style={doc.h2}>How to reach us</h2>
      <div style={{ display: 'grid', gap: 12, margin: '20px 0 8px' }}>
        {CHANNELS.map(([name, purpose, email, phone]) => (
          <div key={name} style={{ border: '1px solid var(--white-10)', borderRadius: 4, padding: '18px 22px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>{name}</div>
            <p style={{ ...doc.p, marginBottom: 10 }}>{purpose}</p>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14 }}>
              <a href={`mailto:${email}`} style={{ color: 'var(--gold)', textDecoration: 'none' }}>{email}</a>
              {phone && <span style={{ color: 'var(--white-60)' }}>{phone}</span>}
            </div>
          </div>
        ))}
      </div>

      <h2 style={doc.h2}>Registered office</h2>
      <p style={doc.p}>
        <strong style={doc.strong}>SPANPRO Project Management Private Limited</strong><br />
        Ground Floor, A-31, Sector 4<br />
        Noida, Gautam Buddha Nagar, Uttar Pradesh — 201301<br />
        India
      </p>
      <p style={doc.p}>
        GSTIN: <strong style={doc.strong}>09ABHCS1988C1Z2</strong> · CIN: <strong style={doc.strong}>[CIN]</strong>
      </p>
      <p style={doc.p}>
        Operations desks: Mumbai · Delhi · Dubai. Office visits are by appointment only — please write first.
      </p>

      <h2 style={doc.h2}>Send us a message</h2>
      {sent ? (
        <div style={doc.note}>
          <strong style={doc.strong}>Message received.</strong> We reply to everything within one working day, and
          within the hour for anything about a flight departing in the next 24 hours. If it is urgent, call the
          charter desk rather than waiting on email.
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20, margin: '20px 0 8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            <div>
              <label style={label} htmlFor="contact-name">Your name</label>
              <input id="contact-name" value={form.name} onChange={e => set('name', e.target.value)} style={field} placeholder="Full name" />
              {errors.name && <div style={errStyle}>{errors.name}</div>}
            </div>
            <div>
              <label style={label} htmlFor="contact-email">Email address</label>
              <input id="contact-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} style={field} placeholder="your@email.com" />
              {errors.email && <div style={errStyle}>{errors.email}</div>}
            </div>
          </div>

          <div>
            <label style={label} htmlFor="contact-subject">Subject <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input id="contact-subject" value={form.subject} onChange={e => set('subject', e.target.value)} style={field} placeholder="Booking reference, or what this is about" />
          </div>

          <div>
            <label style={label} htmlFor="contact-message">Message</label>
            <textarea id="contact-message" value={form.message} onChange={e => set('message', e.target.value)} rows={6}
              style={{ ...field, resize: 'vertical', lineHeight: 1.7 }} placeholder="Tell us what you need." />
            {errors.message && <div style={errStyle}>{errors.message}</div>}
          </div>

          <button type="submit" disabled={sending}
            style={{ background: sending ? 'rgba(251,191,36,0.5)' : 'var(--gold)', color: 'var(--navy)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '16px 32px', borderRadius: 2, cursor: sending ? 'not-allowed' : 'pointer', border: 'none', fontWeight: 500, alignSelf: 'flex-start' }}>
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </form>
      )}

      <p style={{ ...doc.p, marginTop: 40 }}>
        Looking for something specific? <Link to="/help" style={{ color: 'var(--gold)' }}>Help Centre</Link> ·{' '}
        <Link to="/refunds" style={{ color: 'var(--gold)' }}>Refund & Cancellation Policy</Link> ·{' '}
        <Link to="/terms" style={{ color: 'var(--gold)' }}>Terms of Service</Link>
      </p>
    </DocPage>
  )
}
