import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AirportInput from '../components/booking/AirportInput'
import OtpModal, { PHONE_TOKEN_KEY } from '../components/booking/OtpModal'
import { queryApi, feedbackApi, otpApi } from '../services/api'
import { config } from '../config/env'
import { signInWithGoogle } from '../services/supabase'
import useAuthStore from '../store/authStore'
import { showToast } from '../components/ui/Toast'
import mumbaiImg from '../assets/routes/mumbai.jpg'
import goaImg from '../assets/routes/goa.jpg'
import dubaiImg from '../assets/routes/dubai.jpg'
import './Home.css'

const TRIP_TYPES = [
  ['One Way', 'one_way'],
  ['Round Trip', 'round_trip'],
  ['Multiple Sectors', 'multiple_sectors'],
]

const SPECIALS = [
  ['medivac', 'Medivac'],
  ['pets', 'Pets'],
  ['vip', 'VIP Passenger'],
  ['infants', 'Infants'],
]

// Passenger stepper bounds. The backend accepts 1–100 (createQueryRules), so 20
// is a product choice, not a technical limit — above it the request stops being
// a charter quote and becomes a group booking the desk handles by hand.
const PAX_MIN = 1
const PAX_MAX = 20
const PAX_DEFAULT = 2

// A multi-sector request needs at least two legs to mean anything, so the form
// opens with two and the remove button locks at that floor.
const MIN_SECTORS = 2

let sectorSeq = 0
const newSector = () => ({ key: `s${++sectorSeq}`, from: '', to: '', dateTime: '', pax: PAX_DEFAULT })

// Bundled rather than hotlinked, so the section does not depend on a third
// party staying up — and so Vite fingerprints and caches them.
const ROUTES = [
  { from: 'Mumbai', to: 'Delhi', meta: '2 hr · Fixed Wing · Available daily', badge: 'Most Requested', img: mumbaiImg, alt: 'Mumbai Bandra-Worli Sea Link at dusk' },
  { from: 'Delhi', to: 'Goa', meta: '2.5 hr · Fixed Wing', badge: null, img: goaImg, alt: 'Overwater villas on a tropical coastline' },
  { from: 'Mumbai', to: 'Dubai', meta: '3 hr · Fixed Wing', badge: null, img: dubaiImg, alt: 'Dubai aerial at golden hour' },
]

const STEPS = [
  ['01', 'Share Your', 'Itinerary', 'Your route, preferred departure, passenger count. Two minutes. Nothing more.'],
  ['02', 'Receive Verified', 'Quotes', 'Within 60 minutes, competitive offers from DGCA-licensed operators — each one manually reviewed before it reaches you.'],
  ['03', 'Choose and', 'Confirm', 'Review aircraft, pricing, and operator credentials. Secure your booking in one step.'],
]

const FEATURES = [
  ['Compliance', 'Every Operator. Manually Reviewed.', 'DGCA-licensed and verified by our team. We will not present an operator we would not use ourselves.'],
  ['Speed', 'Quotes in 60 Minutes', 'Competitive offers from multiple operators in under an hour — so the decision is always yours, never rushed by circumstance.'],
  ['Coverage', '350+ Airports', 'Tier-1 cities and remote airstrips. Domestic and international. If there is runway, we can get you there.'],
  ['Pricing', 'What You See Is What You Pay', 'No hidden charges. No last-minute additions. The quote you receive is the price you pay — fully secured.'],
]

const YT = 'autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&fs=0&cc_load_policy=0&disablekb=1'

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const bookRef = useRef(null)

  const [tripType, setTripType] = useState('One Way')
  const [aircraftType, setAircraftType] = useState('fixed_wing')
  const [departure, setDeparture] = useState('')
  const [destination, setDestination] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [returnDateTime, setReturnDateTime] = useState('')
  // No default. Passenger count decides which aircraft can even serve the
  // route, so it is worth an explicit choice rather than a silent "2".
  // Charter-v2 used a stepper here rather than a dropdown, and started at 2.
  // A stepper always holds a valid number, so unlike the old "Select count"
  // select this field can never be submitted empty and needs no validation.
  const [pax, setPax] = useState(PAX_DEFAULT)

  // Only used by the Multiple Sectors mode. Each row carries a stable `key` so
  // that removing a middle sector does not re-bind the surviving rows' inputs to
  // the wrong data — an array index as the React key would do exactly that.
  const [sectors, setSectors] = useState(() => [newSector(), newSector()])

  const [otpOpen, setOtpOpen] = useState(false)
  const [specials, setSpecials] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const [nlEmail, setNlEmail] = useState('')
  const [nlDone, setNlDone] = useState(false)

  async function subscribe(e) {
    e.preventDefault()
    if (!nlEmail) return
    try {
      await feedbackApi.newsletter(nlEmail)
      setNlDone(true)
      setNlEmail('')
    } catch {
      showToast('Could not subscribe right now. Please try again.', 'error')
    }
  }

  /**
   * Scroll reveal. Elements opt in with .rv and are revealed once.
   *
   * The revealed state is a data attribute, not a class. React owns className
   * and rewrites it on every render where the computed string changes — which
   * silently wiped an imperatively added class and sent the element back to
   * opacity:0 with the observer already detached. That is what made the booking
   * form vanish the moment a trip type was selected. React never touches
   * data-in, so it survives re-renders.
   */
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target) }
      })
    }, { threshold: 0.1 })

    const observeAll = () => {
      document.querySelectorAll('.v1 .rv:not([data-in]), .v1 .eyebrow:not([data-in])')
        .forEach((el) => io.observe(el))
    }
    observeAll()

    // Sections can mount after the first pass (the return-date field, the
    // newsletter's success state). Pick those up instead of leaving them hidden.
    const mo = new MutationObserver(observeAll)
    mo.observe(document.body, { childList: true, subtree: true })

    return () => { io.disconnect(); mo.disconnect() }
  }, [])

  // The navbar links to sections from other routes by navigating here with
  // state; without this the browser lands at the top with nothing happening.
  useEffect(() => {
    const id = location.state?.scrollTo
    if (id) {
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }))
    }
  }, [location.state])

  const isMulti = tripType === 'Multiple Sectors'

  function toggleSpecial(key) {
    setSpecials((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function validate() {
    const errs = {}

    if (isMulti) {
      // The single From/To/Date row is not on screen in this mode, so validating
      // it would block the form on fields the user cannot see or fill.
      //
      // Every leg is validated, but only Sector 1 renders its messages inline —
      // see the `i === 0` guard in the sector list. Repeating the same three red
      // lines under every leg buried the form.
      sectors.forEach((s, i) => {
        if (!s.from.trim()) errs[`sec-${s.key}-from`] = `Sector ${i + 1}: enter a departure city`
        if (!s.to.trim()) errs[`sec-${s.key}-to`] = `Sector ${i + 1}: enter a destination city`
        if (!s.dateTime) errs[`sec-${s.key}-date`] = `Sector ${i + 1}: select a date & time`
      })
    } else {
      if (!departure.trim()) errs.departure = 'Please enter a departure city'
      if (!destination.trim()) errs.destination = 'Please enter a destination city'
      if (!dateTime) errs.dateTime = 'Please select a departure date & time'
      if (tripType === 'Round Trip' && !returnDateTime) errs.returnDateTime = 'Please select a return date & time'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function addSector() {
    setSectors(prev => [...prev, newSector()])
  }

  function removeSector(key) {
    setSectors(prev => (prev.length <= MIN_SECTORS ? prev : prev.filter(s => s.key !== key)))
  }

  function updateSector(key, patch) {
    setSectors(prev => prev.map(s => (s.key === key ? { ...s, ...patch } : s)))
  }

  /**
   * Unchanged from the previous design on purpose. The payload shape and the
   * three sessionStorage keys are the contract the results page, the payment
   * page and the 60-minute countdown all read — a renamed key here fails
   * silently two pages later.
   */
  /**
   * Submit is now gated on a verified mobile number. Operators phone customers
   * back with their quotes, so a request carrying an unreachable number costs
   * the desk a booking; verifying up front also means the number is already on
   * file when the membership tier needs it.
   *
   * A completed verification is remembered for 30 days, so this only interrupts
   * a customer once — the token is checked with the API rather than trusted
   * from localStorage, because an expired one would otherwise be sent along and
   * silently ignored, leaving the request unverified without anyone noticing.
   */
  async function getQuotes() {
    if (!validate()) return

    // Escape hatch for the window between shipping this and SMS actually
    // delivering — see VITE_REQUIRE_PHONE_VERIFICATION in config/env.js.
    if (!config.REQUIRE_PHONE_VERIFICATION) return submitQuery(null)

    const stored = (() => {
      try { return localStorage.getItem(PHONE_TOKEN_KEY) } catch { return null }
    })()

    if (stored) {
      try {
        const res = await otpApi.status(stored)
        if (res.data.valid) return submitQuery(stored)
      } catch { /* fall through to verification */ }
    }

    setOtpOpen(true)
  }

  async function submitQuery(phoneToken) {
    setLoading(true)

    // In multi-sector mode the single From/To/Date row is not filled in, so the
    // top-level columns are derived from the legs: first departure, last
    // arrival, first date, and the largest passenger count on any leg. The
    // queries table stores the full list in `sectors`, but the operator and
    // admin lists read these flat columns — leaving them null would show the
    // request as a blank row. `passengers` is the max because the aircraft has
    // to seat the busiest leg.
    const first = sectors[0]
    const last = sectors[sectors.length - 1]

    const [flightDate, flightTime] = isMulti
      ? first.dateTime.split('T')
      : dateTime.split('T')
    const [returnDate, returnTime] = !isMulti && returnDateTime ? returnDateTime.split('T') : ['', '']

    const queryData = {
      tripType: TRIP_TYPES.find(([label]) => label === tripType)[1],
      departure: isMulti ? first.from : departure,
      destination: isMulti ? last.to : destination,
      flightDate,
      flightTime,
      returnDate: returnDate || null, returnTime: returnTime || null,
      passengers: isMulti ? Math.max(...sectors.map(s => s.pax)) : pax,
      // v2's payload shape, kept so rows written by either site read the same.
      sectors: isMulti
        ? sectors.map(s => ({ from: s.from, to: s.to, datetime: s.dateTime, passengers: s.pax }))
        : null,
      aircraftCategory: aircraftType,
      // The API reads client_phone out of this token, not out of the body, so
      // the number on the request is the one that was actually verified.
      phoneToken,
      medivac: specials.includes('medivac'),
      pets: specials.includes('pets'),
      vip: specials.includes('vip'),
      infants: specials.includes('infants'),
      userId: user?.id || null,
    }

    try {
      const res = await queryApi.create(queryData)
      const query = res.data
      sessionStorage.setItem('sv_query_id', query.id)
      sessionStorage.setItem('sv_query', JSON.stringify(query))
      sessionStorage.setItem('sv_query_start', Date.now().toString())
      navigate('/results')
    } catch (err) {
      if (err.message === 'MEMBERSHIP_REQUIRED') {
        navigate('/register?reason=membership_required&email=' + encodeURIComponent(user?.email || ''))
      } else if (err.status === 401 || !user) {
        sessionStorage.setItem('sv_pending_query', JSON.stringify(queryData))
        signInWithGoogle()
      } else {
        showToast(err.message || 'Could not save your request. Please try again.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  function prefillRoute(from, to) {
    setDeparture(from)
    setDestination(to)
    bookRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  const strip = [
    <><strong>Charter active</strong>&nbsp;·&nbsp;Mumbai — Delhi</>,
    <><strong>DGCA-licensed</strong>&nbsp;·&nbsp;Every operator, verified</>,
    <>Domestic &amp; international routes&nbsp;·&nbsp;<strong>350+ airports</strong></>,
  ]

  return (
    <div className="v1">

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero__bg">
          <div className="hero__fallback" />
          <div className="yt-wrap">
            <iframe
              src={`https://www.youtube.com/embed/ifugOAZZX4Q?${YT}&playlist=ifugOAZZX4Q&start=5`}
              allow="autoplay; encrypted-media" title="Aerial background" tabIndex={-1} />
          </div>
        </div>
        <div className="hero__vig" />
        <div className="hero__topmask" />

        <div className="hero__content">
          <div className="hero__eyebrow rv">Private Air Charter · India &amp; Beyond</div>
          <h1 className="hero__h1 rv d1">Now Fly<br />on <em>Your Terms.</em></h1>

          <div className="hero__meta rv d2">
            <p className="hero__desc">
              India's most rigorous private charter marketplace. Every operator
              DGCA-licensed, manually vetted, and held to a standard most will never meet.
            </p>
            <div className="hero__stats">
              {[['350', '+', 'Airports'], ['60', 'min', 'Quote ETA'], ['100', '%', 'Secured']].map(([n, sub, label]) => (
                <div className="hero__stat" key={label}>
                  <span className="hero__stat-n">{n}<sub>{sub}</sub></span>
                  <span className="hero__stat-l">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero__actions rv d3">
            <button className="btn-p" onClick={() => scrollTo('booking')}>Request a Charter</button>
            <button className="btn-t" onClick={() => scrollTo('about')}>The Process</button>
          </div>
        </div>

        <div className="hero__strip">
          <div className="hero__strip-i">
            {[...strip, ...strip].map((txt, i) => (
              <div className="strip-item" key={i}>
                <div className="strip-dot" style={{ animationDelay: `${(i % 3) * 0.9}s` }} />
                <span className="strip-txt">{txt}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOOKING ─────────────────────────────────────────────────────── */}
      <section className="booking" id="booking" ref={bookRef}>
        <div className="booking__i">
          <div className="booking__hd rv">
            <h2 className="booking__title">Request Your Charter</h2>
            <span className="booking__sub">Verified quotes within 60 minutes</span>
          </div>

          <div className="booking__ctrl rv">
            <div className="tog">
              {[['fixed_wing', 'Fixed Wing'], ['helicopter', 'Helicopter']].map(([val, label]) => (
                <button
                  key={val}
                  className={`tog__btn${aircraftType === val ? ' on' : ''}`}
                  onClick={() => setAircraftType(val)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="radios">
              {TRIP_TYPES.map(([label]) => (
                <label className="radio-item" key={label}>
                  {/* Errors are dropped on a mode change: the fields they refer
                      to are swapped out with the mode, so keeping them would
                      mark up a form the customer has not filled in yet. */}
                  <input
                    type="radio"
                    name="trip"
                    checked={tripType === label}
                    onChange={() => { setTripType(label); setErrors({}) }} />
                  <div className="radio-mark" />
                  <span className="radio-lbl">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {isMulti ? (
            <div className="sectors rv">
              {sectors.map((s, i) => (
                <div className="sector" key={s.key}>
                  <div className="sector__hd">
                    <span className="sector__n">Sector {i + 1}</span>
                    <button
                      type="button"
                      className="sector__rm"
                      onClick={() => removeSector(s.key)}
                      disabled={sectors.length <= MIN_SECTORS}
                      title={sectors.length <= MIN_SECTORS ? `A multi-sector trip needs at least ${MIN_SECTORS} legs` : 'Remove this sector'}
                      aria-label={`Remove sector ${i + 1}`}>✕</button>
                  </div>

                  <div className="form-strip form-strip--sec">
                    <div className="fc">
                      <label htmlFor={`sec-from-${s.key}`}>From</label>
                      <AirportInput
                        id={`sec-from-${s.key}`}
                        placeholder="Departure city or airport"
                        value={s.from}
                        onChange={(v) => updateSector(s.key, { from: v })} />
                      {i === 0 && errors[`sec-${s.key}-from`] && <div className="fc-err">{errors[`sec-${s.key}-from`]}</div>}
                    </div>
                    <div className="fc">
                      <label htmlFor={`sec-to-${s.key}`}>To</label>
                      <AirportInput
                        id={`sec-to-${s.key}`}
                        placeholder="Destination city or airport"
                        value={s.to}
                        onChange={(v) => updateSector(s.key, { to: v })} />
                      {i === 0 && errors[`sec-${s.key}-to`] && <div className="fc-err">{errors[`sec-${s.key}-to`]}</div>}
                    </div>
                    <div className="fc">
                      <label htmlFor={`sec-date-${s.key}`}>Date &amp; Time</label>
                      <input
                        id={`sec-date-${s.key}`}
                        type="datetime-local"
                        value={s.dateTime}
                        onChange={(e) => updateSector(s.key, { dateTime: e.target.value })} />
                      {i === 0 && errors[`sec-${s.key}-date`] && <div className="fc-err">{errors[`sec-${s.key}-date`]}</div>}
                    </div>
                    <div className="fc">
                      <label>Passengers</label>
                      <div className="pax" role="group" aria-label={`Passengers, sector ${i + 1}`}>
                        <button
                          type="button"
                          className="pax__btn"
                          onClick={() => updateSector(s.key, { pax: Math.max(PAX_MIN, s.pax - 1) })}
                          disabled={s.pax <= PAX_MIN}
                          aria-label="One fewer passenger">−</button>
                        <span className="pax__n" aria-live="polite">{s.pax}</span>
                        <button
                          type="button"
                          className="pax__btn"
                          onClick={() => updateSector(s.key, { pax: Math.min(PAX_MAX, s.pax + 1) })}
                          disabled={s.pax >= PAX_MAX}
                          aria-label="One more passenger">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="sectors__foot">
                <button type="button" className="sector__add" onClick={addSector}>
                  <span>+</span> Add Sector
                </button>
                <button className="sub-btn sub-btn--sec" onClick={getQuotes} disabled={loading}>
                  {loading ? 'Requesting…' : 'Request Quotes →'}
                </button>
              </div>
            </div>
          ) : (
          <div className={`form-strip rv${tripType === 'Round Trip' ? ' form-strip--rt' : ''}`}>
            <div className="fc">
              <label htmlFor="departure">From</label>
              <AirportInput id="departure" placeholder="Departure city or airport" value={departure} onChange={setDeparture} tabIndex={1} />
              {errors.departure && <div className="fc-err">{errors.departure}</div>}
            </div>
            <div className="fc">
              <label htmlFor="destination">To</label>
              <AirportInput id="destination" placeholder="Destination city or airport" value={destination} onChange={setDestination} tabIndex={2} />
              {errors.destination && <div className="fc-err">{errors.destination}</div>}
            </div>
            <div className="fc">
              <label htmlFor="depart-at">Date &amp; Time</label>
              <input id="depart-at" type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} tabIndex={3} />
              {errors.dateTime && <div className="fc-err">{errors.dateTime}</div>}
            </div>
            {tripType === 'Round Trip' && (
              <div className="fc">
                <label htmlFor="return-at">Return</label>
                <input id="return-at" type="datetime-local" value={returnDateTime} onChange={(e) => setReturnDateTime(e.target.value)} tabIndex={4} />
                {errors.returnDateTime && <div className="fc-err">{errors.returnDateTime}</div>}
              </div>
            )}
            <div className="fc">
              <label>Passengers</label>
              <div className="pax" role="group" aria-label="Passengers">
                <button
                  type="button"
                  className="pax__btn"
                  onClick={() => setPax(p => Math.max(PAX_MIN, p - 1))}
                  disabled={pax <= PAX_MIN}
                  aria-label="One fewer passenger"
                  tabIndex={5}>−</button>
                <span className="pax__n" aria-live="polite">{pax}</span>
                <button
                  type="button"
                  className="pax__btn"
                  onClick={() => setPax(p => Math.min(PAX_MAX, p + 1))}
                  disabled={pax >= PAX_MAX}
                  aria-label="One more passenger"
                  tabIndex={5}>+</button>
              </div>
            </div>
            <div className="fc fc--sub">
              <button className="sub-btn" onClick={getQuotes} disabled={loading} tabIndex={6}>
                {loading ? 'Requesting…' : 'Request Quotes →'}
              </button>
            </div>
          </div>
          )}

          <div className="booking__spec rv">
            <span className="spec-lbl">Special Requirements</span>
            {SPECIALS.map(([key, label]) => (
              <label className={`spec-pill${specials.includes(key) ? ' on' : ''}`} key={key}>
                <input type="checkbox" checked={specials.includes(key)} onChange={() => toggleSpecial(key)} />
                {label}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS ─────────────────────────────────────────────────────── */}
      <section className="process" id="about">
        <div className="process__i">
          <div className="eyebrow rv">The Process</div>
          <div className="steps">
            {STEPS.map(([n, l1, l2, desc], i) => (
              <div className={`step rv${i ? ` d${i}` : ''}`} key={n}>
                <span className="step__n">{n}</span>
                <h3 className="step__title">{l1}<br />{l2}</h3>
                <p className="step__desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VIDEO BREAK ─────────────────────────────────────────────────── */}
      <section className="vbreak">
        <div className="vbreak__bg" />
        <div className="yt-wrap">
          <iframe
            src={`https://www.youtube.com/embed/php2wqxC4UI?${YT}&playlist=php2wqxC4UI`}
            allow="autoplay; encrypted-media" title="Cabin background" tabIndex={-1} />
        </div>
        <div className="vbreak__ov" />
        <div className="vbreak__c rv">
          <p className="vbreak__q">"Time moves differently<br />when you control the departure."</p>
          <span className="vbreak__src">SkyVayu — Private Air Charter</span>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section className="features" id="fleet">
        <div className="features__i">
          <div className="features__l rv">
            <div className="eyebrow" style={{ marginBottom: 20 }}>The Difference</div>
            <h2 className="sec-title">Transparency<br />as <em>Standard.</em></h2>
            <p className="sec-body" style={{ marginTop: 16 }}>
              Charter aviation has long profited from opacity. We built SkyVayu to end it.
              No brokers. No margin games. Direct access to India's finest operators —
              with pricing you can trust.
            </p>
          </div>
          <div className="feat-list">
            {[FEATURES.slice(0, 2), FEATURES.slice(2)].map((row, r) => (
              <div className="feat-row" key={r}>
                {row.map(([tag, title, desc], i) => (
                  <div className={`feat-cell rv${i ? ' d1' : ''}`} key={tag}>
                    <span className="feat-tag">{tag}</span>
                    <h4 className="feat-title">{title}</h4>
                    <p className="feat-desc">{desc}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DESTINATIONS ────────────────────────────────────────────────── */}
      <section className="dests" id="destinations">
        <div className="dests__i">
          <div className="dests__hd">
            <div className="rv">
              <div className="eyebrow" style={{ marginBottom: 12 }}>Featured Routes</div>
              <h2 className="sec-title">Where Would You<br /><em>Like to Go?</em></h2>
            </div>
            <button className="btn-t rv" onClick={() => scrollTo('booking')}>Explore All Routes →</button>
          </div>

          <div className="dests__grid">
            {ROUTES.map((r, i) => (
              <button
                className={`dest rv${i ? ` d${i}` : ''}`}
                key={`${r.from}-${r.to}`}
                onClick={() => prefillRoute(r.from, r.to)}
                aria-label={`Request a charter from ${r.from} to ${r.to}`}>
                <img className="dest__img" src={r.img} alt={r.alt} loading="lazy" />
                <div className="dest__vig" />
                <span className="dest__arr" aria-hidden="true">↗</span>
                <div className="dest__body">
                  {r.badge && <span className="dest__badge">{r.badge}</span>}
                  <div className="dest__route">{r.from}<br />→ {r.to}</div>
                  <div className="dest__meta">{r.meta}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="cta">
        <div className="cta__i">
          <h2 className="cta__h rv">When Are You<br />Flying <em>Next?</em></h2>
          <div className="cta__r rv d1">
            <p className="cta__note">
              No commitment required. A verified quote arrives within 60 minutes —
              and costs nothing to request.
            </p>
            <button className="btn-p" onClick={() => scrollTo('booking')}>Request Your Charter →</button>
            {/* <button className="btn-t" onClick={() => navigate('/operator')}>Operator Login</button> */}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ──────────────────────────────────────────────────── */}
      <section className="nl">
        <div className="nl__i">
          <div className="rv">
            <h3>Stay Above the Clouds</h3>
            <p>Empty leg alerts, route intelligence, and charter opportunities — delivered with complete discretion.</p>
          </div>
          <div className="rv d1">
            {nlDone ? (
              <p className="nl__done">Subscribed ✓ — we'll be in touch.</p>
            ) : (
              <form className="nl__form" onSubmit={subscribe}>
                <input
                  className="nl__inp"
                  type="email"
                  value={nlEmail}
                  onChange={(e) => setNlEmail(e.target.value)}
                  placeholder="Your email address"
                  aria-label="Email address"
                />
                <button type="submit" className="nl__btn">Subscribe</button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Opened by Request Quotes when this browser has no current verification.
          onVerified hands back the signed token and the submit picks up exactly
          where it left off, so the customer never re-enters the form. */}
      <OtpModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        onVerified={(token) => { setOtpOpen(false); submitQuery(token) }}
      />
    </div>
  )
}
