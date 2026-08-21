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
    // Styling lives in Home.css rather than inline, so the input inherits the
    // borderless cell it sits in. Inline styles would win over that and put a
    // bordered box back inside the booking strip.
    <div ref={wrapRef} className="ai" >
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
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="ai__list">
          {results.map((a, i) => (
            <div
              key={a.iata}
              className={`ai__opt${i === activeIdx ? ' on' : ''}`}
              onMouseDown={() => select(a)}>
              <div className="ai__city">
                {a.city}
                <div className="ai__name">{a.name}</div>
              </div>
              <div className="ai__iata">{a.iata}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
