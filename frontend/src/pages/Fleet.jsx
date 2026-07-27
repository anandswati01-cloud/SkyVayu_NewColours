import { useState } from 'react'
import { Link } from 'react-router-dom'

const GROUPS = ['All Aircraft', 'Jets', 'Turboprops', 'Helicopters', 'Special Mission']

const FLEET = [
  {
    group: 'Turboprops', name: 'Turboprop', tag: 'Short sector workhorse',
    pax: '6 – 9', range: '1,500 – 2,000 km', speed: '450 – 500 km/h', runway: '1,000 m',
    examples: 'Beechcraft King Air B200 · Pilatus PC-12 · Cessna Grand Caravan',
    best: 'Regional hops and site visits. Operates comfortably from short, semi-prepared strips that jets cannot use.',
  },
  {
    group: 'Jets', name: 'Light Jet', tag: 'The everyday business jet',
    pax: '6 – 8', range: '2,000 – 3,500 km', speed: '750 – 830 km/h', runway: '1,200 m',
    examples: 'Citation CJ2 / CJ3 · Embraer Phenom 100 / 300 · Hawker 400XP',
    best: 'Mumbai–Delhi, Delhi–Goa, and similar one-day return trips at jet speed without heavy-jet cost.',
  },
  {
    group: 'Jets', name: 'Midsize Jet', tag: 'Stand-up cabin, national reach',
    pax: '8 – 9', range: '4,000 – 5,000 km', speed: '800 – 850 km/h', runway: '1,500 m',
    examples: 'Hawker 800XP / 900XP · Citation XLS+ · Learjet 60',
    best: 'Cross-country sectors with a full-height cabin, enclosed lavatory, and baggage capacity for a working team.',
  },
  {
    group: 'Jets', name: 'Super-Midsize & Heavy Jet', tag: 'Boardroom at altitude',
    pax: '10 – 16', range: '6,000 – 9,000 km', speed: '850 – 900 km/h', runway: '1,800 m',
    examples: 'Challenger 605 · Falcon 2000 · Gulfstream G200 / G450 · Legacy 600',
    best: 'Non-stop regional international sectors — the Gulf, South-East Asia — with a cabin configured for meetings.',
  },
  {
    group: 'Jets', name: 'Ultra-Long-Range Jet', tag: 'Intercontinental, non-stop',
    pax: '13 – 19', range: '11,000 – 14,000 km', speed: '900 – 950 km/h', runway: '1,900 m',
    examples: 'Global 6000 / 7500 · Gulfstream G650 · Falcon 8X',
    best: 'India to Europe or North America without a technical stop, with a separate stateroom and full crew service.',
  },
  {
    group: 'Helicopters', name: 'Light Helicopter', tag: 'Point to point, no runway',
    pax: '4 – 6', range: '600 – 700 km', speed: '220 – 260 km/h', runway: 'Helipad',
    examples: 'Bell 407 · Airbus H125 / H130 · AgustaWestland AW109',
    best: 'Pilgrimage routes, hill stations, plant and project inspections, and city-centre to airport transfers.',
  },
  {
    group: 'Helicopters', name: 'Medium Twin Helicopter', tag: 'Twin-engine capability',
    pax: '8 – 12', range: '700 – 900 km', speed: '260 – 300 km/h', runway: 'Helipad',
    examples: 'AgustaWestland AW139 · Airbus H145 / AS365 · Bell 412',
    best: 'Offshore and remote-site operations, larger groups, and sectors that call for twin-engine redundancy.',
  },
  {
    group: 'Special Mission', name: 'Air Ambulance', tag: 'Flying intensive care',
    pax: '1 patient + 2 – 4', range: '1,500 – 4,000 km', speed: '450 – 800 km/h', runway: 'Varies',
    examples: 'King Air B200 (ICU fit) · Learjet 45 · AW139 medivac configuration',
    best: 'Emergency evacuation with stretcher, ventilator, defibrillator, and a doctor–paramedic team on board.',
  },
  {
    group: 'Special Mission', name: 'VIP Airliner', tag: 'Delegation-scale travel',
    pax: '19 – 50', range: '5,000 – 10,000 km', speed: '850 – 900 km/h', runway: '2,000 m',
    examples: 'Airbus ACJ319 · Boeing BBJ · Embraer Lineage 1000',
    best: 'Sports teams, film units, corporate delegations, and roadshows moving as a single group.',
  },
]

const INCLUDED = [
  ['Crew & handling', 'Flight crew, ground handling, and landing charges are quoted as part of the sector price.'],
  ['Catering', 'Standard catering on board, with vegetarian, Jain, and custom menus arranged on request.'],
  ['Baggage', 'Hold capacity confirmed against your passenger count before the quotation is issued.'],
  ['Terminal access', 'General aviation terminal use where available, so boarding takes minutes rather than hours.'],
  ['Special requests', 'Pet-friendly cabins, infant seating, medical equipment, and VIP protocol arranged in advance.'],
  ['Taxes', 'GST and applicable statutory charges shown separately — never folded into the flying rate.'],
]

const CHECKS = [
  'Certificate of Registration (CoR)',
  'Certificate of Airworthiness (CoA)',
  'Airworthiness Review Certificate (ARC)',
  'Hull and passenger liability insurance',
  'Operator DGCA Non-Scheduled Operator Permit',
  'Crew licence currency and recency',
]

const s = {
  eyebrow: { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 },
  h2: { fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 400, lineHeight: 1.1, marginBottom: 0 },
  body: { fontSize: 15, lineHeight: 1.8, color: 'var(--white-60)' },
  specLabel: { fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--white-30)', marginBottom: 6 },
  specValue: { fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 400, color: 'var(--white)' },
  filterBtn: (active) => ({
    fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.2px', textTransform: 'uppercase',
    padding: '9px 20px', borderRadius: 2, cursor: 'pointer',
    color: active ? 'var(--navy)' : 'var(--white-60)',
    background: active ? 'var(--gold)' : 'transparent',
    border: `1px solid ${active ? 'var(--gold)' : 'var(--white-10)'}`,
    transition: 'all 0.2s',
  }),
}

export default function Fleet() {
  const [group, setGroup] = useState('All Aircraft')
  const visible = group === 'All Aircraft' ? FLEET : FLEET.filter(a => a.group === group)

  return (
    <div>
      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=1600&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.25)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(12,19,36,0.6) 0%, rgba(12,19,36,0.75) 50%, var(--navy) 100%)' }} />

        <div style={{ position: 'relative', zIndex: 2, padding: '180px 48px 100px', maxWidth: 1280, margin: '0 auto', animation: 'fadeUp 0.6s ease both' }}>
          <div style={{ ...s.eyebrow, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'block', width: 32, height: 1, background: 'var(--gold)' }} />
            The Fleet
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 6vw, 76px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: -1, marginBottom: 28, maxWidth: 900 }}>
            From short strips to<br />
            <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>intercontinental range.</em>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.8, color: 'var(--white-60)', maxWidth: 620 }}>
            SkyVayu does not own aircraft — it opens access to them. Every category below is flown by
            DGCA-licensed operators on our network. Tell us the route and passenger count, and the operators
            best suited to it will quote with the exact tail they intend to assign.
          </p>
        </div>
      </section>

      {/* CATEGORY FILTER + CARDS */}
      <section style={{ padding: '0 48px 100px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
          {GROUPS.map(g => (
            <button key={g} style={s.filterBtn(group === g)} onClick={() => setGroup(g)}>{g}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
          {visible.map(a => (
            <div key={a.name}
              style={{ padding: 36, border: '1px solid rgba(251,191,36,0.35)', borderRadius: 4, background: 'rgba(255,255,255,0.02)', transition: 'all 0.3s', display: 'flex', flexDirection: 'column' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>{a.tag}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 400, marginBottom: 24 }}>{a.name}</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: '20px 0', borderTop: '1px solid rgba(251,191,36,0.35)', borderBottom: '1px solid rgba(251,191,36,0.35)', marginBottom: 20 }}>
                {[['Passengers', a.pax], ['Range', a.range], ['Cruise', a.speed], ['Runway', a.runway]].map(([label, value]) => (
                  <div key={label}>
                    <div style={s.specLabel}>{label}</div>
                    <div style={{ ...s.specValue, fontSize: 16 }}>{value}</div>
                  </div>
                ))}
              </div>

              <p style={{ ...s.body, fontSize: 14, marginBottom: 20, flex: 1 }}>{a.best}</p>

              <div>
                <div style={s.specLabel}>Typical Aircraft</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--white-60)' }}>{a.examples}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.5px', color: 'var(--white-30)', lineHeight: 1.8, marginTop: 32, maxWidth: 900 }}>
          Specifications are indicative category ranges. Actual seating, range, and runway requirement vary by
          tail number, configuration, payload, and weather — confirmed figures appear on each operator quotation.
        </p>
      </section>

      {/* WHAT'S INCLUDED */}
      <section style={{ padding: '100px 48px', background: 'var(--navy-mid)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={s.eyebrow}>On Every Charter</div>
          <h2 style={s.h2}>What the quotation covers</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 56 }}>
            {INCLUDED.map(([title, desc]) => (
              <div key={title} style={{ padding: 32, border: '1px solid rgba(251,191,36,0.35)', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 400, marginBottom: 10 }}>{title}</div>
                <p style={{ ...s.body, fontSize: 14 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VETTING */}
      <section style={{ padding: '100px 48px', maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 64 }}>
        <div>
          <div style={s.eyebrow}>Airworthiness</div>
          <h2 style={{ ...s.h2, marginBottom: 24 }}>Every tail is documented before it can quote</h2>
          <p style={{ ...s.body, marginBottom: 20 }}>
            Operators upload documentation for each aircraft they list. Nothing becomes quotable until those
            documents are reviewed and approved, and an expired certificate takes the aircraft off the platform
            until it is renewed.
          </p>
          <Link to="/operator" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)', textDecoration: 'none', borderBottom: '1px solid var(--gold)', paddingBottom: 4 }}>
            List your aircraft →
          </Link>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {CHECKS.map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px', border: '1px solid rgba(251,191,36,0.35)', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ color: 'var(--gold)', fontSize: 14, lineHeight: 1.6 }}>✓</span>
              <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--white-60)' }}>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', padding: '120px 48px', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.2)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(12,19,36,0.3) 0%, rgba(12,19,36,0.85) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 400, marginBottom: 20, lineHeight: 1.1 }}>Not sure which aircraft fits?</h2>
          <p style={{ fontSize: 17, color: 'var(--white-60)', marginBottom: 48, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>
            Send the route, date, and passenger count. Operators will propose the right category — and the exact
            aircraft — within the hour.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/#book" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--gold)', color: 'var(--navy)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>
              Get Fastest Quotes <span>→</span>
            </Link>
            <Link to="/about" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: 'var(--gold)', border: '1px solid var(--gold)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none' }}>
              About SkyVayu
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
