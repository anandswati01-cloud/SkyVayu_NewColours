import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { showToast } from '../../components/ui/Toast'
import { adminApi } from '../../services/api'

// ── Admin data access ──────────────────────────────────────────────────────────
// Everything goes through /api/admin/*, which verifies profiles.is_admin
// server-side and only allows a fixed list of resources and columns. The
// dashboard previously queried PostgREST directly with the anon key, which made
// row level security the only thing standing between a visitor and this data.
//
// Thin { ok, data } wrapper so the call sites below read the same as before.
const admin = {
  list: (resource) => adminApi.list(resource)
    .then(res => ({ ok: true, data: res.data || [] }))
    .catch(err => { console.error(`[admin] load ${resource} failed:`, err.message); return { ok: false, data: [] } }),

  update: (resource, id, body) => adminApi.update(resource, id, body)
    .then(res => ({ ok: true, data: res.data }))
    .catch(err => { console.error(`[admin] update ${resource} failed:`, err.message); return { ok: false } }),

  remove: (resource, id) => adminApi.remove(resource, id)
    .then(() => ({ ok: true }))
    .catch(err => { console.error(`[admin] delete ${resource} failed:`, err.message); return { ok: false } }),
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtDate = iso => { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
const fmtDateTime = iso => { if (!iso) return '—'; return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
const fmt = n => 'Rs.' + Number(n || 0).toLocaleString('en-IN')
const esc = s => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ── Colors ─────────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  pending: { bg: 'rgba(239,159,39,0.1)', color: '#EF9F27', border: 'rgba(239,159,39,0.3)' },
  approved: { bg: 'rgba(59,109,17,0.2)', color: '#97C459', border: 'rgba(59,109,17,0.3)' },
  rejected: { bg: 'rgba(226,75,74,0.1)', color: '#E24B4A', border: 'rgba(226,75,74,0.25)' },
  confirmed: { bg: 'rgba(24,95,165,0.15)', color: '#85B7EB', border: 'rgba(24,95,165,0.3)' },
  open: { bg: 'rgba(59,109,17,0.2)', color: '#97C459', border: 'rgba(59,109,17,0.3)' },
}

function Badge({ status, label }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', background: c.bg, color: c.color, border: `0.5px solid ${c.border}` }}>{label || status}</span>
}

function StatCard({ num, label, color }) {
  return (
    <div style={{ background: 'rgba(22,32,64,0.55)', backdropFilter: 'blur(12px)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '20px 22px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 300, color: color || 'var(--gold)', lineHeight: 1, paddingBottom: 4 }}>{num}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>{label}</div>
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ section, setSection, onLogout, counts }) {
  const nav = [
    { key: 'operators', label: 'Operators', badge: counts.pendingOps },
    { key: 'aircraft', label: 'Aircraft', badge: counts.pendingAircraft },
    { key: 'employees', label: 'Employees', badge: counts.pendingEmployees },
    { key: 'bookings', label: 'Bookings' },
    { key: 'queries', label: 'Queries' },
    { key: 'feedback', label: 'Feedback' },
    { key: 'database', label: '⊞ Database' },
  ]
  return (
    <aside style={{ width: 248, flexShrink: 0, background: 'rgba(15,26,48,0.65)', backdropFilter: 'blur(16px)', borderRight: '0.5px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ padding: '26px 22px 22px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontStyle: 'italic', color: 'var(--gold)' }}>SkyVayu</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginTop: 4 }}>Super Admin</div>
      </div>
      <nav style={{ flex: 1, padding: '8px 12px' }}>
        {nav.map(({ key, label, badge }) => (
          <div key={key} onClick={() => setSection(key)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 22px', cursor: 'pointer', color: section === key ? 'var(--gold)' : 'rgba(255,255,255,0.6)', background: section === key ? 'rgba(251,191,36,0.08)' : 'transparent', fontSize: 13, transition: 'all 0.15s', borderRadius: 2 }}>
            <span>{label}</span>
            {badge > 0 && <span style={{ background: section === key ? 'var(--gold)' : 'rgba(251,191,36,0.15)', color: section === key ? '#0c1324' : 'var(--gold)', fontSize: 11, padding: '1px 7px', borderRadius: 10 }}>{badge}</span>}
          </div>
        ))}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '0.5px solid rgba(255,255,255,0.1)', marginTop: 'auto' }}>
        <button onClick={onLogout} style={{ width: '100%', height: 36, background: 'transparent', border: '0.5px solid rgba(255,255,255,0.3)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>Sign out</button>
      </div>
    </aside>
  )
}

// ── Operators Section ──────────────────────────────────────────────────────────
function OperatorsSection({ onCountChange }) {
  const [operators, setOperators] = useState([])
  const [tab, setTab] = useState('pending')
  const [rejectInputs, setRejectInputs] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await admin.list('operators')
    setOperators(res.ok ? res.data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const pending = operators.filter(o => o.approval_status === 'pending').length
    onCountChange({ pendingOps: pending })
  }, [operators])

  async function approve(id) {
    const res = await admin.update('operators', id, { approval_status: 'approved', rejection_reason: null })
    if (res.ok) { showToast('Operator approved', 'success'); load() } else showToast('Failed', 'error')
  }

  async function reject(id) {
    const reason = rejectInputs[id] || ''
    const res = await admin.update('operators', id, { approval_status: 'rejected', rejection_reason: reason || null })
    if (res.ok) { showToast('Operator rejected', 'success'); load() } else showToast('Failed', 'error')
  }

  async function revoke(id) {
    if (!confirm('Revoke this approval?')) return
    const res = await admin.update('operators', id, { approval_status: 'pending' })
    if (res.ok) { showToast('Approval revoked', 'success'); load() } else showToast('Failed', 'error')
  }

  const filtered = operators.filter(o => o.approval_status === tab)
  const counts = { pending: operators.filter(o => o.approval_status === 'pending').length, approved: operators.filter(o => o.approval_status === 'approved').length, rejected: operators.filter(o => o.approval_status === 'rejected').length }

  const tabStyle = active => ({ padding: '12px 20px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: active ? 'var(--gold)' : 'rgba(255,255,255,0.3)', borderBottom: `2px solid ${active ? 'var(--gold)' : 'transparent'}`, cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 8 })
  const card = { background: 'rgba(22,32,64,0.55)', backdropFilter: 'blur(12px)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '20px 24px', marginBottom: 12, transition: 'border-color 0.2s' }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard num={counts.pending} label="Pending operators" color="#EF9F27" />
        <StatCard num={counts.approved} label="Approved operators" color="#97C459" />
        <StatCard num={counts.rejected} label="Rejected" color="#E24B4A" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
        {[['pending', 'Pending applications'], ['approved', 'Approved operators'], ['rejected', 'Rejected']].map(([key, label]) => (
          <button key={key} style={tabStyle(tab === key)} onClick={() => setTab(key)}>
            {label} <span style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--gold)', padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>{counts[key]}</span>
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>Loading…</div>}
      {!loading && filtered.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No {tab} operators.</div>}

      {filtered.map(op => {
        const owner = (op.operator_users || []).find(u => u.role === 'owner')
        const empCount = (op.operator_users || []).filter(u => u.role === 'employee').length
        const showReject = rejectInputs[op.id] !== undefined

        return (
          <div key={op.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 3 }}>{op.company_name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Applied {fmtDateTime(op.created_at)}{empCount ? ` · ${empCount} emp` : ''}</div>
              </div>
              <Badge status={op.approval_status} label={op.approval_status === 'pending' ? 'Pending review' : op.approval_status === 'approved' ? 'Approved' : 'Rejected'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
              {[['Owner', op.owner_name || owner?.full_name || '—'], ['Phone', op.owner_phone || '—'], ['Email', op.owner_email || owner?.email || '—'], ['Username', owner ? '@' + owner.username : '—'], ['Aircraft Category', op.aircraft_category || '—'], ['AOP Expiry', op.aop_expiry_date ? fmtDate(op.aop_expiry_date) : '—']].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* AOP Document */}
            {op.aop_document_url ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.1)', marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(251,191,36,0.08)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📄</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{op.aop_document_name || "Air Operator's Permit"}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>AOP{op.aop_expiry_date ? ` · Expiry: ${fmtDate(op.aop_expiry_date)}` : ''}</div>
                </div>
                <a href={op.aop_document_url} target="_blank" rel="noopener noreferrer" style={{ height: 30, padding: '0 14px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>View</a>
              </div>
            ) : (
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.06)', marginBottom: 14, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No document uploaded</div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 14, borderTop: '0.5px solid rgba(255,255,255,0.1)', flexWrap: 'wrap' }}>
              {op.approval_status === 'pending' && (
                <>
                  <button onClick={() => approve(op.id)} style={{ height: 36, padding: '0 20px', background: '#3B6D11', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>✓ Approve</button>
                  <button onClick={() => setRejectInputs(r => ({ ...r, [op.id]: r[op.id] !== undefined ? undefined : '' }))} style={{ height: 36, padding: '0 20px', background: 'transparent', border: '0.5px solid rgba(226,75,74,0.4)', color: '#E24B4A', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>✗ Reject</button>
                  {showReject && (
                    <>
                      <input value={rejectInputs[op.id] || ''} onChange={e => setRejectInputs(r => ({ ...r, [op.id]: e.target.value }))} placeholder="Reason (optional)" style={{ flex: 1, height: 36, padding: '0 12px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', minWidth: 180 }} />
                      <button onClick={() => reject(op.id)} style={{ height: 36, padding: '0 16px', background: '#E24B4A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Confirm</button>
                    </>
                  )}
                </>
              )}
              {op.approval_status === 'approved' && (
                <>
                  <span style={{ fontSize: 12, color: '#97C459' }}>✓ Approved</span>
                  <button onClick={() => revoke(op.id)} style={{ marginLeft: 'auto', height: 36, padding: '0 20px', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.6)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>Revoke</button>
                </>
              )}
              {op.approval_status === 'rejected' && (
                <>
                  <span style={{ fontSize: 12, color: '#E24B4A' }}>{op.rejection_reason || 'No reason given'}</span>
                  <button onClick={() => approve(op.id)} style={{ marginLeft: 'auto', height: 36, padding: '0 20px', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.6)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>Move to approved</button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Aircraft Section ───────────────────────────────────────────────────────────
function AircraftSection({ onCountChange }) {
  const [aircraft, setAircraft] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectInputs, setRejectInputs] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await admin.list('aircraft_pending')
    setAircraft(res.ok ? res.data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { onCountChange({ pendingAircraft: aircraft.length }) }, [aircraft])

  async function approve(id) {
    const res = await admin.update('aircraft', id, { doc_status: 'approved', is_active: true, doc_rejection_reason: null })
    if (res.ok) { showToast('Aircraft approved', 'success'); load() } else showToast('Failed', 'error')
  }

  async function reject(id) {
    const reason = rejectInputs[id] || ''
    const res = await admin.update('aircraft', id, { doc_status: 'rejected', is_active: false, doc_rejection_reason: reason || null })
    if (res.ok) { showToast('Aircraft rejected', 'success'); load() } else showToast('Failed', 'error')
  }

  const card = { background: 'rgba(22,32,64,0.55)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '20px 24px', marginBottom: 12 }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <StatCard num={aircraft.length} label="Pending aircraft docs" color="#EF9F27" />
      </div>
      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>Loading…</div>}
      {!loading && !aircraft.length && <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>No pending aircraft documents.</div>}
      {aircraft.map(ac => {
        const opName = ac.operators?.company_name || 'Unknown'
        const docs = [['C of R', ac.cor_url, ac.cor_expiry], ['C of A', ac.coa_url, ac.coa_expiry], ['ARC', ac.arc_url, ac.arc_expiry], ['Insurance', ac.insurance_url, ac.insurance_expiry]]
        return (
          <div key={ac.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 3 }}>{ac.aircraft_type} · <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{ac.registration}</span></div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{opName}{ac.seats_available ? ` · ${ac.seats_available} seats` : ''}</div>
              </div>
              <Badge status="pending" label="Pending review" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {docs.map(([name, url, expiry]) => (
                <div key={name} style={{ padding: '10px 12px', background: 'rgba(15,26,48,0.65)', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>{name}</div>
                  {url ? (
                    <>
                      <a href={url} target="_blank" rel="noopener noreferrer" style={{ height: 26, padding: '0 10px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>View</a>
                      {expiry && <div style={{ fontSize: 11, marginTop: 4, color: 'rgba(255,255,255,0.4)' }}>Expiry: <strong style={{ color: '#fff' }}>{fmtDate(expiry)}</strong></div>}
                    </>
                  ) : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Not uploaded</span>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 14, borderTop: '0.5px solid rgba(255,255,255,0.1)', flexWrap: 'wrap' }}>
              <button onClick={() => approve(ac.id)} style={{ height: 36, padding: '0 20px', background: '#3B6D11', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>✓ Approve aircraft</button>
              <button onClick={() => setRejectInputs(r => ({ ...r, [ac.id]: r[ac.id] !== undefined ? undefined : '' }))} style={{ height: 36, padding: '0 20px', background: 'transparent', border: '0.5px solid rgba(226,75,74,0.4)', color: '#E24B4A', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>✗ Reject</button>
              {rejectInputs[ac.id] !== undefined && (
                <>
                  <input value={rejectInputs[ac.id] || ''} onChange={e => setRejectInputs(r => ({ ...r, [ac.id]: e.target.value }))} placeholder="Reason (optional)" style={{ flex: 1, height: 36, padding: '0 12px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', minWidth: 180 }} />
                  <button onClick={() => reject(ac.id)} style={{ height: 36, padding: '0 16px', background: '#E24B4A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Confirm</button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Employees Section ──────────────────────────────────────────────────────────
function EmployeesSection({ onCountChange }) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await admin.list('employees_pending')
    setEmployees(res.ok ? res.data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { onCountChange({ pendingEmployees: employees.length }) }, [employees])

  async function approve(id) {
    const res = await admin.update('operator_users', id, { is_approved: true, is_active: true })
    if (res.ok) { showToast('Employee approved', 'success'); load() } else showToast('Failed', 'error')
  }

  async function reject(id) {
    const res = await admin.update('operator_users', id, { is_active: false })
    if (res.ok) { showToast('Employee rejected', 'success'); load() } else showToast('Failed', 'error')
  }

  const card = { background: 'rgba(22,32,64,0.55)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '20px 24px', marginBottom: 12 }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <StatCard num={employees.length} label="Pending employee approvals" color="#EF9F27" />
      </div>
      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>Loading…</div>}
      {!loading && !employees.length && <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>No pending employees.</div>}
      {employees.map(e => {
        const ini = (e.full_name || e.username).split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
        const opName = e.operators?.company_name || 'Unknown'
        return (
          <div key={e.id} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(24,95,165,0.15)', border: '0.5px solid rgba(133,183,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500, color: 'var(--gold)' }}>{ini}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{e.full_name || e.username}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{opName} · @{e.username}</div>
                </div>
              </div>
              <Badge status="pending" label="Pending approval" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
              {[['Employee ID', e.employee_id || '—'], ['Company', opName], ['Applied', fmtDate(e.created_at)]].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 14, borderTop: '0.5px solid rgba(255,255,255,0.1)' }}>
              <button onClick={() => approve(e.id)} style={{ height: 36, padding: '0 20px', background: '#3B6D11', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>✓ Approve</button>
              <button onClick={() => reject(e.id)} style={{ height: 36, padding: '0 20px', background: 'transparent', border: '0.5px solid rgba(226,75,74,0.4)', color: '#E24B4A', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>✗ Reject</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Bookings Section ───────────────────────────────────────────────────────────
function BookingsSection() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    admin.list('bookings').then(r => { setBookings(r.ok ? r.data : []); setLoading(false) })
  }, [])

  async function updateStatus(id, status) {
    const res = await admin.update('bookings', id, { status })
    if (res.ok) { showToast(`Status updated to ${status}`, 'success'); setBookings(b => b.map(x => x.id === id ? { ...x, status } : x)) }
    else showToast('Failed to update', 'error')
  }

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase()
    return !q || b.ref?.toLowerCase().includes(q) || b.client_name?.toLowerCase().includes(q) || b.client_email?.toLowerCase().includes(q) || b.route?.toLowerCase().includes(q)
  })

  const total = bookings.reduce((a, b) => a + Number(b.total_amount || 0), 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard num={bookings.length} label="Total bookings" />
        <StatCard num={bookings.filter(b => b.status === 'confirmed').length} label="Confirmed" color="#97C459" />
        <StatCard num={fmt(total)} label="Total revenue" color="#fbbf24" />
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ref, client name, email or route…"
        style={{ width: '100%', height: 36, padding: '0 14px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', marginBottom: 16 }} />

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>Loading…</div>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>{['Ref', 'Client', 'Route', 'Date', 'Aircraft', 'Amount', 'Status', 'Actions'].map(h => (
              <th key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', padding: '8px 12px', textAlign: 'left', borderBottom: '0.5px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gold)' }}>{b.ref}</td>
                <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 500 }}>{b.client_name}<div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{b.client_email}</div></td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.route || '—'}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>{b.flight_date || '—'}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{b.aircraft || '—'}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{b.total_amount ? fmt(b.total_amount) : '—'}</td>
                <td style={{ padding: '10px 12px' }}><Badge status={b.status} label={b.status} /></td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  <select value={b.status} onChange={e => updateStatus(b.id, e.target.value)} style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', fontSize: 11, padding: '4px 8px', cursor: 'pointer', fontFamily: 'var(--font-body)', outline: 'none' }}>
                    {['confirmed', 'in_flight', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>No bookings found.</div>}
      </div>
    </div>
  )
}

// ── Queries Section ────────────────────────────────────────────────────────────
function QueriesSection() {
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    admin.list('queries').then(r => { setQueries(r.ok ? r.data : []); setLoading(false) })
  }, [])

  const filtered = queries.filter(q => {
    const s = search.toLowerCase()
    return !s || q.departure?.toLowerCase().includes(s) || q.destination?.toLowerCase().includes(s) || q.status?.toLowerCase().includes(s)
  })

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[['open', '#97C459'], ['confirmed', '#85B7EB'], ['declined', '#E24B4A'], ['expired', '#EF9F27']].map(([status, color]) => (
          <StatCard key={status} num={queries.filter(q => q.status === status).length} label={status + ' queries'} color={color} />
        ))}
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by route or status…"
        style={{ width: '100%', height: 36, padding: '0 14px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', marginBottom: 16 }} />
      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>Loading…</div>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>{['Route', 'Date', 'Pax', 'Category', 'Status', 'Created'].map(h => (
              <th key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', padding: '8px 12px', textAlign: 'left', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map(q => (
              <tr key={q.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 500 }}>{q.departure || '—'} → {q.destination || '—'}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>{q.flight_date || '—'}{q.flight_time ? ', ' + q.flight_time : ''}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{q.passengers}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{q.aircraft_category}</td>
                <td style={{ padding: '10px 12px' }}><Badge status={q.status} label={q.status} /></td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{fmtDateTime(q.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>No queries found.</div>}
      </div>
    </div>
  )
}

// ── Feedback Section ───────────────────────────────────────────────────────────
function FeedbackSection() {
  const [feedback, setFeedback] = useState([])
  const [contacts, setContacts] = useState([])
  const [tab, setTab] = useState('feedback')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      admin.list('feedback'),
      admin.list('contacts'),
    ]).then(([f, c]) => {
      setFeedback(f.ok ? f.data : [])
      setContacts(c.ok ? c.data : [])
      setLoading(false)
    })
  }, [])

  async function deleteFeedback(id) {
    await admin.remove('feedback', id)
    setFeedback(f => f.filter(x => x.id !== id))
    showToast('Deleted', 'success')
  }

  async function deleteContact(id) {
    await admin.remove('contacts', id)
    setContacts(c => c.filter(x => x.id !== id))
    showToast('Deleted', 'success')
  }

  const tabStyle = active => ({ padding: '10px 18px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: active ? 'var(--gold)' : 'rgba(255,255,255,0.3)', borderBottom: `2px solid ${active ? 'var(--gold)' : 'transparent'}`, cursor: 'pointer', background: 'none', border: 'none' })
  const card = { background: 'rgba(22,32,64,0.55)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px 20px', marginBottom: 10 }

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
        <button style={tabStyle(tab === 'feedback')} onClick={() => setTab('feedback')}>Feedback ({feedback.length})</button>
        <button style={tabStyle(tab === 'contacts')} onClick={() => setTab('contacts')}>Contact Messages ({contacts.length})</button>
      </div>
      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>Loading…</div>}

      {tab === 'feedback' && feedback.map(f => (
        <div key={f.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, marginRight: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {f.name && <span style={{ fontSize: 14, fontWeight: 500 }}>{f.name}</span>}
                {f.email && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{f.email}</span>}
                {f.rating && <span style={{ color: 'var(--gold)', fontSize: 12 }}>{'★'.repeat(f.rating)}</span>}
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{f.message}</p>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>{fmtDateTime(f.created_at)}</div>
            </div>
            <button onClick={() => deleteFeedback(f.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        </div>
      ))}
      {!loading && tab === 'feedback' && !feedback.length && <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>No feedback yet.</div>}

      {tab === 'contacts' && contacts.map(c => (
        <div key={c.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, marginRight: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{c.email}</span>
              </div>
              {c.subject && <div style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 6 }}>{c.subject}</div>}
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{c.message}</p>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>{fmtDateTime(c.created_at)}</div>
            </div>
            <button onClick={() => deleteContact(c.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        </div>
      ))}
      {!loading && tab === 'contacts' && !contacts.length && <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>No contact messages yet.</div>}
    </div>
  )
}

// ── Database Section ───────────────────────────────────────────────────────────
function DatabaseSection() {
  const [tab, setTab] = useState('queries')
  const [data, setData] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  // Each key is an allowlisted resource on /api/admin — the ordering and row
  // limits live on the server, not here.
  const TABS = [
    { key: 'queries', cols: ['departure', 'destination', 'flight_date', 'passengers', 'status', 'aircraft_category', 'created_at'] },
    { key: 'quotes', cols: ['operator_name', 'aircraft_type', 'aircraft_registration', 'price', 'status', 'created_at'] },
    { key: 'bookings', cols: ['ref', 'client_name', 'client_email', 'route', 'total_amount', 'status', 'created_at'] },
    { key: 'operators', cols: ['company_name', 'email', 'phone', 'aircraft_category', 'approval_status', 'created_at'] },
    { key: 'aircraft', cols: ['aircraft_type', 'registration', 'seats_available', 'doc_status', 'is_active', 'created_at'] },
    { key: 'profiles', cols: ['full_name', 'email', 'created_at'] },
  ]

  const current = TABS.find(t => t.key === tab)

  useEffect(() => {
    if (!data[tab]) {
      setLoading(true)
      admin.list(tab).then(r => {
        setData(d => ({ ...d, [tab]: r.ok ? r.data : [] }))
        setLoading(false)
      })
    }
  }, [tab])

  const rows = (data[tab] || []).filter(r => {
    if (!search) return true
    return Object.values(r).some(v => String(v || '').toLowerCase().includes(search.toLowerCase()))
  })

  const tabStyle = active => ({ padding: '10px 18px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: active ? 'var(--gold)' : 'rgba(255,255,255,0.3)', borderBottom: `2px solid ${active ? 'var(--gold)' : 'transparent'}`, cursor: 'pointer', background: 'none', border: 'none', whiteSpace: 'nowrap' })

  const colLabel = col => col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--gold)', fontWeight: 400 }}>Database</h2>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all records…"
          style={{ flex: 1, minWidth: 200, height: 36, padding: '0 14px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none' }} />
      </div>

      <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.1)', marginBottom: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} style={tabStyle(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.key} {data[t.key] ? <span style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--gold)', padding: '1px 5px', borderRadius: 8, fontSize: 9, marginLeft: 4 }}>{data[t.key].length}</span> : ''}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>Loading…</div>}

      <div style={{ overflowX: 'auto', marginTop: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {current.cols.map(col => (
                <th key={col} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', padding: '8px 12px', textAlign: 'left', borderBottom: '0.5px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>{colLabel(col)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                {current.cols.map(col => {
                  const v = row[col]
                  const isStatus = col === 'status' || col === 'approval_status' || col === 'doc_status'
                  const isDate = col === 'created_at' || col === 'flight_date'
                  return (
                    <td key={col} style={{ padding: '10px 12px', color: col.includes('name') || col === 'ref' ? '#fff' : 'rgba(255,255,255,0.6)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: col.includes('name') || col === 'ref' ? 500 : 400 }}>
                      {isStatus ? <Badge status={v} label={v} /> : isDate ? fmtDateTime(v) : String(v ?? '—')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>No records found.</div>}
      </div>
    </div>
  )
}

// ── Main Admin Dashboard ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const [section, setSection] = useState('operators')
  const [counts, setCounts] = useState({ pendingOps: 0, pendingAircraft: 0, pendingEmployees: 0 })

  useEffect(() => {
    const token = localStorage.getItem('sv_admin_token')
    if (!token) navigate('/admin')
  }, [])

  function mergeCount(partial) { setCounts(c => ({ ...c, ...partial })) }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem('sv_admin_token')
    localStorage.removeItem('sv_admin_user')
    navigate('/admin')
  }

  const sectionTitle = { operators: 'Operators', aircraft: 'Aircraft Approvals', employees: 'Employee Approvals', bookings: 'Bookings', queries: 'Queries', feedback: 'Feedback', database: 'Database' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--navy)' }}>
      <Sidebar section={section} setSection={setSection} onLogout={logout} counts={counts} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '100vh' }}>
        {/* Top bar */}
        <div style={{ background: 'rgba(12,19,36,0.45)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(255,255,255,0.1)', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontStyle: 'italic', color: 'var(--gold)' }}>SkyVayu</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', background: 'rgba(22,32,64,0.55)', border: '0.5px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 3, color: 'rgba(255,255,255,0.4)' }}>Super Admin</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>Logged in as Swati</span>
            <button onClick={logout} style={{ height: 30, padding: '0 14px', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.3)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>Sign out</button>
          </div>
        </div>

        {/* Content */}
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', maxWidth: 1100 }}>
          {section !== 'database' && (
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--gold)', marginBottom: 24 }}>{sectionTitle[section]}</h1>
          )}
          {section === 'operators' && <OperatorsSection onCountChange={mergeCount} />}
          {section === 'aircraft' && <AircraftSection onCountChange={mergeCount} />}
          {section === 'employees' && <EmployeesSection onCountChange={mergeCount} />}
          {section === 'bookings' && <BookingsSection />}
          {section === 'queries' && <QueriesSection />}
          {section === 'feedback' && <FeedbackSection />}
          {section === 'database' && <DatabaseSection />}
        </main>
      </div>
    </div>
  )
}
