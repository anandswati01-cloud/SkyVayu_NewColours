/**
 * Shared shell for the long-form content pages (help, legal, membership).
 * Keeps the hero, prose rhythm and typography identical across all of them.
 */

export const doc = {
  eyebrow: { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 },
  h2: { fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 400, margin: '48px 0 16px' },
  h3: { fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 400, margin: '28px 0 10px' },
  p: { fontSize: 15, lineHeight: 1.85, color: 'var(--white-60)', marginBottom: 16 },
  li: { fontSize: 15, lineHeight: 1.85, color: 'var(--white-60)', marginBottom: 8 },
  ul: { paddingLeft: 22, marginBottom: 16 },
  strong: { color: 'var(--white)', fontWeight: 500 },
  note: {
    border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)',
    borderRadius: 4, padding: '18px 22px', margin: '28px 0',
    fontSize: 14, lineHeight: 1.8, color: 'var(--white-60)',
  },
}

export default function DocPage({ eyebrow, title, intro, updated, children }) {
  return (
    <div style={{ background: 'var(--navy)', minHeight: '100vh' }}>
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '160px 48px 40px' }}>
        <div style={doc.eyebrow}>{eyebrow}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(38px, 5vw, 60px)', fontWeight: 400, lineHeight: 1.1, marginBottom: 20 }}>
          {title}
        </h1>
        {intro && <p style={{ fontSize: 17, lineHeight: 1.8, color: 'var(--white-60)', maxWidth: 640 }}>{intro}</p>}
        {updated && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--white-30)', marginTop: 24 }}>
            Last updated: {updated}
          </div>
        )}
      </section>

      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 48px 120px' }}>
        <div style={{ borderTop: '1px solid var(--white-10)', paddingTop: 8 }}>{children}</div>
      </section>
    </div>
  )
}
