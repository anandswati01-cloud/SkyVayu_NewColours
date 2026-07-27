import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useOperatorStore from '../../store/operatorStore'
import { quoteApi, fleetApi, operatorApi } from '../../services/api'
import { showToast } from '../../components/ui/Toast'

const fmt = n => 'Rs.' + Number(n || 0).toLocaleString('en-IN')
const fmtDate = (date) => {
  if (!date) return '—';

  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};
const daysUntil = d => { if (!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000) }
const timeRemaining = ms => { if (ms <= 0) return 'Expired'; const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000); return `${m}m ${String(s).padStart(2, '0')}s` }

// ── Sidebar nav items ──────────────────────────────────────────────────────────
function Sidebar({ section, setSection, user, operator, onLogout, isOwner }) {
  const navItems = [
    { key: 'queries', label: 'Queries', icon: '📋' },
    { key: 'fleet', label: 'Fleet', icon: '✈' },
    { key: 'roster', label: 'Roster', icon: '📅' },
    ...(isOwner ? [
      { key: 'employees', label: 'Employees', icon: '👥' },
      { key: 'revenue', label: 'Revenue', icon: '₹' },
    ] : []),
    { key: 'profile', label: 'Profile', icon: '👤' },
  ]

  const initials = (user?.fullName || user?.username || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  return (
    <aside style={{ width: 220, flexShrink: 0, background: '#0a0f1e', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gold)' }}>SkyVayu</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Operator Portal</div>
      </div>

      <div onClick={() => setSection('profile')} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gold)', flexShrink: 0 }}>{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.fullName || user?.username}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{operator?.companyName}</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {navItems.map(({ key, label, icon }) => (
          <div key={key} onClick={() => setSection(key)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', cursor: 'pointer', color: section === key ? 'var(--gold)' : 'rgba(255,255,255,0.5)', background: section === key ? 'rgba(251,191,36,0.06)' : 'transparent', borderLeft: `2px solid ${section === key ? 'var(--gold)' : 'transparent'}`, fontSize: 13, transition: 'all 0.15s' }}>
            <span>{icon}</span> {label}
          </div>
        ))}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onLogout} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '9px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>Sign out</button>
      </div>
    </aside>
  )
}

// ── Query timer bar ────────────────────────────────────────────────────────────
function TimerBar({ createdAt }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv) }, [])
  const total = 60 * 60 * 1000
  const elapsed = now - new Date(createdAt).getTime()
  const remaining = total - elapsed
  const pct = Math.min((elapsed / total) * 100, 100)
  const expired = remaining <= 0
  const urgent = remaining > 0 && remaining < 10 * 60 * 1000
  const color = expired ? '#e24b4a' : urgent ? '#f59e0b' : 'var(--gold)'
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--font-mono)', color, marginBottom: 4 }}>
        <span>{expired ? 'Window closed' : timeRemaining(remaining)}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 1s' }} />
      </div>
    </div>
  )
}

// ── Quote Modal ───────────────────────────────────────────────────────────────
function QuoteModal({ query, aircraft, onClose, onSubmit, operatorId }) {
  const [selectedAc, setSelectedAc] = useState('')
  const [base, setBase] = useState('')
  const [handling, setHandling] = useState('')
  const [crew, setCrew] = useState('')
  const [catering, setCatering] = useState('')
  const [notes, setNotes] = useState('')
  const [bids, setBids] = useState([])
  const [loading, setLoading] = useState(false)

  const b = parseFloat(base) || 0, h = parseFloat(handling) || 0, c = parseFloat(crew) || 0, ca = parseFloat(catering) || 0
  const subtotal = b + h + c + ca
  const gst = Math.round(subtotal * 0.18)
  const total = subtotal + gst

  useEffect(() => {
    quoteApi.list(`?queryId=${query.id}&status=shared`).then(r => setBids(r.data || [])).catch(() => {})
  }, [query.id])

  const approved = aircraft.filter(a => a.doc_status === 'approved')
  const sel = approved.find(a => a.id === selectedAc)
  const myBid = bids.find(b => b.operator_id === operatorId)
  const lowest = bids.length ? Math.min(...bids.map(b => b.price)) : null
  const isWinning = myBid && myBid.price <= lowest

  async function handleSubmit() {
    if (!selectedAc) { showToast('Please select an aircraft', 'error'); return }
    if (!b) { showToast('Please enter at least a base charge', 'error'); return }
    setLoading(true)
    try {
      await onSubmit(query.id, sel.id, sel.aircraft_type, sel.registration, b, h, c, ca, notes)
      showToast('Quote shared with client', 'success')
      onClose()
    } catch (err) {
      showToast(err.message || 'Failed to submit quote', 'error')
    } finally { setLoading(false) }
  }

  const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '10px 12px', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24, overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: '#0f1a30', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: '100%', maxWidth: 560, margin: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>Submit Quote</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          {/* Query info */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            <strong style={{ color: '#fff' }}>{query.departure || '—'} → {query.destination || '—'}</strong><br />
            {fmtDate(query.flight_date)}{query.flight_time ? ' at ' + query.flight_time : ''} · {query.passengers} pax
          </div>

          {/* Live bids */}
          {bids.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Live bids</div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '12px 14px', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: lowest === bids[0]?.price ? '#4caf50' : 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                  <span>Lowest bid</span><strong>{fmt(lowest)}</strong>
                </div>
                <div style={{ fontSize: 11, color: isWinning ? '#4caf50' : '#f59e0b', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  {myBid ? (isWinning ? '✓ You have the lowest bid' : `You are outbid. Beat ${fmt(lowest)} to win.`) : `Beat ${fmt(lowest)} to lead.`}
                </div>
              </div>
            </div>
          )}

          {/* Aircraft */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Select Aircraft</div>
            <select value={selectedAc} onChange={e => setSelectedAc(e.target.value)} style={{ ...inp }}>
              <option value="">Choose aircraft...</option>
              {approved.map(a => <option key={a.id} value={a.id}>{a.aircraft_type} | {a.registration}</option>)}
            </select>
          </div>

          {/* Charges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[['Base charge', base, setBase], ['Handling fee', handling, setHandling], ['Crew accommodation', crew, setCrew], ['Catering', catering, setCatering]].map(([label, val, setter]) => (
              <div key={label}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{label} (Rs.)</div>
                <input type="number" value={val} onChange={e => setter(e.target.value)} placeholder="0" style={inp} />
              </div>
            ))}
          </div>

          {/* Total breakdown */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
            {[['Subtotal', subtotal], ['GST (18%)', gst]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                <span>{k}</span><span>{fmt(v)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span>Total quote</span><strong>{fmt(total)}</strong>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Notes to client (optional)</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional information..." style={{ ...inp, height: 64, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{ padding: '9px 18px', background: 'var(--gold)', border: 'none', borderRadius: 4, color: '#0c1324', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Submitting…' : 'Share quote with client'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Queries Section ────────────────────────────────────────────────────────────
function QueriesSection({ store }) {
  const { activeQueries, sharedQuotes, confirmedQuotes, expiredQueries, aircraftList, loadAllData, submitQuote, operator } = store
  const [tab, setTab] = useState('active')
  const [quoteModal, setQuoteModal] = useState(null)
  const isOwner = store.isOwner()

  useEffect(() => { loadAllData() }, [])
  useEffect(() => { const iv = setInterval(loadAllData, 10000); return () => clearInterval(iv) }, [])

  const tabStyle = (active) => ({ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', padding: '10px 16px', border: 'none', background: active ? 'rgba(251,191,36,0.1)' : 'transparent', color: active ? 'var(--gold)' : 'rgba(255,255,255,0.4)', borderBottom: `2px solid ${active ? 'var(--gold)' : 'transparent'}`, cursor: 'pointer' })
  const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '16px 20px', marginBottom: 12 }

  function renderActive() {
    if (!activeQueries.length) return <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>No active queries right now. New client queries will appear here.</div>
    return activeQueries.map(q => (
      <div key={q.id} style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 4 }}>{q.departure || '—'} → {q.destination || '—'}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{fmtDate(q.flight_date)}{q.flight_time ? ' at ' + q.flight_time : ''} · {q.passengers} pax{q.medivac ? ' · Medivac' : ''}{q.pets ? ' · Pets' : ''}{q.vip ? ' · VIP' : ''}</div>
          </div>
          <button onClick={() => setQuoteModal(q)} style={{ background: 'rgba(23,176,214,0.15)', border: '1px solid rgba(23,176,214,0.4)', borderRadius: 4, padding: '8px 16px', color: '#17b0d6', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>Submit quote</button>
        </div>
        <TimerBar createdAt={q.created_at} />
      </div>
    ))
  }

  function renderShared() {
    if (!sharedQuotes.length) return <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>No quotes shared yet.</div>
    return sharedQuotes.map(q => (
      <div key={q.id} style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 4 }}>{q.aircraft_type} {q.aircraft_registration ? `(${q.aircraft_registration})` : ''}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Shared · Quote: {fmt(q.price)}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              Created Date: {fmtDate(q.created_at)}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gold)' }}>{fmt(q.price)}</div>
          
        </div>
      </div>
    ))
  }

  function renderConfirmed() {
    if (!confirmedQuotes.length) return <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>No confirmed bookings yet.</div>
    return confirmedQuotes.map(q => (
      <div key={q.id} style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 4 }}>{q.aircraft_type}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Revenue: {fmt(q.price)}</div>
             <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              Created Date: {fmtDate(q.created_at)}
            </div>

          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', background: '#2E7D52', color: '#fff', padding: '4px 10px', borderRadius: 3 }}>Confirmed</span>
        </div>
      </div>
    ))
  }

  function renderExpired() {
    if (!expiredQueries.length) return <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>No expired queries.</div>
    return expiredQueries.map(q => (
      <div key={q.id} style={{ ...cardStyle, opacity: 0.6 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 4 }}>{q.departure || '—'} → {q.destination || '—'}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{fmtDate(q.flight_date)} · Window closed</div>
        <TimerBar createdAt={q.created_at} />
      </div>
    ))
  }

  const tabs = [
    { key: 'active', label: 'Active', count: activeQueries.length },
    { key: 'shared', label: 'Quote Shared', count: sharedQuotes.length },
    { key: 'confirmed', label: 'Confirmed', count: confirmedQuotes.length },
    { key: 'expired', label: 'Expired', count: expiredQueries.length },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, marginBottom: 4 }}>Queries</h1>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', marginTop: 20 }}>
          {tabs.map(t => (
            <button key={t.key} style={tabStyle(tab === t.key)} onClick={() => setTab(t.key)}>
              {t.label} <span style={{ marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: 10, background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 10 }}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        {tab === 'active' && renderActive()}
        {tab === 'shared' && renderShared()}
        {tab === 'confirmed' && renderConfirmed()}
        {tab === 'expired' && renderExpired()}
      </div>
      {quoteModal && (
        <QuoteModal query={quoteModal} aircraft={aircraftList} operatorId={operator?.id} onClose={() => { setQuoteModal(null); loadAllData() }}
          onSubmit={async (...args) => { await submitQuote(...args); setQuoteModal(null); loadAllData() }} />
      )}
    </div>
  )
}

// ── Fleet Section ──────────────────────────────────────────────────────────────
function FleetSection({ store }) {
  const { aircraftList, loadFleet, operator } = store
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ aircraftType: '', registration: '', seatsAvailable: '' })
  const [loading, setLoading] = useState(false)
  const isOwner = store.isOwner()

  useEffect(() => { loadFleet() }, [])

  async function addAircraft() {
    if (!form.aircraftType || !form.registration) { showToast('Please enter aircraft type and registration.', 'error'); return }
    setLoading(true)
    try {
      await fleetApi.add({ ...form, seatsAvailable: parseInt(form.seatsAvailable) || null })
      showToast('Aircraft submitted for review', 'success')
      setShowAdd(false)
      setForm({ aircraftType: '', registration: '', seatsAvailable: '' })
      loadFleet()
    } catch (err) {
      showToast(err.message || 'Failed to add aircraft', 'error')
    } finally { setLoading(false) }
  }

  async function removeAircraft(id) {
    if (!confirm('Remove this aircraft?')) return
    try { await fleetApi.delete(id); loadFleet(); showToast('Aircraft removed', 'success') } catch (err) { showToast(err.message, 'error') }
  }

  const docStatus = (ac) => {
    const docs = [['C of R', ac.cor_expiry], ['C of A', ac.coa_expiry], ['ARC', ac.arc_expiry], ['Insurance', ac.insurance_expiry]]
    return docs.filter(([, e]) => e && daysUntil(e) !== null).map(([name, exp]) => {
      const d = daysUntil(exp)
      return d <= 0 ? { name, label: '⚠ Expired', color: '#e24b4a' } : d <= 30 ? { name, label: `⚠ ${d}d left`, color: '#f59e0b' } : null
    }).filter(Boolean)
  }

  const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '10px 12px', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none', marginBottom: 12 }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400 }}>Fleet</h1>
        {isOwner && <button onClick={() => setShowAdd(true)} style={{ background: 'rgba(23,176,214,0.15)', border: '1px solid rgba(23,176,214,0.4)', borderRadius: 4, padding: '9px 18px', color: '#17b0d6', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>+ Add aircraft</button>}
      </div>

      {aircraftList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>No aircraft added yet. {isOwner ? 'Add your fleet to start submitting quotes.' : 'Ask your admin to add aircraft.'}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {aircraftList.map(ac => {
            const warnings = docStatus(ac)
            const statusColor = ac.doc_status === 'approved' ? '#4caf50' : ac.doc_status === 'rejected' ? '#e24b4a' : '#f59e0b'
            return (
              <div key={ac.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${ac.doc_status === 'approved' ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.3)'}`, borderRadius: 6, padding: '20px', position: 'relative' }}>
                {isOwner && <button onClick={() => removeAircraft(ac.id)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 16, cursor: 'pointer' }}>✕</button>}
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 4 }}>{ac.aircraft_type}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{ac.registration}</div>
                {ac.seats_available && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{ac.seats_available} seats</div>}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', background: `${statusColor}20`, color: statusColor, padding: '3px 8px', borderRadius: 3 }}>{ac.doc_status === 'approved' ? 'Approved' : ac.doc_status === 'rejected' ? 'Rejected' : 'Under review'}</span>
                {warnings.map(w => (
                  <div key={w.name} style={{ fontSize: 11, color: w.color, marginTop: 6 }}>{w.name} — {w.label}</div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Aircraft Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }} onClick={() => setShowAdd(false)}>
          <div style={{ background: '#0f1a30', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: '100%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>Add aircraft</div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              {[['Aircraft type', 'aircraftType', 'text', 'e.g. Citation XLS'], ['Registration (VT-XXX)', 'registration', 'text', 'e.g. VT-ABC'], ['Seats', 'seatsAvailable', 'number', 'e.g. 8']].map(([label, key, type, ph]) => (
                <div key={key}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{label}</div>
                  <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} style={inp} />
                </div>
              ))}
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Note: All aircraft documents (C of R, C of A, ARC, Insurance) must be submitted for review before the aircraft can be used to submit quotes. Please contact SkyVayu admin to upload documents.</div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addAircraft} disabled={loading} style={{ padding: '9px 18px', background: 'var(--gold)', border: 'none', borderRadius: 4, color: '#0c1324', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Employees Section ──────────────────────────────────────────────────────────
function EmployeesSection({ store }) {
  const { operatorUsers, operator, loadAllData } = store
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', fullName: '', email: '' })
  const [loading, setLoading] = useState(false)

  const employees = operatorUsers.filter(u => u.role === 'employee')
  const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '10px 12px', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none', marginBottom: 12 }

  async function addEmployee() {
    if (!form.username || !form.password || !form.fullName) { showToast('Please fill in all fields', 'error'); return }
    setLoading(true)
    try {
      await operatorApi.addUser(operator.id, { ...form, role: 'employee' })
      showToast('Employee submitted for SkyVayu approval', 'success')
      setShowAdd(false); setForm({ username: '', password: '', fullName: '', email: '' }); loadAllData()
    } catch (err) { showToast(err.message || 'Username already taken', 'error') }
    finally { setLoading(false) }
  }

  async function toggleActive(uid, isActive) {
    try { await operatorApi.updateUser(operator.id, uid, { isActive: !isActive }); loadAllData(); showToast(isActive ? 'Employee deactivated' : 'Employee reactivated', 'success') }
    catch (err) { showToast(err.message, 'error') }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400 }}>Employees</h1>
        <button onClick={() => setShowAdd(true)} style={{ background: 'rgba(23,176,214,0.15)', border: '1px solid rgba(23,176,214,0.4)', borderRadius: 4, padding: '9px 18px', color: '#17b0d6', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>+ Add employee</button>
      </div>

      {employees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>No employees added. Create accounts for your sales team.</div>
      ) : employees.map(e => (
        <div key={e.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '16px 20px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 4 }}>{e.full_name || e.username}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>@{e.username}{e.email ? ' · ' + e.email : ''}</div>
            {!e.is_approved && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 6px', borderRadius: 3, marginTop: 4, display: 'inline-block' }}>Pending approval</span>}
          </div>
          <button onClick={() => toggleActive(e.id, e.is_active)} style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${e.is_active ? 'rgba(226,75,74,0.4)' : 'rgba(76,175,80,0.4)'}`, borderRadius: 4, color: e.is_active ? '#e24b4a' : '#4caf50', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>
            {e.is_active ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      ))}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }} onClick={() => setShowAdd(false)}>
          <div style={{ background: '#0f1a30', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>Add employee</div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              {[['Full Name', 'fullName', 'text'], ['Email', 'email', 'email'], ['Username', 'username', 'text'], ['Password', 'password', 'password']].map(([label, key, type]) => (
                <div key={key}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{label}</div>
                  <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inp} />
                </div>
              ))}
              <div style={{ fontSize: 12, color: 'rgba(23,176,214,0.7)', background: 'rgba(23,176,214,0.08)', border: '1px solid rgba(23,176,214,0.2)', borderRadius: 4, padding: '10px 14px' }}>This employee will need SkyVayu approval before they can log in.</div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addEmployee} disabled={loading} style={{ padding: '9px 18px', background: 'var(--gold)', border: 'none', borderRadius: 4, color: '#0c1324', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Submitting…' : 'Submit for approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Revenue Section ────────────────────────────────────────────────────────────
function RevenueSection({ store }) {
  const { confirmedQuotes, operatorUsers } = store
  const total = confirmedQuotes.reduce((a, q) => a + Number(q.price || 0), 0)
  const now = new Date()
  const thisMonth = confirmedQuotes.filter(q => { const d = new Date(q.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }).reduce((a, q) => a + Number(q.price || 0), 0)

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, marginBottom: 32 }}>Revenue</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
        {[['Total Revenue', fmt(total)], ['This Month', fmt(thisMonth)], ['Confirmed Bookings', confirmedQuotes.length]].map(([label, val]) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '24px 28px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--gold)' }}>{val}</div>
          </div>
        ))}
      </div>
      {confirmedQuotes.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>No confirmed bookings yet. Revenue will appear here once you have confirmed bookings.</div>}
    </div>
  )
}

// ── Profile Section ────────────────────────────────────────────────────────────
function ProfileSection({ store }) {
  const { user, operator, logout } = store
  const navigate = useNavigate()

  async function handleLogout() { logout(); navigate('/operator') }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, marginBottom: 32 }}>Profile</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '24px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Personal Details</div>
          {[['Full Name', user?.fullName || user?.username], ['Username', user?.username], ['Email', user?.email], ['Role', user?.role === 'owner' ? 'Admin' : 'Employee']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{k}</span>
              <span style={{ color: '#fff', fontWeight: 500 }}>{v || '—'}</span>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '24px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Company Details</div>
          {[['Company Name', operator?.companyName], ['Aircraft Category', operator?.aircraftCategory], ['Approval Status', operator?.approvalStatus], ['AOP Expiry', operator?.aopExpiryDate || 'Not set']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{k}</span>
              <span style={{ color: '#fff', fontWeight: 500 }}>{v || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function OperatorDashboard() {
  const navigate = useNavigate()
  const store = useOperatorStore()
  const [section, setSection] = useState('queries')

  useEffect(() => {
    const ok = store.init()
    if (!ok) navigate('/operator')
  }, [])

  useEffect(() => {
    if (store.operator) store.loadFleet()
  }, [store.operator])

  if (!store.user) return <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading…</div>

  const isOwner = store.isOwner()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0f1e' }}>
      <Sidebar section={section} setSection={setSection} user={store.user} operator={store.operator} isOwner={isOwner} onLogout={() => { store.logout(); navigate('/operator') }} />
      <main style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
        {section === 'queries' && <QueriesSection store={store} />}
        {section === 'fleet' && <FleetSection store={store} />}
        {section === 'roster' && <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'rgba(255,255,255,0.3)' }}>Roster — Coming soon</div>}
        {section === 'employees' && isOwner && <EmployeesSection store={store} />}
        {section === 'revenue' && isOwner && <RevenueSection store={store} />}
        {section === 'profile' && <ProfileSection store={store} />}
      </main>
    </div>
  )
}
