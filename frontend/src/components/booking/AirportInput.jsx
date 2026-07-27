import { useState, useRef, useEffect } from 'react'
import { AIRPORTS } from '../../utils/airports'

export default function AirportInput({ id, placeholder, value, onChange, tabIndex }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleInput(e) {
    const q = e.target.value
    setQuery(q)
    setActiveIdx(-1)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    const lower = q.toLowerCase()
    const filtered = AIRPORTS.filter(a =>
      a.name.toLowerCase().includes(lower) ||
      a.city.toLowerCase().includes(lower) ||
      a.iata.toLowerCase().includes(lower)
    ).slice(0, 8)
    setResults(filtered)
    setOpen(filtered.length > 0)
  }

  function select(airport) {
    const val = `${airport.city} (${airport.iata})`
    setQuery(val)
    onChange(val)
    setOpen(false)
  }

  function handleKey(e) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); select(results[activeIdx]) }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        id={id}
        tabIndex={tabIndex}
        type="text"
        value={query}
        onChange={handleInput}
        onKeyDown={handleKey}
        onFocus={() => query.length >= 2 && setOpen(results.length > 0)}
        placeholder={placeholder}
        autoComplete="off"
        style={{ background: 'var(--white-10)', border: '1px solid var(--white-10)', borderRadius: 2, padding: '12px 16px', color: 'var(--white)', fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none', width: '100%', transition: 'border-color 0.2s' }}
        onFocusCapture={e => e.target.style.borderColor = 'var(--gold)'}
        onBlur={e => { e.target.style.borderColor = 'var(--white-10)'; setTimeout(() => setOpen(false), 150) }}
      />
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#162040', border: '1px solid var(--white-10)', borderRadius: 4, zIndex: 999, maxHeight: 280, overflowY: 'auto' }}>
          {results.map((a, i) => (
            <div key={a.iata} onMouseDown={() => select(a)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--white-10)', background: i === activeIdx ? 'rgba(251,191,36,0.1)' : 'transparent', transition: 'background 0.15s' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--white)' }}>
                {a.city}
                <div style={{ fontSize: 11, color: 'var(--white-60)', marginTop: 2 }}>{a.name}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gold)', letterSpacing: '1.5px' }}>{a.iata}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
