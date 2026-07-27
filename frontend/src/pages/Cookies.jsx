/**
 * ⚠ DRAFT — NOT LEGAL ADVICE.
 *
 * Written to match what the app actually stores in the browser today:
 * Supabase auth tokens in localStorage, the operator portal JWT (sv_token,
 * sv_refresh_token, sv_op_user, sv_operator), and sessionStorage keys used to
 * carry a query through the booking flow. There is no analytics or advertising
 * tracking in the codebase — if you add any, update this page.
 */

import { Link } from 'react-router-dom'
import DocPage, { doc } from '../components/layout/DocPage'

const STORED = [
  ['Supabase auth token', 'localStorage', 'Keeps you signed in after Google sign-in and refreshes your session.', 'Until you sign out'],
  ['sv_token, sv_refresh_token', 'localStorage', 'Operator and admin portal sign-in. Only set if you use those portals.', 'Until you sign out'],
  ['sv_op_user, sv_operator', 'localStorage', 'Which operator account the portal session belongs to.', 'Until you sign out'],
  ['sv_query, sv_query_id, sv_query_start', 'sessionStorage', 'Carries your trip request from the home page to the results page, and drives the 60-minute countdown.', 'Until the tab is closed'],
  ['sv_selected_quote', 'sessionStorage', 'The quotation you picked, so the payment page can price it.', 'Cleared once booked'],
  ['sv_booking', 'sessionStorage', 'Your confirmed booking, so the confirmation page can show it and generate the invoice.', 'Until the tab is closed'],
]

export default function Cookies() {
  const th = { textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)', padding: '12px 14px', borderBottom: '1px solid var(--white-10)', whiteSpace: 'nowrap' }
  const td = { fontSize: 14, lineHeight: 1.7, color: 'var(--white-60)', padding: '14px', borderBottom: '1px solid var(--white-10)', verticalAlign: 'top' }

  return (
    <DocPage
      eyebrow="Legal"
      title="Cookie Policy"
      intro="What SkyVayu stores in your browser, why, and how to clear it."
      updated="22 July 2026"
    >
      <h2 style={doc.h2}>The short version</h2>
      <p style={doc.p}>
        SkyVayu uses <strong style={doc.strong}>no advertising cookies and no third-party analytics</strong>. What
        we store is what the service needs to work: keeping you signed in, and carrying your trip request from one
        page to the next. Technically most of it is browser storage rather than cookies, but the same principle
        applies — it lives on your device and you can clear it.
      </p>

      <h2 style={doc.h2}>What we store</h2>
      <div style={{ overflowX: 'auto', margin: '20px 0 8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Where</th>
              <th style={th}>Purpose</th>
              <th style={th}>Lifetime</th>
            </tr>
          </thead>
          <tbody>
            {STORED.map(([name, where, purpose, life]) => (
              <tr key={name}>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--white)' }}>{name}</td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{where}</td>
                <td style={td}>{purpose}</td>
                <td style={td}>{life}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={doc.h2}>Third parties</h2>
      <ul style={doc.ul}>
        <li style={doc.li}><strong style={doc.strong}>Google</strong> — when you choose Google sign-in, Google sets its own cookies on its own domain, governed by Google's privacy policy.</li>
        <li style={doc.li}><strong style={doc.strong}>Payment gateway</strong> — the checkout window may set cookies needed to process and secure your payment.</li>
        <li style={doc.li}><strong style={doc.strong}>Fonts</strong> — typefaces are loaded from Google Fonts, which receives the request as part of serving the file.</li>
      </ul>

      <h2 style={doc.h2}>Clearing it</h2>
      <p style={doc.p}>
        Signing out removes the session entries. Closing the tab clears everything in sessionStorage. You can also
        clear site data from your browser settings, or block storage for this site entirely — though if you do,
        sign-in and the booking flow will not work, because both depend on it.
      </p>

      <h2 style={doc.h2}>Changes</h2>
      <p style={doc.p}>
        If we add analytics or any other tracking, we will update this page and the date above before switching it on.
      </p>

      <p style={{ ...doc.p, marginTop: 40 }}>
        See also <Link to="/privacy" style={{ color: 'var(--gold)' }}>Privacy Policy</Link> and{' '}
        <Link to="/terms" style={{ color: 'var(--gold)' }}>Terms of Service</Link>.
      </p>
    </DocPage>
  )
}
