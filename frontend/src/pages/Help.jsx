import { useState } from 'react'
import { Link } from 'react-router-dom'
import DocPage, { doc } from '../components/layout/DocPage'
import { feedbackApi } from '../services/api'
import { showToast } from '../components/ui/Toast'

const FAQ = [
  ['Booking', [
    ['How do I request a charter?', 'Enter your route, date, time and passenger count on the home page and submit. Your request reaches every operator that can serve the sector at once.'],
    ['How long until I get quotes?', 'Most requests receive quotations within 60 minutes. The results page shows a live countdown and refreshes on its own — you do not need to reload.'],
    ['Why do I see several prices for the same route?', 'Each quotation comes from a different operator with a different aircraft. Compare the price alongside aircraft type, seating and operator before choosing.'],
    ['What happens after I pay?', 'Your booking is confirmed only after the payment is verified on our servers. You will receive a confirmation email with your booking reference, and can download the invoice from the confirmation page.'],
  ]],
  ['Payments', [
    ['Which payment methods are accepted?', 'Cards, UPI, net banking and wallets, through our payment gateway. The amount charged is always the quoted total shown before checkout.'],
    ['Is GST included in the price?', 'Yes. Every quotation is itemised and GST at 18% is included in the total you see.'],
    ['What if payment is deducted but the booking does not confirm?', 'Do not pay again. Email us with the booking reference shown on screen and we will reconcile it with the gateway.'],
  ]],
  ['Changes and cancellations', [
    ['Can I change my trip after booking?', 'Changes depend on aircraft and crew availability. Contact us as early as possible — the operating carrier decides what is possible.'],
    ['What is the cancellation policy?', 'Cancellation terms are set by the operating carrier and shown with the quotation before you confirm. They vary by aircraft and how close to departure you cancel.'],
  ]],
  ['Safety and operators', [
    ['Are the operators licensed?', 'Every operator holds a valid DGCA Non-Scheduled Operator Permit and is verified before being allowed to quote. Aircraft documents — registration, airworthiness, review certificate and insurance — are checked, and an aircraft with a lapsed document cannot be quoted.'],
    ['Who actually operates my flight?', 'The licensed operator you select. SkyVayu is the marketplace that connects you with them; the operator holds the permit and operational control.'],
  ]],
]

export default function Help() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  function set(key, value) { setForm(f => ({ ...f, [key]: value })) }

 async function submit(e) {
  e.preventDefault();

  if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
    showToast('Please fill in your name, email and message.', 'error');
    return;
  }

  setSending(true);

  try {
    await feedbackApi.contact(form);

    // Success Toast Right Top
    showToast('Your message has been sent successfully.', 'success');

    setSent(true);

    setForm({
      name: '',
      email: '',
      subject: '',
      message: ''
    });

  } catch (err) {

    showToast(
      err.message || 'Could not send your message. Please try again.',
      'error'
    );

  } finally {
    setSending(false);
  }
}

  const input = { background: 'var(--white-10)', border: '1px solid var(--white-10)', borderRadius: 2, padding: '12px 16px', color: 'var(--white)', fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none', width: '100%' }
  const label = { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--white-60)', marginBottom: 8, display: 'block' }

  return (
    <DocPage
      eyebrow="Help Centre"
      title="How can we help?"
      intro="Answers to the questions we are asked most. If yours is not here, the charter desk replies within a few hours."
    >
      {FAQ.map(([section, items]) => (
        <div key={section}>
          <h2 style={doc.h2}>{section}</h2>
          {items.map(([q, a]) => (
            <details key={q} style={{ borderBottom: '1px solid var(--white-10)', padding: '18px 0' }}>
              <summary style={{ fontFamily: 'var(--font-display)', fontSize: 19, cursor: 'pointer', color: 'var(--white)', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                {q}<span style={{ color: 'var(--gold)' }}>+</span>
              </summary>
              <p style={{ ...doc.p, marginTop: 12, marginBottom: 0 }}>{a}</p>
            </details>
          ))}
        </div>
      ))}

      <h2 style={doc.h2}>Still need help?</h2>

      {sent ? (
        <div style={doc.note}>
          <strong style={doc.strong}>Message received.</strong> Our charter desk will reply to {form.email} shortly.
          For anything urgent — a medivac or a same-day departure — call us rather than waiting on email.
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'grid', gap: 18, marginTop: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
            <div>
              <label style={label}>Your Name</label>
              <input style={input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label style={label}>Email</label>
              <input style={input} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" />
            </div>
          </div>
          <div>
            <label style={label}>Subject</label>
            <input style={input} value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Booking reference, or what this is about" />
          </div>
          <div>
            <label style={label}>Message</label>
            <textarea style={{ ...input, minHeight: 140, resize: 'vertical' }} value={form.message} onChange={e => set('message', e.target.value)} placeholder="How can we help?" />
          </div>
          <button type="submit" disabled={sending}
            style={{ justifySelf: 'start', background: sending ? 'rgba(251,191,36,0.5)' : 'var(--gold)', color: 'var(--navy)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '14px 32px', borderRadius: 2, border: 'none', cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
            {sending ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      )}

      <p style={{ ...doc.p, marginTop: 40 }}>
        See also <Link to="/terms" style={{ color: 'var(--gold)' }}>Terms of Service</Link>,{' '}
        <Link to="/privacy" style={{ color: 'var(--gold)' }}>Privacy Policy</Link>, and{' '}
        <Link to="/fleet" style={{ color: 'var(--gold)' }}>the fleet</Link>.
      </p>
    </DocPage>
  )
}
