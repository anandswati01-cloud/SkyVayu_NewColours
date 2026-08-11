/**
 * ⚠ DRAFT — NOT LEGAL ADVICE.
 *
 * Razorpay's activation review looks for a refund and cancellation policy at
 * its own URL, not buried inside the terms — which is why this page exists
 * separately from section 6 of Terms of Service. The two must not contradict
 * each other: if you change the window or the deductions here, change them
 * there too.
 *
 * Before publishing:
 *   1. Fill every [BRACKETED] placeholder.
 *   2. The cancellation grid below must match what operators are actually
 *      contracted to. It is currently the common charter shape, not a policy
 *      anyone has agreed to.
 *   3. Have a lawyer read it alongside Terms.
 */

import { Link } from 'react-router-dom'
import DocPage, { doc } from '../components/layout/DocPage'

// Typical charter cancellation ladder. Operator terms shown with the quotation
// override this — the table is what applies when they are silent.
const LADDER = [
  ['More than 15 days before departure', 'Full refund, less payment gateway charges'],
  ['7 to 15 days before departure', '75% of the booking value refunded'],
  ['48 hours to 7 days before departure', '50% of the booking value refunded'],
  ['Less than 48 hours before departure', 'No refund — the aircraft and crew are committed'],
  ['No-show at the reporting time', 'No refund'],
]

export default function Refunds() {
  const th = { textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)', padding: '12px 14px', borderBottom: '1px solid var(--white-10)' }
  const td = { fontSize: 14, lineHeight: 1.7, color: 'var(--white-60)', padding: '14px', borderBottom: '1px solid var(--white-10)', verticalAlign: 'top' }

  return (
    <DocPage
      eyebrow="Legal"
      title="Refund & Cancellation Policy"
      intro="When a charter booking can be cancelled, what comes back, and how long it takes to reach you."
      updated="10 August 2026"
    >
      <div style={doc.note}>
        <strong style={doc.strong}>Read this before you book.</strong> Charter is not scheduled airline travel.
        Once an aircraft and crew are assigned to your trip they are unavailable to anyone else, so cancellation
        close to departure carries real cost. The terms attached to your specific quotation always take precedence
        over the general position below.
      </div>

      <h2 style={doc.h2}>Who sets the terms</h2>
      <p style={doc.p}>
        SkyVayu is a marketplace, not a carrier. Your flight is operated by the licensed operator you selected, and{' '}
        <strong style={doc.strong}>their cancellation terms govern your booking</strong>. Those terms are shown with
        the quotation before you pay. Where a quotation is silent on cancellation, the schedule on this page applies.
      </p>

      <h2 style={doc.h2}>Cancelling a booking</h2>
      <p style={doc.p}>
        Cancellation requests must be made in writing — through your account, or by emailing{' '}
        <a href="mailto:support@skyvayu.com" style={{ color: 'var(--gold)' }}>support@skyvayu.com</a> with your
        booking reference. <strong style={doc.strong}>The cancellation takes effect when we receive it</strong>, not
        when you decided to cancel, and the refund is calculated against that timestamp.
      </p>

      <div style={{ overflowX: 'auto', margin: '20px 0 8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr>
              <th style={th}>When you cancel</th>
              <th style={th}>What is refunded</th>
            </tr>
          </thead>
          <tbody>
            {LADDER.map(([when, what]) => (
              <tr key={when}>
                <td style={{ ...td, color: 'var(--white)' }}>{when}</td>
                <td style={td}>{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={doc.h2}>When we cancel</h2>
      <p style={doc.p}>
        If the operator cancels for any reason within their control — aircraft unavailability, crew scheduling, a
        commercial decision — you receive a <strong style={doc.strong}>full refund of everything paid through
        SkyVayu</strong>, with no deduction, regardless of how close to departure it happens. We will also try to
        source a replacement aircraft first, at no additional cost to you where possible.
      </p>

      <h2 style={doc.h2}>Weather, airspace and technical cancellations</h2>
      <p style={doc.p}>
        Charter flying depends on weather, airspace and airport clearances, technical serviceability and crew duty
        limits. The commander's decision on whether a flight can safely operate is final and is not a commercial
        cancellation. Where a flight cannot operate for these reasons you may choose to{' '}
        <strong style={doc.strong}>reschedule at no charge</strong>, or take a refund of the booking value less any
        costs the operator has already irrecoverably incurred, such as positioning flights or paid airport slots.
      </p>
      <p style={doc.p}>
        Neither SkyVayu nor the operator is liable for consequential losses — missed connections, hotels, or
        business opportunities.
      </p>

      <h2 style={doc.h2}>How refunds are paid</h2>
      <ul style={doc.ul}>
        <li style={doc.li}>Refunds go back to the <strong style={doc.strong}>original payment method</strong>. We cannot redirect a refund to a different card, account or person.</li>
        <li style={doc.li}>We initiate the refund with our payment gateway within <strong style={doc.strong}>3 working days</strong> of approving your cancellation.</li>
        <li style={doc.li}>Your bank then takes a further <strong style={doc.strong}>5 to 7 working days</strong> to post it to your statement. This part is outside our control.</li>
        <li style={doc.li}>Partial refunds are permitted and are calculated on the total booking value.</li>
        <li style={doc.li}>You will receive an email confirming the refund amount and reference when it is initiated.</li>
      </ul>

      <div style={doc.note}>
        <strong style={doc.strong}>Not seen your refund?</strong> If more than 7 working days have passed since our
        confirmation email, contact us with your booking reference and we will trace it with the gateway. Refunds do
        occasionally sit in a bank's clearing queue longer than expected.
      </div>

      <h2 style={doc.h2}>Payments that did not complete</h2>
      <p style={doc.p}>
        If money left your account but you never received a booking confirmation, the payment was almost certainly
        authorised without the booking being finalised — usually a dropped connection at the moment of payment. Such
        amounts are <strong style={doc.strong}>automatically released by your bank within 5 to 7 working days</strong>.
        Contact us with the payment reference and we will confirm the status against our gateway records rather than
        leaving you to wait and see.
      </p>

      <h2 style={doc.h2}>Payment gateway charges</h2>
      <p style={doc.p}>
        Where the schedule above says "less payment gateway charges", this refers to the non-refundable transaction
        fee levied by the payment processor, currently up to <strong style={doc.strong}>[X]%</strong> of the
        transaction value. It is deducted only on customer-initiated cancellations, never when SkyVayu or the
        operator cancels.
      </p>

      <h2 style={doc.h2}>Disputes</h2>
      <p style={doc.p}>
        If you disagree with a refund calculation, write to{' '}
        <a href="mailto:support@skyvayu.com" style={{ color: 'var(--gold)' }}>support@skyvayu.com</a> within 30 days
        of the cancellation. We will respond within 7 working days with the operator's terms as applied to your
        booking. Please raise it with us before initiating a chargeback with your bank — a chargeback freezes the
        amount while it is investigated and takes considerably longer than a direct refund.
      </p>

      <p style={{ ...doc.p, marginTop: 40 }}>
        See also <Link to="/terms" style={{ color: 'var(--gold)' }}>Terms of Service</Link>,{' '}
        <Link to="/privacy" style={{ color: 'var(--gold)' }}>Privacy Policy</Link> and{' '}
        <Link to="/contact" style={{ color: 'var(--gold)' }}>Contact Us</Link>.
      </p>
    </DocPage>
  )
}
