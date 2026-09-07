import { useState, useEffect } from 'react'
import useAuthStore from '../store/authStore'
import { bookingApi, authApi } from '../services/api'
import { signInWithGoogle, supabase } from '../services/supabase'
import { generateInvoice } from '../utils/invoice'
import './Profile.css'

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
const MAX_DOC_BYTES = 5 * 1024 * 1024

// Bookings are fetched in full and paged in the browser. The list is one
// customer's own history, so it is small enough that a page of it is not worth
// a round trip — and the Current/Past split has to count the whole set anyway.
const PAGE_SIZE = 10

/** A window of page numbers around the current one, so a long history does not
 *  print a hundred buttons. */
function pageWindow(current, total, span = 5) {
  let start = Math.max(1, current - Math.floor(span / 2))
  const end = Math.min(total, start + span - 1)
  start = Math.max(1, end - span + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

/* Tile icons, drawn from currentColor so the selected tile's gold carries into
   the mark without a second rule. */
const ICONS = {
  personal: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5v-1A5.5 5.5 0 0 1 10 14h4a5.5 5.5 0 0 1 5.5 5.5v1',
  kyc: 'M12 3l7.5 3v5.2c0 4.3-3 8.3-7.5 9.8-4.5-1.5-7.5-5.5-7.5-9.8V6L12 3zM9 12l2.2 2.2L15.5 10',
  bookings: 'M8 3v3M16 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM8.5 13h3M8.5 17h6',
}

/**
 * One of the three tiles in the row. The tiles are the navigation; the section
 * they select opens full width underneath, rather than inside a third-width
 * column where two-column forms and booking rows would not fit.
 */
function Tile({ id, title, sub, meta, active, onSelect }) {
  return (
    <button
      type="button"
      className={`tile${active ? ' on' : ''}`}
      aria-expanded={active}
      aria-controls="pf-detail"
      onClick={onSelect}>
      <span className="tile__ic">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={ICONS[id]} /></svg>
      </span>
      <span className="tile__t">{title}</span>
      <span className="tile__m">{meta ?? sub}</span>
    </button>
  )
}

/**
 * My Profile — personal details, KYC, and bookings.
 *
 * The profile row is read and written through /api/auth/profile rather than
 * straight from the browser, as the previous site did. Row level security now
 * blocks direct access to `profiles`, and routing through the API is also what
 * keeps `kyc_verified` out of the customer's reach: only the charter desk marks
 * documents approved, and the server's whitelist is what enforces that.
 *
 * Document files still go to Supabase Storage directly — that bucket has its
 * own policies and is not affected by the lockdown.
 */
export default function Profile() {
  const { user } = useAuthStore()

  const [profile, setProfile] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')
  const [page, setPage] = useState(1)
  // Which tile's section is open below the row, or null for none. One at a time
  // because there is one detail area — switching tiles unmounts the previous
  // section, but every field is controlled from state up here, so a part-filled
  // form is still intact when the customer comes back to it.
  const [section, setSection] = useState(null)

  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [nationality, setNationality] = useState('')
  const [passportNo, setPassportNo] = useState('')
  const [aadhaarNo, setAadhaarNo] = useState('')
  const [passportFile, setPassportFile] = useState(null)
  const [aadhaarFile, setAadhaarFile] = useState(null)

  const [savingPersonal, setSavingPersonal] = useState(false)
  const [savingKyc, setSavingKyc] = useState(false)
  const [personalMsg, setPersonalMsg] = useState(null)
  const [kycMsg, setKycMsg] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    Promise.allSettled([authApi.profile(), bookingApi.list()]).then(([p, b]) => {
      if (cancelled) return
      if (p.status === 'fulfilled' && p.value?.data) {
        const d = p.value.data
        setProfile(d)
        setPhone(d.phone || '')
        setDob(d.date_of_birth || '')
        setNationality(d.nationality || '')
        setPassportNo(d.passport_number || '')
        setAadhaarNo(d.aadhaar_number || '')
      }
      if (b.status === 'fulfilled') setBookings(b.value?.data || [])
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [user])

  if (!user) {
    return (
      <div className="pf" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 48 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, marginBottom: 16 }}>Sign in to view your profile</div>
          <p style={{ color: 'var(--white-60)', marginBottom: 32 }}>You need to be signed in to view your bookings and profile.</p>
          <button className="pf__save" onClick={signInWithGoogle}>Sign In with Google</button>
        </div>
      </div>
    )
  }

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  // The greeting takes the first name only, matching the header link the
  // customer just clicked to get here — and a full legal name in a 42px display
  // face wraps the heading on anything narrower than a laptop.
  const firstName = displayName.split(' ')[0]

  /** Verified beats pending; pending only once something has actually been sent in. */
  const kycState = profile?.kyc_verified
    ? { cls: 'verified', label: 'Verified' }
    : (profile?.passport_uploaded || profile?.aadhaar_uploaded)
      ? { cls: 'pending', label: 'Pending Review' }
      : { cls: 'none', label: 'Not Verified' }

  function pickFile(setter, setMsg) {
    return (e) => {
      const f = e.target.files?.[0]
      if (!f) return
      if (f.size > MAX_DOC_BYTES) {
        setMsg({ text: 'That file is over 5 MB. Please upload a smaller scan.', err: true })
        e.target.value = ''
        return
      }
      setMsg(null)
      setter(f)
    }
  }

  async function savePersonal() {
    setSavingPersonal(true)
    setPersonalMsg(null)
    try {
      const res = await authApi.updateProfile({ phone: phone.trim() || null })
      setProfile(res.data)
      setPersonalMsg({ text: 'Saved.' })
    } catch (err) {
      setPersonalMsg({ text: err.message || 'Could not save. Please try again.', err: true })
    } finally {
      setSavingPersonal(false)
    }
  }

  /** `{userId}/{type}.{ext}`, overwriting — one current scan per document. */
  async function uploadDoc(type, file) {
    const ext = file.name.split('.').pop()
    const { error } = await supabase.storage
      .from('kyc-documents')
      .upload(`${user.id}/${type}.${ext}`, file, { upsert: true, contentType: file.type })
    if (error) throw new Error(`${type} upload failed: ${error.message}`)
  }

  async function saveKyc() {
    setSavingKyc(true)
    setKycMsg(null)

    const payload = {
      date_of_birth: dob || null,
      nationality: nationality.trim() || null,
      passport_number: passportNo.trim() || null,
      aadhaar_number: aadhaarNo.trim() || null,
    }

    try {
      // Files first: the *_uploaded flags must only be set for uploads that
      // actually landed, otherwise the desk is told to review a missing scan.
      if (passportFile) { await uploadDoc('passport', passportFile); payload.passport_uploaded = true }
      if (aadhaarFile) { await uploadDoc('aadhaar', aadhaarFile); payload.aadhaar_uploaded = true }

      const res = await authApi.updateProfile(payload)
      setProfile(res.data)
      setPassportFile(null)
      setAadhaarFile(null)
      setKycMsg({
        text: (passportFile || aadhaarFile)
          ? 'Details and documents saved. Your KYC is now pending review.'
          : 'KYC details saved.',
      })
    } catch (err) {
      setKycMsg({ text: err.message || 'Could not save your KYC details.', err: true })
    } finally {
      setSavingKyc(false)
    }
  }

  const pick = (k) => setSection((s) => (s === k ? null : k))

  const active = bookings.filter((b) => b.status === 'confirmed')
  const past = bookings.filter((b) => b.status !== 'confirmed')
  const shown = tab === 'active' ? active : past

  // `page` is clamped rather than trusted: a refetch can shorten the list under
  // a page the customer is already on, which would otherwise render blank.
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const from = (current - 1) * PAGE_SIZE
  const pageItems = shown.slice(from, from + PAGE_SIZE)

  function switchTab(next) {
    setTab(next)
    setPage(1)
  }

  return (
    <div className="pf">
      <div className="pf__i">
        <h1 className="pf__title">Welcome <span className="pf__name">{firstName}</span></h1>

        {/* One row of tiles; the chosen section opens full width below them. */}
        <div className="tiles">
          <Tile
            id="personal" title="Personal Information" sub="Name, email and phone"
            active={section === 'personal'} onSelect={() => pick('personal')} />
          <Tile
            id="kyc" title="KYC Information"
            active={section === 'kyc'} onSelect={() => pick('kyc')}
            meta={<span className={`kyc-badge ${kycState.cls}`}><span className="dot" />{kycState.label}</span>} />
          <Tile
            id="bookings" title="My Bookings"
            sub={loading ? 'Loading…' : `${bookings.length} booking${bookings.length === 1 ? '' : 's'}`}
            active={section === 'bookings'} onSelect={() => pick('bookings')} />
        </div>

        <div className="pf__detail" id="pf-detail">

        {/* ── PERSONAL ────────────────────────────────────────────────── */}
        {section === 'personal' && (
        <div className="pnl__b">
          <div className="pf__grid">
            <div className="pf__f">
              <div className="pf__lbl">Full Name</div>
              <div className="pf__val">{displayName}</div>
            </div>
            <div className="pf__f">
              <div className="pf__lbl">Email Address</div>
              <div className="pf__val">{profile?.email || user.email || '—'}</div>
              <div className="pf__note">Set by Google — cannot be changed here.</div>
            </div>
            <div className="pf__f">
              <label className="pf__lbl" htmlFor="pf-phone">Phone Number</label>
              <input
                id="pf-phone" className="pf__in" type="tel" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
              {profile?.phone_verified_at && <div className="pf__note">Verified by SMS.</div>}
            </div>
          </div>
          <button className="pf__save" onClick={savePersonal} disabled={savingPersonal}>
            {savingPersonal ? 'Saving…' : 'Save Changes'}
          </button>
          {personalMsg && <div className={`pf__status${personalMsg.err ? ' err' : ''}`}>{personalMsg.text}</div>}
        </div>
        )}

        {/* ── KYC ─────────────────────────────────────────────────────── */}
        {section === 'kyc' && (
        <div className="pnl__b">
          <div className="pf__grid">
            <div className="pf__f">
              <label className="pf__lbl" htmlFor="pf-dob">Date of Birth</label>
              <input id="pf-dob" className="pf__in" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="pf__f">
              <label className="pf__lbl" htmlFor="pf-nat">Nationality</label>
              <input id="pf-nat" className="pf__in" type="text" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Indian" />
            </div>
            <div className="pf__f">
              <label className="pf__lbl" htmlFor="pf-pass">Passport Number</label>
              <input id="pf-pass" className="pf__in" type="text" value={passportNo} onChange={(e) => setPassportNo(e.target.value)} placeholder="A1234567" />
            </div>
            <div className="pf__f">
              <label className="pf__lbl" htmlFor="pf-aad">Aadhaar Number</label>
              <input id="pf-aad" className="pf__in" type="text" maxLength={14} value={aadhaarNo} onChange={(e) => setAadhaarNo(e.target.value)} placeholder="XXXX XXXX XXXX" />
            </div>
          </div>

          <div className="pf__note" style={{ marginBottom: 20 }}>
            Your documents are used only for flight compliance. DGCA regulations require KYC for all charter passengers.
          </div>

          <div className="pf__docs">
            <div className="pf__docs-lbl">Document Uploads</div>

            {[
              ['passport', 'Passport Scan', passportFile, setPassportFile, profile?.passport_uploaded],
              ['aadhaar', 'Aadhaar Scan', aadhaarFile, setAadhaarFile, profile?.aadhaar_uploaded],
            ].map(([key, label, file, setter, uploaded]) => (
              <div className="doc-row" key={key}>
                <div className="doc-row__l">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                  <div>
                    <div className="doc-row__t">{label}</div>
                    <div className={`doc-row__f${file ? ' picked' : ''}`}>
                      {file
                        ? `${file.name} (${(file.size / 1024).toFixed(0)} KB)`
                        : uploaded ? 'Uploaded — choose a file to replace it' : 'No file selected'}
                    </div>
                  </div>
                </div>
                <label className="doc-row__btn">
                  {uploaded && !file ? 'REPLACE' : 'UPLOAD'}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={pickFile(setter, setKycMsg)} />
                </label>
              </div>
            ))}

            <div className="pf__hint">PDF, JPG or PNG · Max 5 MB per file. Files are stored privately.</div>
          </div>

          <button className="pf__save" onClick={saveKyc} disabled={savingKyc}>
            {savingKyc ? 'Saving…' : 'Save KYC Details'}
          </button>
          {kycMsg && <div className={`pf__status${kycMsg.err ? ' err' : ''}`}>{kycMsg.text}</div>}
        </div>
        )}

        {/* ── BOOKINGS ────────────────────────────────────────────────── */}
        {section === 'bookings' && (
        <div className="pnl__b">
          <div className="pf__tabs">
            <button className={`pf__tab${tab === 'active' ? ' on' : ''}`} onClick={() => switchTab('active')}>
              Current ({active.length})
            </button>
            <button className={`pf__tab${tab === 'past' ? ' on' : ''}`} onClick={() => switchTab('past')}>
              Past ({past.length})
            </button>
          </div>

          {loading ? (
            <div className="pf__empty">Loading…</div>
          ) : shown.length === 0 ? (
            <div className="pf__empty">
              <div className="ic">✈</div>
              <div>No {tab === 'active' ? 'current' : 'past'} bookings</div>
            </div>
          ) : (
            <>
              {pageItems.map((b) => (
                <div className="bk" key={b.id}>
                  <div>
                    <span className="bk__ref">{b.ref}</span>
                    <span className={`bk__status ${b.status === 'confirmed' ? 'confirmed' : 'other'}`} style={{ marginLeft: 10 }}>
                      {b.status}
                    </span>
                    <div className="bk__route">{b.route || '—'}</div>
                    <div className="bk__meta">{b.flight_date || '—'} · {b.aircraft || '—'} · {b.operator_name || '—'}</div>
                  </div>
                  <div className="bk__r">
                    <div className="bk__amt">{fmt(b.total_amount)}</div>
                    <div style={{ fontSize: 12, color: 'var(--white-30)', marginTop: 4 }}>{b.passengers || 1} Pax</div>
                    <button className="bk__inv" onClick={() => generateInvoice(b)}>Invoice</button>
                  </div>
                </div>
              ))}

              {/* The range readout is shown even on a single page — it answers
                  "is that everything?", which a lone set of arrows does not. */}
              <div className="pg">
                <div className="pg__info">
                  Showing {from + 1}–{Math.min(from + PAGE_SIZE, shown.length)} of {shown.length}
                </div>

                {pageCount > 1 && (
                  <div className="pg__ctl">
                    <button
                      className="pg__b" onClick={() => setPage(current - 1)}
                      disabled={current === 1} aria-label="Previous page">‹</button>

                    {pageWindow(current, pageCount).map((n) => (
                      <button
                        key={n}
                        className={`pg__b${n === current ? ' on' : ''}`}
                        onClick={() => setPage(n)}
                        aria-current={n === current ? 'page' : undefined}>
                        {n}
                      </button>
                    ))}

                    <button
                      className="pg__b" onClick={() => setPage(current + 1)}
                      disabled={current === pageCount} aria-label="Next page">›</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        )}

        </div>
      </div>
    </div>
  )
}
