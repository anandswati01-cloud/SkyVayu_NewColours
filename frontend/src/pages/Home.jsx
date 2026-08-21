import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AirportInput from '../components/booking/AirportInput'
import { queryApi, feedbackApi } from '../services/api'
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
  const [pax, setPax] = useState('')
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

  function toggleSpecial(key) {
    setSpecials((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function validate() {
    const errs = {}
    if (!departure.trim()) errs.departure = 'Please enter a departure city'
    if (!destination.trim()) errs.destination = 'Please enter a destination city'
    if (!dateTime) errs.dateTime = 'Please select a departure date & time'
    if (!pax) errs.pax = 'Please select how many are travelling'
    if (tripType === 'Round Trip' && !returnDateTime) errs.returnDateTime = 'Please select a return date & time'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  /**
   * Unchanged from the previous design on purpose. The payload shape and the
   * three sessionStorage keys are the contract the results page, the payment
   * page and the 60-minute countdown all read — a renamed key here fails
   * silently two pages later.
   */
  async function getQuotes() {
    if (!validate()) return
    setLoading(true)

    const [flightDate, flightTime] = dateTime.split('T')
    const [returnDate, returnTime] = returnDateTime ? returnDateTime.split('T') : ['', '']

    const queryData = {
      tripType: TRIP_TYPES.find(([label]) => label === tripType)[1],
      departure, destination, flightDate, flightTime,
      returnDate: returnDate || null, returnTime: returnTime || null,
      passengers: pax,
      aircraftCategory: aircraftType,
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
                  <input type="radio" name="trip" checked={tripType === label} onChange={() => setTripType(label)} />
                  <div className="radio-mark" />
                  <span className="radio-lbl">{label}</span>
                </label>
              ))}
            </div>
          </div>

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
              <label htmlFor="pax">Passengers</label>
              <div className="sel">
                <select
                  id="pax"
                  value={pax}
                  onChange={(e) => setPax(e.target.value === '' ? '' : Number(e.target.value))}
                  tabIndex={5}>
                  <option value="" disabled>Select count</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>{n === 7 ? '7+ Passengers' : `${n} Passenger${n > 1 ? 's' : ''}`}</option>
                  ))}
                </select>
              </div>
              {errors.pax && <div className="fc-err">{errors.pax}</div>}
            </div>
            <div className="fc fc--sub">
              <button className="sub-btn" onClick={getQuotes} disabled={loading} tabIndex={6}>
                {loading ? 'Requesting…' : 'Request Quotes →'}
              </button>
            </div>
          </div>

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
            <button className="btn-t" onClick={() => navigate('/operator')}>Operator Login</button>
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

    </div>
  )
}
