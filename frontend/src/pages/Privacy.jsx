/**
 * ⚠ DRAFT — NOT LEGAL ADVICE.
 *
 * This is a structurally complete privacy policy written to match what the
 * SkyVayu codebase actually does with data. It has NOT been reviewed by a
 * lawyer. Before publishing:
 *   1. Replace every [BRACKETED] placeholder with real company details.
 *   2. Have it reviewed against India's DPDP Act 2023, including the notice,
 *      consent and grievance-officer requirements.
 *   3. Re-check the sub-processor list below against what you actually use.
 */

import { Link } from 'react-router-dom'
import DocPage, { doc } from '../components/layout/DocPage'

export default function Privacy() {
  return (
    <DocPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="What we collect when you request a charter, why we collect it, who it is shared with, and the control you have over it."
      updated="22 July 2026"
    >
      <h2 style={doc.h2}>1. Who we are</h2>
      <p style={doc.p}>
        SkyVayu is operated by <strong style={doc.strong}>SPANPRO Project Management Private Limited</strong>,
        registered at <strong style={doc.strong}>Ground Floor, A-31, Sector 4, Noida, Gautam Buddha Nagar,
        Uttar Pradesh 201301, India</strong>. For anything in this policy, write to{' '}
        <strong style={doc.strong}>privacy@skyvayu.com</strong>.
      </p>

      <h2 style={doc.h2}>2. What we collect</h2>
      <h3 style={doc.h3}>Information you give us</h3>
      <ul style={doc.ul}>
        <li style={doc.li}><strong style={doc.strong}>Account details</strong> — when you sign in with Google we receive your name, email address and profile identifier. We never see your Google password.</li>
        <li style={doc.li}><strong style={doc.strong}>Trip details</strong> — departure, destination, dates, passenger count, and any special requirements you select, such as medical, pet or infant travel.</li>
        <li style={doc.li}><strong style={doc.strong}>Booking details</strong> — traveller name, email and phone number provided at checkout.</li>
        <li style={doc.li}><strong style={doc.strong}>Messages</strong> — anything you send through our contact and feedback forms.</li>
      </ul>

      <h3 style={doc.h3}>Information collected automatically</h3>
      <ul style={doc.ul}>
        <li style={doc.li}>Technical data needed to serve and secure the site, including IP address and browser type, used for rate limiting and abuse prevention.</li>
        <li style={doc.li}>Server logs of API requests, retained for troubleshooting.</li>
      </ul>

      <h3 style={doc.h3}>What we do not collect</h3>
      <p style={doc.p}>
        We do not store your card number, UPI ID or bank credentials. Payments are handled entirely by our
        payment gateway; we receive only a payment reference and whether the payment succeeded.
      </p>

      <h2 style={doc.h2}>3. Special categories</h2>
      <p style={doc.p}>
        If you request an air ambulance or medical assistance, the fact of that request is shared with operators
        so they can configure the aircraft. Please do not send diagnoses or medical records through this
        platform — share those directly with the operator or medical team.
      </p>

      <h2 style={doc.h2}>4. Why we use it</h2>
      <ul style={doc.ul}>
        <li style={doc.li}><strong style={doc.strong}>To get you quotations</strong> — your trip details are shared with operators who can serve the route. This is the core purpose of the service.</li>
        <li style={doc.li}><strong style={doc.strong}>To complete bookings</strong> — traveller details go to the operating carrier, which needs them for the manifest and regulatory filings.</li>
        <li style={doc.li}><strong style={doc.strong}>To communicate</strong> — booking confirmations, invoices and replies to your enquiries.</li>
        <li style={doc.li}><strong style={doc.strong}>To keep the platform safe</strong> — rate limiting, fraud and abuse prevention.</li>
        <li style={doc.li}><strong style={doc.strong}>To meet legal obligations</strong> — tax, accounting and aviation record-keeping.</li>
      </ul>

      <h2 style={doc.h2}>5. Who your data is shared with</h2>
      <ul style={doc.ul}>
        <li style={doc.li}><strong style={doc.strong}>Charter operators</strong> — the ones able to serve your route receive your trip details so they can quote. The operator you book receives the traveller contact details.</li>
        <li style={doc.li}><strong style={doc.strong}>Payment gateway</strong> — to process your payment.</li>
        <li style={doc.li}><strong style={doc.strong}>Infrastructure and email providers</strong> — for hosting, database and transactional email.</li>
        <li style={doc.li}><strong style={doc.strong}>Authorities</strong> — where required by law, or by aviation and security regulations.</li>
      </ul>
      <p style={doc.p}>We do not sell your personal data, and we do not share it for third-party advertising.</p>

      <h2 style={doc.h2}>6. Where it is stored</h2>
      <p style={doc.p}>
        Our database and hosting run on managed cloud infrastructure. Some providers process data outside India;
        where that happens we rely on their contractual data-protection commitments. Region details are available
        on request from <strong style={doc.strong}>privacy@skyvayu.com</strong>.
      </p>

      <h2 style={doc.h2}>7. How long we keep it</h2>
      <ul style={doc.ul}>
        <li style={doc.li}><strong style={doc.strong}>Booking and invoice records</strong> — retained as long as tax and accounting law requires.</li>
        <li style={doc.li}><strong style={doc.strong}>Quotation requests that never became bookings</strong> — retained to help with repeat enquiries, and deleted on request.</li>
        <li style={doc.li}><strong style={doc.strong}>Account data</strong> — kept until you ask us to delete your account.</li>
      </ul>

      <h2 style={doc.h2}>8. Your rights</h2>
      <p style={doc.p}>
        You may ask us to access, correct or delete your personal data, withdraw consent for optional processing,
        or nominate someone to exercise these rights on your behalf. Write to{' '}
        <strong style={doc.strong}>privacy@skyvayu.com</strong> and we will respond within the period required
        by law. Deletion cannot extend to records we must retain for tax or aviation compliance.
      </p>

      <h2 style={doc.h2}>9. Grievance officer</h2>
      <p style={doc.p}>
        If you are not satisfied with our response, contact our grievance officer:{' '}
        <strong style={doc.strong}>[GRIEVANCE OFFICER NAME]</strong>, <strong style={doc.strong}>[GRIEVANCE OFFICER EMAIL]</strong>,{' '}
        <strong style={doc.strong}>[PHONE]</strong>.
      </p>

      <h2 style={doc.h2}>10. Security</h2>
      <p style={doc.p}>
        Traffic is encrypted in transit. Access to production data is restricted, API access is authenticated and
        rate limited, and payments are verified server-side. No system is perfectly secure, but if a breach affects
        your data we will notify you and the regulator as the law requires.
      </p>

      <h2 style={doc.h2}>11. Children</h2>
      <p style={doc.p}>
        This platform is not intended for use by children. Infants and minors may of course travel — a parent or
        guardian provides their details as part of the booking.
      </p>

      <h2 style={doc.h2}>12. Changes</h2>
      <p style={doc.p}>
        We will update this policy as the service changes and revise the date above. Material changes will be
        notified by email or a notice on the site.
      </p>

      <p style={{ ...doc.p, marginTop: 40 }}>
        See also <Link to="/terms" style={{ color: 'var(--gold)' }}>Terms of Service</Link> and{' '}
        <Link to="/cookies" style={{ color: 'var(--gold)' }}>Cookie Policy</Link>.
      </p>
    </DocPage>
  )
}
