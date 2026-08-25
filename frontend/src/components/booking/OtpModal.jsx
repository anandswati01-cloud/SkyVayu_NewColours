import { useState, useEffect, useRef } from 'react'
import { otpApi } from '../../services/api'
import './OtpModal.css'

/* Mobile verification, shown when the charter form is submitted.
 *
 * Two steps in one dialog: enter a number, then enter the code sent to it. The
 * caller gets the signed token back through onVerified and passes it to
 * /api/queries, which reads the phone number out of the token rather than the
 * form — so the number on the request is one the customer proved they hold.
 *
 * Deliberately NOT dismissible by clicking the backdrop. Losing a half-finished
 * verification to a stray click means starting over and burning another SMS.
 * The ✕ and Escape both still close it.
 */

export const PHONE_TOKEN_KEY = 'sv_phone_token'

export default function OtpModal({ open, onClose, onVerified }) {
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [masked, setMasked] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const phoneRef = useRef(null)
  const codeRef = useRef(null)

  // Reset on each open, otherwise the previous attempt's code and error are
  // still on screen the next time the form is submitted.
  useEffect(() => {
    if (!open) return
    setStep('phone'); setCode(''); setError(''); setLoading(false); setCooldown(0)
    const t = setTimeout(() => phoneRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus()
  }, [step])

  // Resend countdown.
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function sendCode() {
    if (loading) return
    setError(''); setLoading(true)
    try {
      const res = await otpApi.send(phone)
      setMasked(res.data.phone)
      setCooldown(res.data.resendInSeconds || 60)
      setStep('code')
    } catch (err) {
      setError(err.message || 'Could not send the code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode() {
    if (loading) return
    setError(''); setLoading(true)
    try {
      const res = await otpApi.verify(phone, code)
      // Stored so a returning customer is not asked again for the next 30 days.
      // localStorage rather than sessionStorage precisely so it outlives the tab.
      try { localStorage.setItem(PHONE_TOKEN_KEY, res.data.phoneToken) } catch { /* private mode */ }
      onVerified(res.data.phoneToken, res.data.phone)
    } catch (err) {
      setError(err.message || 'Could not verify that code.')
      setCode('')
      codeRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="otp__backdrop">
      <div className="otp" role="dialog" aria-modal="true" aria-labelledby="otp-title">
        <button className="otp__x" onClick={onClose} aria-label="Close">✕</button>

        {step === 'phone' ? (
          <>
            <div className="otp__eyebrow">Step 1 of 2</div>
            <h3 className="otp__title" id="otp-title">Verify your mobile</h3>
            <p className="otp__desc">
              Operators call you directly with their quotes, so we need a number that reaches you.
              We'll send a 6-digit code to confirm it.
            </p>

            <label className="otp__label" htmlFor="otp-phone">Mobile number</label>
            <div className="otp__phone">
              <span className="otp__cc">+91</span>
              <input
                id="otp-phone"
                ref={phoneRef}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && sendCode()} />
            </div>
            <p className="otp__hint">For a number outside India, type it with the country code, e.g. +971…</p>

            {error && <div className="otp__err">{error}</div>}

            <button className="otp__btn" onClick={sendCode} disabled={loading || phone.trim().length < 6}>
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </>
        ) : (
          <>
            <div className="otp__eyebrow">Step 2 of 2</div>
            <h3 className="otp__title" id="otp-title">Enter the code</h3>
            <p className="otp__desc">
              Sent to <strong>{masked}</strong>. It expires in 5 minutes.
            </p>

            <label className="otp__label" htmlFor="otp-code">6-digit code</label>
            <input
              id="otp-code"
              ref={codeRef}
              className="otp__code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && verifyCode()} />

            {error && <div className="otp__err">{error}</div>}

            <button className="otp__btn" onClick={verifyCode} disabled={loading || code.length !== 6}>
              {loading ? 'Verifying…' : 'Verify & get quotes'}
            </button>

            <div className="otp__foot">
              <button
                className="otp__link"
                onClick={() => { setStep('phone'); setError('') }}>
                Change number
              </button>
              <button
                className="otp__link"
                onClick={sendCode}
                disabled={cooldown > 0 || loading}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
