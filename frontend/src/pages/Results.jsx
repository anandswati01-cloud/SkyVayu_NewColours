import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { queryApi, quoteApi } from '../services/api'
import { showToast } from '../components/ui/Toast'

const AVIATION_FACTS = [
  { stat: '~900', text: 'charter flights operate in India every month' },
  { stat: '3x', text: 'faster boarding than commercial airlines' },
  { stat: '5,000+', text: 'private airports & airstrips across India' },
  { stat: '60 min', text: 'average time saved per trip vs commercial flight' },
  { stat: '99%', text: 'on-time performance for private charters' },
  { stat: '₹0', text: 'hidden fees — price you see is the price you pay' },
]

const TOTAL_SECONDS = 60 * 60

function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN')
}

export default function Results() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [queryId] = useState(() => searchParams.get('query_id') || sessionStorage.getItem('sv_query_id'))
  const [queryData] = useState(() => { try { return JSON.parse(sessionStorage.getItem('sv_query') || '{}') } catch { return {} } })
  const [queryStart] = useState(() => { const s = sessionStorage.getItem('sv_query_start'); if (!s) sessionStorage.setItem('sv_query_start', Date.now()); return parseInt(sessionStorage.getItem('sv_query_start')) })

  const [quotes, setQuotes] = useState([])
  const [allQuotes, setAllQuotes] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS)
  const [expired, setExpired] = useState(false)
  const [factIdx, setFactIdx] = useState(0)
  const [filterSort, setFilterSort] = useState('asc')
  const [filterMinSeats, setFilterMinSeats] = useState(0)
  const [notifiedCount, setNotifiedCount] = useState(0)
  const pollRef = useRef(null)

  // Timer
  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - queryStart) / 1000)
      const rem = Math.max(0, TOTAL_SECONDS - elapsed)
      setTimeLeft(rem)
      if (rem === 0) setExpired(true)
    }
    tick()
    const iv = setInterval(tick, 500)
    return () => clearInterval(iv)
  }, [queryStart])

  // Facts rotator
  useEffect(() => {
    const iv = setInterval(() => setFactIdx(i => (i + 1) % AVIATION_FACTS.length), 4000)
    return () => clearInterval(iv)
  }, [])

  // Load quotes
  async function loadQuotes() {
    if (!queryId) { setLoading(false); return }
    try {
      const res = await quoteApi.list(`?queryId=${queryId}&status=shared`)
      const q = res.data || []
      setAllQuotes(q)
      applyFilters(q, filterSort, filterMinSeats)
      setNotifiedCount(q.length)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuotes()
    pollRef.current = setInterval(loadQuotes, 30000)
    return () => clearInterval(pollRef.current)
  }, [queryId])

  function applyFilters(source = allQuotes, sort = filterSort, minSeats = filterMinSeats) {
    let filtered = [...source]
    if (minSeats > 0) filtered = filtered.filter(q => (q.seats_available || 0) >= minSeats)
    filtered.sort((a, b) => sort === 'asc' ? a.price - b.price : b.price - a.price)
    setQuotes(filtered)
  }

  useEffect(() => { applyFilters() }, [filterSort, filterMinSeats, allQuotes])

  function selectQuote(id) {
    setSelectedId(id)
  }

  function goToPayment() {
    const q = allQuotes.find(x => x.id === selectedId)
    if (!q) return
    sessionStorage.setItem('sv_selected_quote', JSON.stringify(q))
    navigate('/payment')
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const pct = Math.min(((TOTAL_SECONDS - timeLeft) / TOTAL_SECONDS) * 100, 100)

  const dep = queryData.departure || ''
  const dest = queryData.destination || ''
  const getCode = s => { const m = s.match(/\(([^)]+)\)/); return m ? m[1] : s.substring(0, 3).toUpperCase() }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', paddingTop: 72, display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ width: 300, flexShrink: 0, background: 'var(--navy-mid)', borderRight: '1px solid var(--white-10)', padding: 28, position: 'sticky', top: 72, height: 'calc(100vh - 72px)', overflowY: 'auto' }}>
        {/* Route */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, letterSpacing: 2, color: 'var(--white)' }}>{dep ? getCode(dep) : 'DEP'}</div>
            <div style={{ fontSize: 11, color: 'var(--white-60)', marginTop: 2 }}>{dep.replace(/\s*\([^)]+\)/, '').trim() || '—'}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', color: 'var(--gold)', fontSize: 18 }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, letterSpacing: 2, color: 'var(--white)' }}>{dest ? getCode(dest) : 'ARR'}</div>
            <div style={{ fontSize: 11, color: 'var(--white-60)', marginTop: 2 }}>{dest.replace(/\s*\([^)]+\)/, '').trim() || '—'}</div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--white-60)', marginBottom: 6 }}>{queryData.flight_date || '—'}{queryData.flight_time ? ', ' + queryData.flight_time : ''}</div>
        <div style={{ fontSize: 13, color: 'var(--white-60)', marginBottom: 24 }}>{queryData.passengers || 1} Passenger{queryData.passengers !== 1 ? 's' : ''}</div>

        {/* Timer */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: expired ? '#e05f5f' : 'var(--gold)', marginBottom: 8 }}>
            {expired ? 'Quotation window closed' : `${mins} min ${String(secs).padStart(2, '0')} sec remaining`}
          </div>
          <div style={{ height: 4, background: 'var(--white-10)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: expired ? '#e05f5f' : 'var(--gold)', borderRadius: 2, transition: 'width 0.5s' }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--white-10)', borderRadius: 4, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gold)' }}>{quotes.length}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--white-60)', marginTop: 4 }}>Quotes received</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--white-10)', borderRadius: 4, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gold)' }}>{notifiedCount}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--white-60)', marginTop: 4 }}>Operators notified</div>
          </div>
        </div>

        {/* Fact card */}
        {quotes.length === 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--white-10)', borderRadius: 4, padding: 20, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--gold)', marginBottom: 8 }}>{AVIATION_FACTS[factIdx].stat}</div>
            <div style={{ fontSize: 13, color: 'var(--white-60)', lineHeight: 1.5 }}>{AVIATION_FACTS[factIdx].text}</div>
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400 }}>
            {loading ? 'Loading quotes…' : quotes.length ? 'Available Quotes' : 'Waiting for quotes…'}
          </h1>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--white-60)' }}>Sort:</span>
            {[['asc', 'Price ↑'], ['desc', 'Price ↓']].map(([val, label]) => (
              <button key={val} onClick={() => setFilterSort(val)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', padding: '6px 12px', border: `1px solid ${filterSort === val ? 'var(--gold)' : 'var(--white-10)'}`, borderRadius: 2, background: filterSort === val ? 'rgba(251,191,36,0.1)' : 'transparent', color: filterSort === val ? 'var(--gold)' : 'var(--white-60)', cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Quote cards */}
        {quotes.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--white-60)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✈</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>Waiting for operator quotes</div>
            <div style={{ fontSize: 14 }}>Operators are being notified. Quotes typically arrive within 5–15 minutes.</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {quotes.map((q, i) => {
            const isSelected = selectedId === q.id
            const price = q.price ? fmt(q.price) : '—'
            return (
              <div key={q.id} onClick={() => selectQuote(q.id)} style={{ background: isSelected ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--white-10)'}`, borderRadius: 4, padding: '24px 28px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    {i === 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', background: '#2E7D52', color: '#fff', padding: '3px 8px', borderRadius: 2 }}>Best Price</span>}
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{q.aircraft_type || 'Aircraft'}</div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--white-60)' }}>{q.operator_name || 'Operator'}</div>
                  {q.notes && <div style={{ fontSize: 12, color: 'var(--white-30)', marginTop: 6 }}>{q.notes}</div>}
                  <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                    {[['Seats', q.seats_available || '—'], ['WiFi', '✓'], ['Catering', '✓']].map(([k, v]) => (
                      <div key={k} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--white-60)' }}>{k}: <span style={{ color: 'var(--white)' }}>{v}</span></div>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 24 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--white-60)', marginBottom: 4 }}>All-inclusive price</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gold)' }}>{price}</div>
                  <button onClick={e => { e.stopPropagation(); selectQuote(q.id) }} style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', padding: '8px 16px', background: isSelected ? 'var(--gold)' : 'transparent', color: isSelected ? 'var(--navy)' : 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 2, cursor: 'pointer' }}>
                    {isSelected ? 'Selected ✓' : 'SELECT →'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirm bar */}
      {selectedId && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--navy-mid)', borderTop: '1px solid var(--gold)', padding: '16px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{allQuotes.find(q => q.id === selectedId)?.aircraft_type} selected</div>
            <div style={{ fontSize: 13, color: 'var(--white-60)' }}>{fmt(allQuotes.find(q => q.id === selectedId)?.price || 0)} — {allQuotes.find(q => q.id === selectedId)?.operator_name}</div>
          </div>
          <button onClick={goToPayment} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gold)', color: 'var(--navy)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, cursor: 'pointer', border: 'none', fontWeight: 500 }}>
            Continue to Payment →
          </button>
        </div>
      )}
    </div>
  )
}
