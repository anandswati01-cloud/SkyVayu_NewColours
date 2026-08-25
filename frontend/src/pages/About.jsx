import useSectionNav from '../components/layout/useSectionNav'
import './v2pages.css'

/* Ported from the Charter-v2 site (about.html). Static marketing copy — no API
 * call, no state beyond the shared section-scroll helper used by the CTA. */

const STATS = [
  ['350+', 'Airports Covered'],
  ['60', 'Min. Avg. Quotation'],
  ['100%', 'DGCA Verified'],
  ['₹0', '₹0 — No Added Fees'],
]

const DIFFERENTIATORS = [
  {
    icon: '✓',
    title: 'Verified operators only',
    body: 'Every operator on SkyVayu is DGCA licensed and manually verified before being listed. Safety is not a selling point — it is a baseline requirement.',
  },
  {
    icon: '⚡',
    title: 'Live competitive quotes',
    body: "Operators compete for your booking in real time. You receive multiple verified quotations within 60 minutes and choose based on aircraft, price, and operator credentials — not a broker's preference.",
  },
  {
    icon: '₹',
    title: 'Zero hidden charges',
    body: 'Every quotation is final. No surprises at checkout, no last-minute additions. GST applicable.',
  },
  {
    icon: '🌏',
    title: 'Domestic & international',
    body: "From Leh to Lakshadweep, Mumbai to Dubai — one platform covers every route. India's most comprehensive charter marketplace, built for wherever you need to be.",
  },
  {
    icon: '✚',
    title: 'Speciality missions',
    body: 'Medivac, VIP transport, cargo, pet travel — SkyVayu handles non-standard missions that generic platforms cannot. Purpose-built for the full spectrum of charter needs.',
  },
  {
    icon: '🔒',
    title: 'Secured payments',
    body: 'Every transaction is processed through a fully secured payment gateway. Your financial details are protected at every stage, with 100% payment security guaranteed.',
  },
]

export default function About() {
  const goToSection = useSectionNav()

  return (
    <div className="v2page">
      <header className="page-header">
        <div className="page-label">About SkyVayu</div>
        <h1 className="page-title">Private aviation,<br /><em>reimagined for India.</em></h1>
      </header>

      <section className="about-section">
        <div className="section-label">Our Story</div>
        <div className="section-grid">
          <div className="section-heading">Built on a single conviction.</div>
          <div className="section-body">
            <p>
              SkyVayu was built on a single conviction: booking a charter flight should be as
              transparent and fast as any other premium service. No intermediaries. No opacity.
              No guesswork.
            </p>
            <p>
              We connect travellers directly with India's finest DGCA-licensed operators —
              delivering verified quotations within 60 minutes, across 350+ airports nationwide
              and beyond.
            </p>
          </div>
        </div>

        <div className="stats-grid">
          {STATS.map(([number, label]) => (
            <div className="stat-item" key={label}>
              <div className="stat-number">{number}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section">
        <div className="section-label">Our Mission</div>
        <div className="section-grid">
          <div className="section-heading">Democratising access to <em>private skies.</em></div>
          <div className="section-body">
            <p>
              For too long, private aviation in India has been locked behind a wall of middlemen,
              inflated pricing, and opaque processes. SkyVayu tears that wall down.
            </p>
            <p>
              Our platform lets verified operators compete for your booking in real time — which
              means you always receive the best available market rate, with complete transparency
              at every step.
            </p>
            <p>
              From urgent medivac flights to leisure trips to Lakshadweep, SkyVayu handles it all
              on one unified platform built for people who cannot afford to waste time.
            </p>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="section-label">What Makes Us Different</div>
        <div className="diff-heading">Built different, <em>by design.</em></div>
        <div className="diff-grid">
          {DIFFERENTIATORS.map(d => (
            <div className="diff-item" key={d.title}>
              <div className="diff-icon">{d.icon}</div>
              <div className="diff-title">{d.title}</div>
              <div className="diff-body">{d.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="promise-section">
        <div className="promise-label">Our Promise</div>
        <div className="promise-heading">The sky is yours.<br /><em>We just make it simpler.</em></div>
        <p className="promise-body">
          SkyVayu exists to give every passenger the information, confidence, and speed they
          deserve when booking a charter flight. We are India's charter marketplace — built on
          trust, driven by technology, defined by transparency.
        </p>
        {/* v2 pointed at /#book; the request form is the #booking section of Home. */}
        <button className="promise-cta" onClick={() => goToSection('booking')}>
          Get Fastest Quotes →
        </button>
      </section>
    </div>
  )
}
