import { Link } from 'react-router-dom'

const STATS = [
  ['350+', 'Airports & Helipads Covered'],
  ['60 Min', 'Average Quotation Time'],
  ['100%', 'DGCA Licensed Operators'],
  ['24×7', 'Charter Desk Availability'],
]

const PILLARS = [
  ['◎', 'Our Mission', 'To simplify private aviation by making charter booking fast, transparent, and accessible — replacing days of broker phone calls with a single request that reaches every available operator at once.'],
  ['◈', 'Our Vision', "To become India's most trusted digital platform for private aviation, setting new standards in customer experience, pricing transparency, and operational excellence."],
  ['◇', 'Our Values', 'Safety before speed. Price before promise. Every operator verified, every quotation itemised, every rupee accounted for — no commissions hidden inside the fare.'],
]

const SERVICES = [
  ['✈', 'Business Charter', 'Fixed-wing jets and turboprops for board meetings, site visits, and multi-city days that no scheduled airline can compress into one trip.'],
  ['🚁', 'Helicopter Charter', 'Point-to-point rotary transfers for pilgrimages, remote sites, aerial surveys, and city-to-airport connections.'],
  ['✚', 'Air Ambulance / Medivac', 'Medically equipped aircraft with stretcher configuration and ICU capability, mobilised on priority for emergency evacuation.'],
  ['★', 'VIP & Leisure', 'Discreet travel for dignitaries, film units, sports teams, and families — with pet-friendly and infant-friendly cabins on request.'],
]

const DIFFERENCE = [
  ['One request, every operator', 'Your trip details go out simultaneously to all operators that can serve the route. They compete; you choose.'],
  ['No broker markup', 'Quotations arrive exactly as the operator priced them. Our fee is disclosed, never buried in the flying rate.'],
  ['Verified before activation', 'AOP, DGCA licence, insurance, and crew credentials are checked manually before any operator can quote on the platform.'],
  ['Full aircraft transparency', 'Registration, year of manufacture, seating, cabin photos, and operator identity — visible before you commit.'],
  ['Secured payments', 'Payments are collected through secured gateways with a written confirmation and itemised invoice for every booking.'],
  ['Real people on call', 'A charter desk that answers around the clock — because a 3 a.m. medivac cannot wait for business hours.'],
]

const TIMELINE = [
  ['01', 'The Problem', 'Chartering an aircraft in India still meant calling five brokers, waiting a day, and never knowing whether the price was fair.'],
  ['02', 'The Platform', 'SkyVayu was built as a direct marketplace — a single request routed to every DGCA-licensed non-scheduled operator that can fly the route.'],
  ['03', 'The Network', 'Verified fixed-wing and rotary operators, covering 350+ airports and helipads across India and key international sectors.'],
  ['04', 'What Is Next', 'Deeper international coverage, live empty-leg inventory, and instant confirmed pricing on the most requested routes.'],
]

const FAQ = [
  ['How quickly will I receive quotations?', 'Most requests are matched with verified operator quotations within 60 minutes. Medivac and urgent requests are escalated immediately to the charter desk.'],
  ['Are the operators licensed?', 'Yes. Every operator on SkyVayu holds a valid DGCA Non-Scheduled Operator Permit and is manually verified — licence, insurance, and crew credentials — before activation.'],
  ['Is the price I see the final price?', 'The quotation is itemised and shown as the operator priced it. Applicable GST is indicated separately. There are no hidden broker commissions added afterwards.'],
  ['Can you arrange international charters?', 'Yes. In addition to domestic sectors, we handle international routes such as Mumbai–Dubai, subject to the usual overflight, landing, and immigration clearances.'],
  ['What if my plans change?', 'Cancellation and rescheduling terms are set by the operating carrier and are shown with the quotation before you confirm, so there are no surprises later.'],
]

const s = {
  eyebrow: { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 },
  h2: { fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 400, lineHeight: 1.1, marginBottom: 0 },
  body: { fontSize: 15, lineHeight: 1.8, color: 'var(--white-60)' },
  card: { padding: 36, border: '1px solid var(--white-10)', borderRadius: 4, background: 'rgba(255,255,255,0.02)', transition: 'all 0.3s' },
  icon: { width: 48, height: 48, border: '1px solid var(--white-10)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 20 },
}

const hoverIn = e => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }
const hoverOut = e => { e.currentTarget.style.borderColor = 'var(--white-10)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }

export default function About() {
  return (
    <div>
      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.25)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(12,19,36,0.6) 0%, rgba(12,19,36,0.75) 50%, var(--navy) 100%)' }} />

        <div style={{ position: 'relative', zIndex: 2, padding: '180px 48px 100px', maxWidth: 1280, margin: '0 auto', animation: 'fadeUp 0.6s ease both' }}>
          <div style={{ ...s.eyebrow, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'block', width: 32, height: 1, background: 'var(--gold)' }} />
            About SkyVayu
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 6vw, 76px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: -1, marginBottom: 28, maxWidth: 900 }}>
            India's marketplace for<br />
            <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>private charter aviation.</em>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.8, color: 'var(--white-60)', maxWidth: 620 }}>
            SkyVayu connects travellers directly with DGCA-licensed non-scheduled operators for business, leisure,
            medical, and VIP flights. One request reaches every operator that can serve your route — and the
            verified quotations come back to you within the hour, priced exactly as the operator quoted them.
          </p>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: '0 48px 100px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {STATS.map(([num, label]) => (
            <div key={label} style={{ padding: '32px 28px', border: '1px solid var(--white-10)', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 600, color: 'var(--gold)', lineHeight: 1, marginBottom: 10 }}>{num}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--white-60)', lineHeight: 1.6 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* OUR STORY */}
      <section style={{ padding: '100px 48px', background: 'var(--navy-mid)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={s.eyebrow}>Our Story</div>
            <h2 style={{ ...s.h2, marginBottom: 28 }}>Built to remove the middlemen</h2>
            <p style={{ ...s.body, marginBottom: 20 }}>
              Private aviation in India has never lacked aircraft. What it lacked was a way to reach them.
              A charter enquiry meant calling brokers one by one, waiting a day for a price, and having no way
              to tell whether that price was the operator's or the broker's.
            </p>
            <p style={{ ...s.body, marginBottom: 20 }}>
              SkyVayu was built to close that gap. Your trip details are broadcast to every verified operator
              capable of flying the sector, and their quotations come back directly to you — with the aircraft
              registration, cabin configuration, and operator identity attached.
            </p>
            <p style={s.body}>
              The result is a market that behaves like a market: operators compete on price and aircraft quality,
              and the traveller decides with full information in front of them.
            </p>
          </div>
          <div style={{ position: 'relative', borderRadius: 4, overflow: 'hidden' }}>
            <img src="https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1000&q=80" alt="Private jet cabin interior"
              style={{ width: '100%', height: 460, objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(12,19,36,0.7) 0%, transparent 55%)' }} />
          </div>
        </div>
      </section>

      {/* MISSION / VISION / VALUES */}
      <section style={{ padding: '100px 48px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={s.eyebrow}>What Drives Us</div>
        <h2 style={s.h2}>Mission, vision, and the rules we fly by</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 56 }}>
          {PILLARS.map(([icon, title, desc]) => (
            <div key={title} style={s.card} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              <div style={{ ...s.icon, color: 'var(--gold)' }}>{icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, marginBottom: 12 }}>{title}</div>
              <p style={{ ...s.body, fontSize: 14 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT WE FLY */}
      <section style={{ padding: '100px 48px', background: 'var(--navy-mid)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={s.eyebrow}>What We Arrange</div>
          <h2 style={s.h2}>Every kind of charter, on one platform</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 56 }}>
            {SERVICES.map(([icon, title, desc]) => (
              <div key={title} style={s.card} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                <div style={s.icon}>{icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, marginBottom: 12 }}>{title}</div>
                <p style={{ ...s.body, fontSize: 14 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE SKYVAYU */}
      <section style={{ padding: '100px 48px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={s.eyebrow}>Why Choose SkyVayu</div>
        <h2 style={s.h2}>Six reasons travellers come back</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 0, marginTop: 56, borderTop: '1px solid var(--white-10)' }}>
          {DIFFERENCE.map(([title, desc], i) => (
            <div key={title} style={{ padding: '32px 28px 32px 0', borderBottom: '1px solid var(--white-10)', display: 'flex', gap: 20 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.5px', color: 'var(--gold)', paddingTop: 4 }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, marginBottom: 10 }}>{title}</div>
                <p style={{ ...s.body, fontSize: 14 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SAFETY & COMPLIANCE */}
      <section style={{ padding: '100px 48px', background: 'var(--navy-mid)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 64 }}>
          <div>
            <div style={s.eyebrow}>Safety & Compliance</div>
            <h2 style={{ ...s.h2, marginBottom: 24 }}>Safety is a baseline, not a feature</h2>
            <p style={s.body}>
              SkyVayu is a marketplace — the flight is operated by the licensed carrier you select. That makes
              operator verification the most important work we do, and we do it before an operator is ever allowed
              to send you a quotation.
            </p>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              'Valid DGCA Non-Scheduled Operator Permit on file',
              'Air Operator Certificate and aircraft airworthiness verified',
              'Passenger liability and hull insurance confirmed',
              'Crew licences and recency checked at onboarding',
              'Aircraft registration disclosed on every quotation',
              'Operator performance reviewed after every completed flight',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px', border: '1px solid var(--white-10)', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ color: 'var(--gold)', fontSize: 14, lineHeight: 1.6 }}>✓</span>
                <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--white-60)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section style={{ padding: '100px 48px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={s.eyebrow}>The Journey</div>
        <h2 style={s.h2}>How SkyVayu came together</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginTop: 56 }}>
          {TIMELINE.map(([num, title, desc]) => (
            <div key={num} style={{ ...s.card, padding: 32 }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 600, color: 'rgba(251,191,36,0.12)', lineHeight: 1, marginBottom: 12 }}>{num}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 400, marginBottom: 10 }}>{title}</div>
              <p style={{ ...s.body, fontSize: 14 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COVERAGE */}
      <section style={{ padding: '100px 48px', background: 'var(--navy-mid)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={s.eyebrow}>Where We Operate</div>
          <h2 style={s.h2}>From metro hubs to unpaved strips</h2>
          <p style={{ ...s.body, maxWidth: 620, marginTop: 20 }}>
            Coverage spans 350+ airports and helipads across India, with international sectors handled on request.
            Operations are coordinated out of three desks.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 48 }}>
            {[
              ['Mumbai', 'Head Office & Charter Desk', 'Western India, Gujarat, Goa, and international sectors to the Gulf.'],
              ['Delhi', 'North India Operations', 'NCR, Himalayan sectors, pilgrimage helicopter routes, and Leh operations.'],
              ['Dubai', 'International Desk', 'Gulf-region sectors, long-range jets, and cross-border clearances.'],
            ].map(([city, role, desc]) => (
              <div key={city} style={s.card} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--gold)', marginBottom: 6 }}>{city}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--white-60)', marginBottom: 16 }}>{role}</div>
                <p style={{ ...s.body, fontSize: 14 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '100px 48px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={s.eyebrow}>Frequently Asked</div>
        <h2 style={{ ...s.h2, marginBottom: 48 }}>Questions before you fly</h2>
        {FAQ.map(([q, a]) => (
          <details key={q} style={{ borderBottom: '1px solid var(--white-10)', padding: '22px 0' }}>
            <summary style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 400, cursor: 'pointer', color: 'var(--white)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
              {q}
              <span style={{ color: 'var(--gold)', fontSize: 18 }}>+</span>
            </summary>
            <p style={{ ...s.body, fontSize: 14, marginTop: 14, maxWidth: 820 }}>{a}</p>
          </details>
        ))}
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', padding: '120px 48px', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=1600&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.2)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(12,19,36,0.3) 0%, rgba(12,19,36,0.85) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 400, marginBottom: 20, lineHeight: 1.1 }}>Ready to fly private?</h2>
          <p style={{ fontSize: 17, color: 'var(--white-60)', marginBottom: 48, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>
            Tell us your route and dates. Verified quotations from DGCA-licensed operators arrive within the hour.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/#book" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--gold)', color: 'var(--navy)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>
              Get Fastest Quotes <span>→</span>
            </Link>
            <Link to="/operator" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: 'var(--gold)', border: '1px solid var(--gold)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none' }}>
              Partner as an Operator
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
