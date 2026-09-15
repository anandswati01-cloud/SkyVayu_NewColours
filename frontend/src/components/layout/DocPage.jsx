/**
 * Shared shell for the long-form content pages (help, legal, membership).
 * Keeps the hero, prose rhythm and typography identical across all of them.
 */

const WINE_BG  = '#160a0d'
const BURG_LT  = '#b83a50'
const GOLD     = '#c9a96e'

export const doc = {
  eyebrow: { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: BURG_LT, marginBottom: 16 },
  h2: { fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 400, margin: '48px 0 16px' },
  h3: { fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 400, margin: '28px 0 10px' },
  p: { fontSize: 15, lineHeight: 1.85, color: 'rgba(255,255,255,0.55)', marginBottom: 16 },
  li: { fontSize: 15, lineHeight: 1.85, color: 'rgba(255,255,255,0.55)', marginBottom: 8 },
  ul: { paddingLeft: 22, marginBottom: 16 },
  strong: { color: 'rgba(255,255,255,0.95)', fontWeight: 500 },
  note: {
    border: '1px solid rgba(138,31,46,0.35)', background: 'rgba(138,31,46,0.10)',
    borderRadius: 4, padding: '18px 22px', margin: '28px 0',
    fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.55)',
  },
}

export default function DocPage({ eyebrow, title, intro, updated, children }) {
  return (
    <div style={{ background: WINE_BG, minHeight: '100vh' }}>
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '160px 48px 40px' }}>
        <div style={doc.eyebrow}>{eyebrow}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(38px, 5vw, 60px)', fontWeight: 400, lineHeight: 1.1, marginBottom: 20 }}>
          {title}
        </h1>
        {intro && <p style={{ fontSize: 17, lineHeight: 1.8, color: 'rgba(255,255,255,0.55)', maxWidth: 640 }}>{intro}</p>}
        {updated && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginTop: 24 }}>
            Last updated: {updated}
          </div>
        )}
      </section>

      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 48px 120px' }}>
        <div style={{ borderTop: '1px solid rgba(138,31,46,0.20)', paddingTop: 8 }}>{children}</div>
      </section>
    </div>
  )
}
