import { useEffect, useRef } from 'react'

/**
 * Shared shell pieces for the operator portal.
 *
 * The dashboard previously inlined a modal shell three times, each with its own
 * backdrop, header and footer markup and none of the keyboard behaviour a modal
 * needs. `Modal` is that shell once, with the behaviour attached.
 */

/* ── Icons ────────────────────────────────────────────────────────────────────
   Sidebar icons used to be emoji, which render as full-colour glyphs at
   whatever size and weight the platform font decides — and one of them ('₹')
   was a currency symbol standing in for an icon. These are stroke icons that
   inherit currentColor, so they take the nav item's active/hover colour. */
const PATHS = {
  queries: 'M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1zM8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2M9 11h6M9 15h4',
  fleet: 'M12 3c.8 0 1.4.9 1.4 2v4.2l7.1 4v2l-7.1-2.2v4.3l2.3 1.6v1.6L12 19.6l-3.7 1.1v-1.6l2.3-1.6v-4.3L3.5 15.2v-2l7.1-4V5c0-1.1.6-2 1.4-2z',
  roster: 'M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM8 12h3M8 16h3M14 12h3',
  employees: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20v-1.5A4.5 4.5 0 0 1 7 14h4a4.5 4.5 0 0 1 4.5 4.5V20M16 4.3a3.5 3.5 0 0 1 0 6.8M18 14.2a4.5 4.5 0 0 1 3.5 4.4V20',
  revenue: 'M4 20h17M6.5 16.5V11M11.5 16.5V6.5M16.5 16.5v-4',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5v-1A5.5 5.5 0 0 1 10 14h4a5.5 5.5 0 0 1 5.5 5.5v1',
}

export function Icon({ name }) {
  return (
    <svg className="op-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  )
}

/* ── Modal ────────────────────────────────────────────────────────────────── */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ title, size, onClose, children, footer, labelledBy = 'op-modal-title' }) {
  const boxRef = useRef(null)

  // onClose is almost always an inline arrow, so a new identity arrives on
  // every parent render. Reading it through a ref keeps the effect's dependency
  // list empty — otherwise the effect would tear down and re-run on each
  // keystroke in the form, stealing focus back to the first field every time.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const box = boxRef.current
    const restoreTo = document.activeElement

    function onKey(e) {
      if (e.key === 'Escape') { closeRef.current(); return }
      if (e.key !== 'Tab') return

      // Focus trap. Without it, tabbing past the last field walks into the page
      // behind the backdrop, which is inert to the eye but not to the keyboard.
      const items = box?.querySelectorAll(FOCUSABLE)
      if (!items?.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    window.addEventListener('keydown', onKey)

    // Prefer the first real field. Dialogs with no fields (the confirm) focus
    // the container instead, so focus never lands on a destructive button.
    const target = box?.querySelector('input, select, textarea') || box
    target?.focus?.()

    // The page behind a modal should not scroll under it. index.css sets only
    // overflow-x on body, so clearing the inline value on the way out restores
    // the stylesheet's rule rather than overwriting it.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      restoreTo?.focus?.()
    }
  }, [])

  return (
    <div className="op-modal" onClick={() => closeRef.current()}>
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`op-modal__box${size ? ` op-modal__box--${size}` : ''}`}
        onClick={e => e.stopPropagation()}>
        <div className="op-modal__hd">
          <div className="op-modal__title" id={labelledBy}>{title}</div>
          <button className="op-modal__x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="op-modal__body">{children}</div>
        {footer && <div className="op-modal__ft">{footer}</div>}
      </div>
    </div>
  )
}

/**
 * Replaces window.confirm(). The native dialog is styled by the browser, sits
 * outside the app's visual language entirely, and on some platforms can be
 * suppressed by the user — which would silently turn "remove this aircraft?"
 * into an unconfirmed delete.
 */
export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', busy, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      size="xs"
      onClose={onCancel}
      labelledBy="op-confirm-title"
      footer={
        <>
          <button className="op-btn op-btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="op-btn op-btn--danger-solid" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }>
      <p className="op-confirm__msg">{message}</p>
    </Modal>
  )
}

/* ── Skeletons ────────────────────────────────────────────────────────────────
   The dashboard used to render its empty state ("No active queries right now")
   while the first request was still in flight, so an operator with a full
   pipeline was told they had nothing for as long as the round trip took. These
   stand in until the first load resolves. */
export function SkeletonCards({ count = 3 }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div className="op-card" key={i}>
          <div className="op-card__row op-card__row--top">
            <div className="op-skel-grow">
              <div className="op-skel op-skel--title" />
              <div className="op-skel op-skel--line" />
            </div>
            <div className="op-skel op-skel--btn" />
          </div>
          <div className="op-skel op-skel--bar" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTiles({ count = 3, className = 'op-grid op-grid--fleet' }) {
  return (
    <div className={className} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div className="op-ac" key={i}>
          <div className="op-skel op-skel--title" />
          <div className="op-skel op-skel--line" />
          <div className="op-skel op-skel--pill" />
        </div>
      ))}
    </div>
  )
}
