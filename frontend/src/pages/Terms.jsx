/**
 * ⚠ DRAFT — NOT LEGAL ADVICE.
 *
 * Structurally complete terms written to match how the platform actually
 * behaves (marketplace, not carrier; operator sets cancellation terms; payment
 * verified server-side). NOT reviewed by a lawyer. Before publishing:
 *   1. Fill every [BRACKETED] placeholder.
 *   2. Have a lawyer confirm the liability, cancellation and jurisdiction
 *      clauses, and check the intermediary position under Indian law.
 *   3. Section 7 must match your real refund practice.
 */

import { Link } from 'react-router-dom'
import DocPage, { doc } from '../components/layout/DocPage'

export default function Terms() {
  return (
    <DocPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="The agreement between you and SkyVayu when you use this platform to request quotations and book charter flights."
      updated="22 July 2026"
    >
      <div style={doc.note}>
        <strong style={doc.strong}>The most important thing to understand:</strong> SkyVayu is a marketplace, not
        an airline. We do not own or operate aircraft. Your flight is operated by the licensed operator you
        select, and your contract of carriage is with them.
      </div>

      <h2 style={doc.h2}>1. Who these terms are with</h2>
      <p style={doc.p}>
        This platform is operated by <strong style={doc.strong}>[COMPANY LEGAL NAME]</strong> ("SkyVayu", "we"),
        registered at <strong style={doc.strong}>[REGISTERED ADDRESS]</strong>. By using the platform you accept
        these terms. If you do not accept them, please do not use the service.
      </p>

      <h2 style={doc.h2}>2. What SkyVayu does</h2>
      <p style={doc.p}>
        We connect you with operators holding a DGCA Non-Scheduled Operator Permit. We transmit your trip request
        to operators able to serve it, present their quotations, and handle booking and payment. We verify each
        operator's licence, insurance and aircraft documents before allowing them to quote.
      </p>
      <p style={doc.p}>
        We are not the carrier. We do not control the aircraft, the crew, or the decision to operate a flight.
      </p>

      <h2 style={doc.h2}>3. Your account</h2>
      <ul style={doc.ul}>
        <li style={doc.li}>You must be 18 or older and able to enter a contract.</li>
        <li style={doc.li}>The information you give us — names, contact details, passenger counts — must be accurate. Aviation manifests depend on it.</li>
        <li style={doc.li}>You are responsible for activity under your account.</li>
      </ul>

      <h2 style={doc.h2}>4. Quotations</h2>
      <ul style={doc.ul}>
        <li style={doc.li}>Quotations come from operators, not from us. They are indicative until confirmed and are typically valid for a limited window.</li>
        <li style={doc.li}>Prices include GST at the applicable rate and are shown itemised.</li>
        <li style={doc.li}>A quotation may be withdrawn if the aircraft becomes unavailable before you book.</li>
        <li style={doc.li}>The aircraft named on a quotation may be substituted for one of equal or better capability where operationally necessary.</li>
      </ul>

      <h2 style={doc.h2}>5. Booking and payment</h2>
      <ul style={doc.ul}>
        <li style={doc.li}>A booking is confirmed only when payment has been received and verified on our servers. A screen or email suggesting otherwise does not create a confirmed booking.</li>
        <li style={doc.li}>The amount charged is the total shown on the quotation you selected.</li>
        <li style={doc.li}>Card and bank details are handled by our payment gateway; we do not store them.</li>
      </ul>

      <h2 style={doc.h2}>6. Changes, cancellation and refunds</h2>
      <p style={doc.p}>
        <strong style={doc.strong}>Cancellation and rescheduling terms are set by the operating carrier</strong> and
        are shown with the quotation before you confirm. They vary by aircraft and by how close to departure the
        change is made.
      </p>
      <ul style={doc.ul}>
        <li style={doc.li}>Cancellation requests must be made in writing through the platform or the charter desk.</li>
        <li style={doc.li}>Where a refund is due, it is returned to the original payment method. Gateway timelines apply.</li>
        <li style={doc.li}>If the operator cancels for a reason within their control, you are entitled to a full refund of amounts paid through SkyVayu.</li>
      </ul>

      <h2 style={doc.h2}>7. Flights may not operate</h2>
      <p style={doc.p}>
        Charter flying depends on weather, airspace and airport clearances, air traffic control, technical
        serviceability and crew duty limits. The commander's decision on whether a flight can safely operate is
        final. Where a flight cannot operate for such reasons, the operator's terms govern rescheduling or refund;
        neither SkyVayu nor the operator is liable for consequential losses such as missed connections, hotels or
        business opportunities.
      </p>

      <h2 style={doc.h2}>8. Your responsibilities as a passenger</h2>
      <ul style={doc.ul}>
        <li style={doc.li}>Carry valid identification, and for international sectors valid passports, visas and clearances.</li>
        <li style={doc.li}>Arrive at the reporting time given by the operator. Charter slots are not open-ended.</li>
        <li style={doc.li}>Declare accurate passenger weights and baggage where asked — these affect load and fuel calculations.</li>
        <li style={doc.li}>Do not carry prohibited or dangerous goods. Declare pets, medical equipment and firearms in advance.</li>
        <li style={doc.li}>Follow crew instructions at all times.</li>
      </ul>

      <h2 style={doc.h2}>9. Operators on the platform</h2>
      <p style={doc.p}>
        Operators warrant that they hold a valid permit, current airworthiness and insurance for every aircraft
        listed, and appropriately licensed crew. An aircraft whose documents have lapsed cannot be quoted until
        renewals are uploaded and approved.
      </p>

      <h2 style={doc.h2}>10. Liability</h2>
      <p style={doc.p}>
        Carriage is subject to the operator's conditions of carriage and to applicable aviation liability law,
        including the Carriage by Air Act and international conventions where relevant. SkyVayu's liability in
        connection with the platform is limited to the platform fees we have received for the affected booking,
        except where liability cannot be limited by law.
      </p>

      <h2 style={doc.h2}>11. Acceptable use</h2>
      <p style={doc.p}>
        Do not submit false requests, scrape or overload the platform, attempt to access data that is not yours,
        or use the service unlawfully. We may suspend accounts that do.
      </p>

      <h2 style={doc.h2}>12. Governing law</h2>
      <p style={doc.p}>
        These terms are governed by the laws of India. Courts at <strong style={doc.strong}>[CITY]</strong> have
        exclusive jurisdiction.
      </p>

      <h2 style={doc.h2}>13. Changes to these terms</h2>
      <p style={doc.p}>
        We may update these terms and will revise the date above. Bookings already confirmed are governed by the
        terms in force when they were made.
      </p>

      <p style={{ ...doc.p, marginTop: 40 }}>
        Questions? Reach us through the <Link to="/help" style={{ color: 'var(--gold)' }}>Help Centre</Link>. See
        also our <Link to="/privacy" style={{ color: 'var(--gold)' }}>Privacy Policy</Link>.
      </p>
    </DocPage>
  )
}
