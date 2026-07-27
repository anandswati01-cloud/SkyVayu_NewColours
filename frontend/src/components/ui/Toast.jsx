import { useState, useEffect, useCallback } from 'react'

let toastFn = null

export function showToast(message, type = 'info') {
  if (toastFn) toastFn(message, type)
}

export default function Toast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    toastFn = (message, type) => {
      const id = Date.now()
      setToasts(t => [...t, { id, message, type }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
    }
    return () => { toastFn = null }
  }, [])

  const colors = { error: '#E24B4A', success: '#2E7D52', info: '#185FA5' }

  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: colors[t.type] || colors.info, color: '#fff', padding: '12px 20px', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-body)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', maxWidth: '90vw', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
