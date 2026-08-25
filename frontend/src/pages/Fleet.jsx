import { useState } from 'react'
import useSectionNav from '../components/layout/useSectionNav'
import './v2pages.css'

/* Ported from the Charter-v2 site (fleet.html).
 *
 * The original filtered by writing style.display on each card from an inline
 * onclick; here the active category is state and the grid renders what matches,
 * so the DOM never disagrees with the highlighted button.
 *
 * This page shows the aircraft *types* SkyVayu can source — it is marketing
 * copy, not the live fleet. It deliberately makes no API call: the real, live
 * tail-by-tail fleet lives behind the operator portal.
 */

const CATEGORIES = [
  ['all', 'All Aircraft'],
  ['turboprop', 'Turboprop'],
  ['light-jet', 'Light Jet'],
  ['midsize-jet', 'Midsize Jet'],
  ['heavy-jet', 'Heavy Jet'],
]

const AIRCRAFT = [
  {
    category: 'turboprop',
    badge: 'Turboprop',
    name: 'King Air C90',
    fullName: 'Beechcraft King Air C90GTx',
    passengers: '6',
    range: '1,860',
    speed: '295',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Beechcraft_King_Air_C90_N268CA_FDK_MD2.jpg/1280px-Beechcraft_King_Air_C90_N268CA_FDK_MD2.jpg',
    alt: 'King Air C90 turboprop aircraft',
  },
  {
    category: 'turboprop',
    badge: 'Turboprop',
    name: 'King Air B200',
    fullName: 'Beechcraft King Air B200GT',
    passengers: '9',
    range: '2,870',
    speed: '530',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Beechcraft_Super_King_Air_B200_vr.jpg/1280px-Beechcraft_Super_King_Air_B200_vr.jpg',
    alt: 'King Air B200 turboprop',
  },
  {
    category: 'light-jet',
    badge: 'Light Jet',
    name: 'Citation CJ2',
    fullName: 'Cessna Citation CJ2+',
    passengers: '7',
    range: '3,220',
    speed: '745',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Cessna_525A_Citation_CJ2%2B%2C_D-IBBS%2C_Airport_Cologne_Bonn-7211.jpg/1280px-Cessna_525A_Citation_CJ2%2B%2C_D-IBBS%2C_Airport_Cologne_Bonn-7211.jpg',
    alt: 'Citation CJ2 light jet',
  },
  {
    category: 'midsize-jet',
    badge: 'Midsize Jet',
    name: 'Hawker 800',
    fullName: 'Hawker Beechcraft 800XP',
    passengers: '9',
    range: '5,150',
    speed: '820',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Hawker_800XP_N800TH_FDK_MD1.jpg/1280px-Hawker_800XP_N800TH_FDK_MD1.jpg',
    alt: 'Hawker 800 midsize jet',
  },
  {
    category: 'heavy-jet',
    badge: 'Heavy Jet',
    name: 'Falcon 2000',
    fullName: 'Dassault Falcon 2000LXS',
    passengers: '10',
    range: '7,400',
    speed: '900',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Dassault_Falcon_2000_N506DJ_MD1.jpg/1280px-Dassault_Falcon_2000_N506DJ_MD1.jpg',
    alt: 'Falcon 2000 heavy jet',
  },
  {
    category: 'heavy-jet',
    badge: 'Heavy Jet',
    name: 'Legacy 650',
    fullName: 'Embraer Legacy 650E',
    passengers: '14',
    range: '7,224',
    speed: '870',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/UP-EM007_Embraer_ERJ_135BJ_Legacy_650_Comlux_%288559949419%29.jpg/1280px-UP-EM007_Embraer_ERJ_135BJ_Legacy_650_Comlux_%288559949419%29.jpg',
    alt: 'Embraer Legacy 650 heavy jet',
  },
]

export default function Fleet() {
  const [active, setActive] = useState('all')
  const goToSection = useSectionNav()

  const shown = active === 'all' ? AIRCRAFT : AIRCRAFT.filter(a => a.category === active)

  return (
    <div className="v2page">
      <header className="page-header">
        <div className="page-label">Our Fleet</div>
        <h1 className="page-title">Every aircraft.<br /><em>One platform.</em></h1>
        <p className="page-subtitle">
          From short-hop turboprops to ultra-long-range heavy jets — SkyVayu gives you access to
          India's most comprehensive charter fleet through our network of verified operator partners.
        </p>

        <div className="nsop-notice">
          <div className="nsop-notice-title">A note on how we operate</div>
          <div className="nsop-notice-body">
            SkyVayu is <strong>not a Non-Scheduled Operator Permit (NSOP) holder</strong>. We are a
            technology platform that connects passengers directly with{' '}
            <strong>DGCA-licensed NSOP operators</strong> across India. Every aircraft you see here
            is operated by a verified partner operator under their own DGCA-issued permit — full
            regulatory compliance, competitive pricing, no added layers.
          </div>
        </div>
      </header>

      <div className="filter-bar">
        {CATEGORIES.map(([key, label]) => (
          <button
            key={key}
            className={`filter-btn${active === key ? ' active' : ''}`}
            aria-pressed={active === key}
            onClick={() => setActive(key)}>
            {label}
          </button>
        ))}
      </div>

      <section className="fleet-section">
        <div className="fleet-grid">
          {shown.map(a => (
            <div className="aircraft-card" key={a.name}>
              <div className="aircraft-img-wrap">
                <img src={a.img} alt={a.alt} loading="lazy" />
                <span className="aircraft-category-badge">{a.badge}</span>
              </div>
              <div className="aircraft-body">
                <div className="aircraft-name">{a.name}</div>
                <div className="aircraft-full-name">{a.fullName}</div>
                <div className="aircraft-specs">
                  <div className="spec-item">
                    <div className="spec-value">{a.passengers}</div>
                    <div className="spec-label">Passengers</div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-value">{a.range}</div>
                    <div className="spec-label">Range (km)</div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-value">{a.speed}</div>
                    <div className="spec-label">Speed (km/h)</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="fleet-cta">
        <div className="fleet-cta-label">Ready to fly?</div>
        <div className="fleet-cta-heading">Don't see what you need?<br /><em>We'll find it.</em></div>
        <p className="fleet-cta-sub">
          Our operator network covers more than what's listed here, across 115+ airports nationwide
          and beyond. Tell us your mission — passengers, sector, and dates — and we'll source the
          right aircraft and return a quotation within 60 minutes.
        </p>
        {/* v2 pointed at /#book. This app's request form is the #booking section
            of the home page, and useSectionNav navigates there from any route. */}
        <button className="fleet-cta-btn" onClick={() => goToSection('booking')}>
          Get Fastest Quotes →
        </button>
      </section>
    </div>
  )
}
