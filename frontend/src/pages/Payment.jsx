import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { paymentApi } from '../services/api'
import { showToast } from '../components/ui/Toast'
import useAuthStore from '../store/authStore'

function fmt(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
const BURGUNDY = 'oklch(62% 0.20 8)'

/** Load Razorpay's checkout script once, on demand. */
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(true)

  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(true))
      existing.addEventListener('error', () => resolve(false))
      return
    }
    const script = document.createElement('script')
    script.src = CHECKOUT_SRC
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Payment() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [quote] = useState(() => { try { return JSON.parse(sessionStorage.getItem('sv_selected_quote') || '{}') } catch { return {} } })
  const [query] = useState(() => { try { return JSON.parse(sessionStorage.getItem('sv_query') || '{}') } catch { return {} } })

  const [name, setName] = useState(user?.user_metadata?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!quote.id) { showToast('No quote selected. Please choose a quote first.', 'error'); navigate('/results') }
  }, [])

  const route = query.departure && query.destination ? `${query.departure} → ${query.destination}` : quote.route || '—'
  const price = quote.price || 0

  function validate() {
    const errs = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Valid email required'
    if (!phone.trim() || !/^[\d\s+\-()+]{7,20}$/.test(phone)) errs.phone = 'Valid phone required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function finish(booking) {
    sessionStorage.setItem('sv_booking', JSON.stringify(booking))
    sessionStorage.removeItem('sv_selected_quote')
    sessionStorage.removeItem('sv_query')
    sessionStorage.removeItem('sv_query_id')
    sessionStorage.removeItem('sv_query_start')
    navigate('/confirmed')
  }

  /**
   * Only the quoteId and contact details go up. The server reads the price from
   * the quote, opens the Razorpay order, and confirms the booking only after it
   * has verified the payment — nothing here can change what is charged.
   */
  async function startPayment() {
    if (!validate()) return
    setLoading(true)

    try {
      const order = await paymentApi.createOrder({
        quoteId: quote.id,
        clientName: name,
        clientEmail: email,
        clientPhone: phone,
      })

      const ready = await loadCheckout()
      if (!ready) {
        showToast('Could not reach the payment gateway. Check your connection and try again.', 'error')
        setLoading(false)
        return
      }

      const rzp = new window.Razorpay({
        key: order.data.keyId,
        order_id: order.data.orderId,
        amount: order.data.amount,
        currency: order.data.currency,
        name: 'SkyVayu',
        description: `Charter booking ${order.data.bookingRef}`,
        prefill: { name, email, contact: phone },
        theme: { color: '#8a1f2e' },
        handler: async (response) => {
          try {
            const verified = await paymentApi.verify({
              bookingId: order.data.bookingId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            finish(verified.data)
          } catch (err) {
            // Money may have left the customer's account — never imply it did
            // not. The server-side webhook confirms the booking independently of
            // this callback, so the honest message is "it is in hand", not
            // "it failed": telling them to pay again would double-charge them.
            showToast(
              `Payment received. Confirming your booking is taking longer than usual — ` +
              `you will get an email shortly. Do not pay again. Your reference is ${order.data.bookingRef}.`,
              'info',
            )
            console.error('[payment] verify call failed; relying on webhook', err)
            setLoading(false)
          }
        },
        modal: {
          ondismiss: () => {
            showToast('Payment cancelled. Your quote is still held.', 'info')
            setLoading(false)
          },
        },
      })

      rzp.on('payment.failed', (resp) => {
        showToast(resp?.error?.description || 'Payment failed. Please try another method.', 'error')
        setLoading(false)
      })

      rzp.open()
    } catch (err) {
      showToast(err.message || 'Could not start payment. Please try again.', 'error')
      setLoading(false)
    }
  }

  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 2, padding: '12px 16px', color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--font-b)', fontSize: 15, outline: 'none', width: '100%' }
  const labelStyle = { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 8, display: 'block' }
  const errStyle = { color: '#e05f5f', fontSize: 12, marginTop: 4 }
  const policyLink = { color: 'rgba(255,255,255,0.45)', textDecoration: 'underline' }

  return (
    <div style={{ minHeight: '100vh', background: 'oklch(6% 0.008 10)', display: 'flex', justifyContent: 'center', padding: '100px 48px 48px' }}>
      <div style={{ maxWidth: 900, width: '100%' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>

          {/* Left — details */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: BURGUNDY, marginBottom: 8 }}>Complete Booking</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 400, color: 'rgba(255,255,255,0.95)', marginBottom: 32 }}>Traveller Details</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Your full name"
                  onFocus={e => e.target.style.borderColor = BURGUNDY} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'} />
                {errors.name && <div style={errStyle}>{errors.name}</div>}
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} placeholder="your@email.com"
                  onFocus={e => e.target.style.borderColor = BURGUNDY} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'} />
                {errors.email && <div style={errStyle}>{errors.email}</div>}
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" style={inputStyle} placeholder="+91 98765 43210"
                  onFocus={e => e.target.style.borderColor = BURGUNDY} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'} />
                {errors.phone && <div style={errStyle}>{errors.phone}</div>}
              </div>
            </div>

            <button onClick={startPayment} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: loading ? 'oklch(62% 0.20 8 / 0.5)' : BURGUNDY, color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '16px 32px', borderRadius: 2, cursor: loading ? 'not-allowed' : 'pointer', border: 'none', fontWeight: 500, width: '100%', justifyContent: 'center' }}>
              {loading ? 'Opening payment…' : `Confirm & Pay ${fmt(price)}`}
            </button>
            {/* Linked, not just named. The customer is one click from paying, so
                the cancellation terms have to be reachable from here — and
                Razorpay's review checks for exactly this on a checkout page. */}
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', marginTop: 12, textAlign: 'center', lineHeight: 1.7 }}>
              By confirming, you agree to our <Link to="/terms" style={policyLink}>Terms of Service</Link>,{' '}
              <Link to="/privacy" style={policyLink}>Privacy Policy</Link> and{' '}
              <Link to="/refunds" style={policyLink}>Refund &amp; Cancellation Policy</Link>.
            </p>
          </div>

          {/* Right — summary */}
          <div style={{ background: 'oklch(9% 0.012 10)', border: `1px solid oklch(62% 0.20 8 / 0.18)`, borderRadius: 4, padding: 28, height: 'fit-content', position: 'sticky', top: 100 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: BURGUNDY, marginBottom: 20 }}>Booking Summary</div>
            {[
              ['Route', route],
              ['Aircraft', quote.aircraft_type || '—'],
              ['Operator', quote.operator_name || '—'],
              ['Date', query.flight_date ? `${query.flight_date}${query.flight_time ? ', ' + query.flight_time : ''}` : '—'],
              ['Passengers', query.passengers ? `${query.passengers} Pax` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14 }}>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{k}</span>
                <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>Total</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: BURGUNDY }}>{fmt(price)}</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 8, textAlign: 'right' }}>Inclusive of GST (18%)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
