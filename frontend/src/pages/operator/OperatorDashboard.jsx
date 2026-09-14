import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useOperatorStore from '../../store/operatorStore'
import { quoteApi, fleetApi, operatorApi } from '../../services/api'
import { showToast } from '../../components/ui/Toast'
import { Icon, Modal, ConfirmDialog, SkeletonCards, SkeletonTiles } from './OperatorUI'
import logo from '../../assets/skyvayu-wordmark.png'
import './operator.css'

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

// Declared at module scope so the mobile top bar can look up the current
// section's label without duplicating the list.
const NAV_ITEMS = [
  { key: 'queries', label: 'Queries' },
  { key: 'fleet', label: 'Fleet' },
  { key: 'roster', label: 'Roster' },
  { key: 'employees', label: 'Employees', owner: true },
  { key: 'revenue', label: 'Revenue', owner: true },
  { key: 'profile', label: 'Profile' },
]

const navItemsFor = isOwner => NAV_ITEMS.filter(i => !i.owner || isOwner)

// ── Sidebar nav items ──────────────────────────────────────────────────────────
function Sidebar({ section, setSection, user, operator, onLogout, isOwner, open }) {
  const initials = (user?.fullName || user?.username || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  return (
    <aside className={`op__side${open ? ' is-open' : ''}`}>
      <div className="op__brand">
        {/* Wrapper shrinks to the mark's width so the caption centres under the
            logo rather than under the full sidebar. */}
        <div className="op__brand-mark">
          <img className="op__logo" src={logo} alt="SkyVayu" />
          <div className="op__brand-sub">Operator Portal</div>
        </div>
      </div>

      {/* A button rather than a clickable div: this is the shortcut into the
          Profile section and has to be reachable from the keyboard. */}
      <button type="button" className="op__me" onClick={() => setSection('profile')}>
        <div className="op__avatar">{initials}</div>
        <div className="op__me-txt">
          <div className="op__me-name">{user?.fullName || user?.username}</div>
          <div className="op__me-org">{operator?.companyName}</div>
        </div>
      </button>

      <nav className="op__nav">
        {navItemsFor(isOwner).map(({ key, label }) => (
          <button
            type="button"
            key={key}
            onClick={() => setSection(key)}
            aria-current={section === key ? 'page' : undefined}
            className={`op__nav-item${section === key ? ' is-active' : ''}`}>
            <Icon name={key} /> {label}
          </button>
        ))}
      </nav>

      <div className="op__side-foot">
        <button className="op__signout" onClick={onLogout}>Sign out</button>
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
  const color = expired ? 'var(--op-bad)' : urgent ? 'var(--op-warn)' : 'var(--op-accent)'
  return (
    <div className="op-timer">
      <div className="op-timer__row" style={{ color }}>
        <span>{expired ? 'Window closed' : timeRemaining(remaining)}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="op-timer__track">
        <div className="op-timer__fill" style={{ width: `${pct}%`, background: color }} />
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

  return (
    <Modal
      title="Submit Quote"
      onClose={onClose}
      footer={
        <>
          <button className="op-btn op-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="op-btn op-btn--gold" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting…' : 'Share quote with client'}
          </button>
        </>
      }>
      {/* Query info */}
      <div className="op-box op-box--query op-mb-lg">
        <strong>{query.departure || '—'} → {query.destination || '—'}</strong><br />
        {fmtDate(query.flight_date)}{query.flight_time ? ' at ' + query.flight_time : ''} · {query.passengers} pax
      </div>

      {/* Live bids */}
      {bids.length > 0 && (
        <div className="op-mb-lg">
          <div className="op-lbl op-lbl--tight">Live bids</div>
          <div className="op-box op-box--outlined">
            <div className="op-sum" style={{ color: lowest === bids[0]?.price ? 'var(--op-ok)' : undefined }}>
              <span>Lowest bid</span><strong>{fmt(lowest)}</strong>
            </div>
            <div className="op-bid-hint" style={{ color: isWinning ? 'var(--op-ok)' : 'var(--op-warn)' }}>
              {myBid ? (isWinning ? '✓ You have the lowest bid' : `You are outbid. Beat ${fmt(lowest)} to win.`) : `Beat ${fmt(lowest)} to lead.`}
            </div>
          </div>
        </div>
      )}

      {/* Aircraft */}
      <div className="op-mb">
        <label className="op-lbl" htmlFor="op-ac-select">Select Aircraft</label>
        <select id="op-ac-select" className="op-inp" value={selectedAc} onChange={e => setSelectedAc(e.target.value)}>
          <option value="">Choose aircraft...</option>
          {approved.map(a => <option key={a.id} value={a.id}>{a.aircraft_type} | {a.registration}</option>)}
        </select>
      </div>

      {/* Charges */}
      <div className="op-grid op-grid--charges op-mb">
        {[['Base charge', 'base', base, setBase], ['Handling fee', 'handling', handling, setHandling], ['Crew accommodation', 'crew', crew, setCrew], ['Catering', 'catering', catering, setCatering]].map(([label, id, val, setter]) => (
          <div key={id}>
            <label className="op-lbl" htmlFor={`op-charge-${id}`}>{label} (Rs.)</label>
            <input id={`op-charge-${id}`} className="op-inp" type="number" value={val} onChange={e => setter(e.target.value)} placeholder="0" />
          </div>
        ))}
      </div>

      {/* Total breakdown */}
      <div className="op-box op-mb">
        {[['Subtotal', subtotal], ['GST (18%)', gst]].map(([k, v]) => (
          <div key={k} className="op-sum"><span>{k}</span><span>{fmt(v)}</span></div>
        ))}
        <div className="op-sum op-sum--total">
          <span>Total quote</span><strong>{fmt(total)}</strong>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="op-lbl" htmlFor="op-notes">Notes to client (optional)</label>
        <textarea
          id="op-notes"
          className="op-inp op-inp--area"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any additional information..." />
      </div>
    </Modal>
  )
}

// ── Queries Section ────────────────────────────────────────────────────────────
function QueriesSection({ store }) {
  const { activeQueries, sharedQuotes, confirmedQuotes, expiredQueries, aircraftList, loadAllData, submitQuote, operator, queriesLoaded } = store
  const [tab, setTab] = useState('active')
  const [quoteModal, setQuoteModal] = useState(null)

  useEffect(() => { loadAllData() }, [])
  useEffect(() => { const iv = setInterval(loadAllData, 10000); return () => clearInterval(iv) }, [])

  function renderActive() {
    if (!activeQueries.length) return <div className="op-empty">No active queries right now. New client queries will appear here.</div>
    return activeQueries.map(q => (
      <div key={q.id} className="op-card">
        <div className="op-card__row op-card__row--top">
          <div>
            <div className="op-card__title">{q.departure || '—'} → {q.destination || '—'}</div>
            <div className="op-meta">{fmtDate(q.flight_date)}{q.flight_time ? ' at ' + q.flight_time : ''} · {q.passengers} pax{q.medivac ? ' · Medivac' : ''}{q.pets ? ' · Pets' : ''}{q.vip ? ' · VIP' : ''}</div>
          </div>
          <button className="op-btn op-btn--cyan" onClick={() => setQuoteModal(q)}>Submit quote</button>
        </div>
        <TimerBar createdAt={q.created_at} />
      </div>
    ))
  }

  function renderShared() {
    if (!sharedQuotes.length) return <div className="op-empty">No quotes shared yet.</div>
    return sharedQuotes.map(q => (
      <div key={q.id} className="op-card">
        <div className="op-card__row">
          <div>
            <div className="op-card__title op-card__title--sm">{q.aircraft_type} {q.aircraft_registration ? `(${q.aircraft_registration})` : ''}</div>
            <div className="op-meta">Shared · Quote: {fmt(q.price)}</div>
            <div className="op-meta">Created Date: {fmtDate(q.created_at)}</div>
          </div>
          <div className="op-price">{fmt(q.price)}</div>
        </div>
      </div>
    ))
  }

  function renderConfirmed() {
    if (!confirmedQuotes.length) return <div className="op-empty">No confirmed bookings yet.</div>
    return confirmedQuotes.map(q => (
      <div key={q.id} className="op-card">
        <div className="op-card__row">
          <div>
            <div className="op-card__title op-card__title--sm">{q.aircraft_type}</div>
            <div className="op-meta">Revenue: {fmt(q.price)}</div>
            <div className="op-meta">Created Date: {fmtDate(q.created_at)}</div>
          </div>
          <span className="op-badge op-badge--confirmed">Confirmed</span>
        </div>
      </div>
    ))
  }

  function renderExpired() {
    if (!expiredQueries.length) return <div className="op-empty">No expired queries.</div>
    return expiredQueries.map(q => (
      <div key={q.id} className="op-card op-card--dim">
        <div className="op-card__title op-card__title--sm">{q.departure || '—'} → {q.destination || '—'}</div>
        <div className="op-meta">{fmtDate(q.flight_date)} · Window closed</div>
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
      <div className="op__hd">
        <h1 className="op-h1">Queries</h1>
        <div className="op-tabs">
          {tabs.map(t => (
            <button key={t.key} className={`op-tab${tab === t.key ? ' is-active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} <span className="op-tab__count">{t.count}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        {/* Until the first fetch lands, every tab is legitimately empty — showing
            "No active queries" then would be a claim, not a fact. */}
        {!queriesLoaded ? <SkeletonCards /> : (
          <>
            {tab === 'active' && renderActive()}
            {tab === 'shared' && renderShared()}
            {tab === 'confirmed' && renderConfirmed()}
            {tab === 'expired' && renderExpired()}
          </>
        )}
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
  const { aircraftList, loadFleet, fleetLoaded } = store
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ aircraftType: '', registration: '', seatsAvailable: '' })
  const [loading, setLoading] = useState(false)
  // The aircraft awaiting a delete confirmation, or null.
  const [pendingRemove, setPendingRemove] = useState(null)
  const [removing, setRemoving] = useState(false)
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

  async function removeAircraft() {
    setRemoving(true)
    try {
      await fleetApi.delete(pendingRemove.id)
      loadFleet()
      showToast('Aircraft removed', 'success')
      setPendingRemove(null)
    } catch (err) {
      showToast(err.message, 'error')
    } finally { setRemoving(false) }
  }

  const docStatus = (ac) => {
    const docs = [['C of R', ac.cor_expiry], ['C of A', ac.coa_expiry], ['ARC', ac.arc_expiry], ['Insurance', ac.insurance_expiry]]
    return docs.filter(([, e]) => e && daysUntil(e) !== null).map(([name, exp]) => {
      const d = daysUntil(exp)
      return d <= 0 ? { name, label: '⚠ Expired', color: 'var(--op-bad)' } : d <= 30 ? { name, label: `⚠ ${d}d left`, color: 'var(--op-warn)' } : null
    }).filter(Boolean)
  }

  return (
    <div>
      <div className="op__hd op__hd--row">
        <h1 className="op-h1">Fleet</h1>
        {isOwner && <button className="op-btn op-btn--cyan" onClick={() => setShowAdd(true)}>+ Add aircraft</button>}
      </div>

      {!fleetLoaded ? <SkeletonTiles /> : aircraftList.length === 0 ? (
        <div className="op-empty">No aircraft added yet. {isOwner ? 'Add your fleet to start submitting quotes.' : 'Ask your admin to add aircraft.'}</div>
      ) : (
        <div className="op-grid op-grid--fleet">
          {aircraftList.map(ac => {
            const warnings = docStatus(ac)
            const status = ac.doc_status === 'approved' ? ['ok', 'Approved']
              : ac.doc_status === 'rejected' ? ['bad', 'Rejected']
              : ['warn', 'Under review']
            return (
              <div key={ac.id} className={`op-ac${ac.doc_status === 'approved' ? '' : ' op-ac--pending'}`}>
                {isOwner && <button className="op-x" onClick={() => setPendingRemove(ac)} aria-label={`Remove ${ac.aircraft_type} ${ac.registration}`}>✕</button>}
                <div className="op-ac__type">{ac.aircraft_type}</div>
                <div className="op-ac__reg">{ac.registration}</div>
                {ac.seats_available && <div className="op-ac__seats">{ac.seats_available} seats</div>}
                <span className={`op-badge op-badge--${status[0]}`}>{status[1]}</span>
                {warnings.map(w => (
                  <div key={w.name} className="op-ac__warn" style={{ color: w.color }}>{w.name} — {w.label}</div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Aircraft Modal */}
      {showAdd && (
        <Modal
          title="Add aircraft"
          size="sm"
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <button className="op-btn op-btn--ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="op-btn op-btn--gold" onClick={addAircraft} disabled={loading}>
                {loading ? 'Submitting…' : 'Submit for review'}
              </button>
            </>
          }>
          {[['Aircraft type', 'aircraftType', 'text', 'e.g. Citation XLS'], ['Registration (VT-XXX)', 'registration', 'text', 'e.g. VT-ABC'], ['Seats', 'seatsAvailable', 'number', 'e.g. 8']].map(([label, key, type, ph]) => (
            <div key={key} className="op-field">
              <label className="op-lbl" htmlFor={`op-ac-${key}`}>{label}</label>
              <input id={`op-ac-${key}`} className="op-inp" type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} />
            </div>
          ))}
          <div className="op-note">Note: All aircraft documents (C of R, C of A, ARC, Insurance) must be submitted for review before the aircraft can be used to submit quotes. Please contact SkyVayu admin to upload documents.</div>
        </Modal>
      )}

      {pendingRemove && (
        <ConfirmDialog
          title="Remove aircraft"
          message={`${pendingRemove.aircraft_type} (${pendingRemove.registration}) will be removed from your fleet and can no longer be quoted on.`}
          confirmLabel="Remove aircraft"
          busy={removing}
          onConfirm={removeAircraft}
          onCancel={() => setPendingRemove(null)} />
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
      <div className="op__hd op__hd--row">
        <h1 className="op-h1">Employees</h1>
        <button className="op-btn op-btn--cyan" onClick={() => setShowAdd(true)}>+ Add employee</button>
      </div>

      {employees.length === 0 ? (
        <div className="op-empty">No employees added. Create accounts for your sales team.</div>
      ) : employees.map(e => (
        <div key={e.id} className="op-card">
          <div className="op-card__row">
            <div>
              <div className="op-card__title">{e.full_name || e.username}</div>
              <div className="op-meta">@{e.username}{e.email ? ' · ' + e.email : ''}</div>
              {!e.is_approved && <span className="op-badge op-badge--pending">Pending approval</span>}
            </div>
            <button className={`op-btn ${e.is_active ? 'op-btn--danger' : 'op-btn--go'}`} onClick={() => toggleActive(e.id, e.is_active)}>
              {e.is_active ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        </div>
      ))}

      {showAdd && (
        <Modal
          title="Add employee"
          size="xs"
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <button className="op-btn op-btn--ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="op-btn op-btn--gold" onClick={addEmployee} disabled={loading}>
                {loading ? 'Submitting…' : 'Submit for approval'}
              </button>
            </>
          }>
          {[['Full Name', 'fullName', 'text'], ['Email', 'email', 'email'], ['Username', 'username', 'text'], ['Password', 'password', 'password']].map(([label, key, type]) => (
            <div key={key} className="op-field">
              <label className="op-lbl" htmlFor={`op-emp-${key}`}>{label}</label>
              <input id={`op-emp-${key}`} className="op-inp" type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div className="op-note op-note--info">This employee will need SkyVayu approval before they can log in.</div>
        </Modal>
      )}
    </div>
  )
}

// ── Revenue Section ────────────────────────────────────────────────────────────
function RevenueSection({ store }) {
  const { confirmedQuotes } = store
  const total = confirmedQuotes.reduce((a, q) => a + Number(q.price || 0), 0)
  const now = new Date()
  const thisMonth = confirmedQuotes.filter(q => { const d = new Date(q.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }).reduce((a, q) => a + Number(q.price || 0), 0)

  return (
    <div>
      <h1 className="op-h1 op-h1--alone">Revenue</h1>
      <div className="op-grid op-grid--3 op-panel-grid">
        {[['Total Revenue', fmt(total)], ['This Month', fmt(thisMonth)], ['Confirmed Bookings', confirmedQuotes.length]].map(([label, val]) => (
          <div key={label} className="op-panel">
            <div className="op-lbl op-panel__k">{label}</div>
            <div className="op-panel__v">{val}</div>
          </div>
        ))}
      </div>
      {confirmedQuotes.length === 0 && <div className="op-empty">No confirmed bookings yet. Revenue will appear here once you have confirmed bookings.</div>}
    </div>
  )
}

// ── Profile Section ────────────────────────────────────────────────────────────
function ProfileSection({ store }) {
  const { user, operator } = store

  return (
    <div>
      <h1 className="op-h1 op-h1--alone">Profile</h1>
      <div className="op-grid op-grid--2">
        <div className="op-panel">
          <div className="op-lbl op-panel__hd">Personal Details</div>
          {[['Full Name', user?.fullName || user?.username], ['Username', user?.username], ['Email', user?.email], ['Role', user?.role === 'owner' ? 'Admin' : 'Employee']].map(([k, v]) => (
            <div key={k} className="op-kv">
              <span className="op-kv__k">{k}</span>
              <span className="op-kv__v">{v || '—'}</span>
            </div>
          ))}
        </div>
        <div className="op-panel">
          <div className="op-lbl op-panel__hd">Company Details</div>
          {[['Company Name', operator?.companyName], ['Aircraft Category', operator?.aircraftCategory], ['Approval Status', operator?.approvalStatus], ['AOP Expiry', operator?.aopExpiryDate || 'Not set']].map(([k, v]) => (
            <div key={k} className="op-kv">
              <span className="op-kv__k">{k}</span>
              <span className="op-kv__v">{v || '—'}</span>
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
  // Drives the off-canvas sidebar below 900px. Ignored on desktop, where the
  // sidebar is always in flow.
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    const ok = store.init()
    if (!ok) navigate('/operator')
  }, [])

  useEffect(() => {
    if (store.operator) store.loadFleet()
  }, [store.operator])

  // Choosing a section closes the drawer, otherwise it stays open over the
  // content the operator just asked for.
  useEffect(() => { setNavOpen(false) }, [section])

  useEffect(() => {
    if (!navOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setNavOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  if (!store.user) return <div className="op-loading">Loading…</div>

  const isOwner = store.isOwner()
  const current = navItemsFor(isOwner).find(i => i.key === section)

  return (
    <div className="op">
      <Sidebar
        section={section}
        setSection={setSection}
        user={store.user}
        operator={store.operator}
        isOwner={isOwner}
        open={navOpen}
        onLogout={() => { store.logout(); navigate('/operator') }} />

      {navOpen && <button className="op__scrim" aria-label="Close menu" onClick={() => setNavOpen(false)} />}

      {/* Sibling of the main column, not a child of it: the bar has to span the
          full width flush to the edges, and .op__main carries page padding.
          Hidden entirely above 900px — see .op__bar in operator.css. */}
      <div className="op__bar">
        <button className="op__burger" onClick={() => setNavOpen(o => !o)} aria-label="Menu" aria-expanded={navOpen}>☰</button>
        <span className="op__bar-title">{current?.label || 'Operator Portal'}</span>
        <img className="op__bar-logo" src={logo} alt="SkyVayu" />
      </div>

      <main className="op__main">
        {section === 'queries' && <QueriesSection store={store} />}
        {section === 'fleet' && <FleetSection store={store} />}
        {section === 'roster' && <div className="op-soon">Roster — Coming soon</div>}
        {section === 'employees' && isOwner && <EmployeesSection store={store} />}
        {section === 'revenue' && isOwner && <RevenueSection store={store} />}
        {section === 'profile' && <ProfileSection store={store} />}
      </main>
    </div>
  )
}
