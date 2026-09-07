import { Link } from 'react-router-dom'
import useSectionNav from './useSectionNav'
import logo from '../../assets/skyvayu-wordmark.png'
import './layout.css'

/**
 * The Support column is not just navigation. Razorpay's activation review checks
 * that the refund policy, contact page, terms and privacy policy are each
 * reachable from the site, and the payment page links to the same three. Keep
 * every one of these links here — dropping one to tidy the design is the kind of
 * change nobody notices until an activation request comes back rejected.
 */
export default function Footer() {
  const goToSection = useSectionNav()

  return (
    <footer className="ft">
      <div className="ft__i">
        <div className="ft__top">
          <div>
            <Link to="/" className="ft__logo" aria-label="SkyVayu — home">
              <img src={logo} alt="SkyVayu" />
            </Link>
            <p className="ft__tag">
              India's private air charter marketplace. Every operator verified.
              Every quote transparent.
            </p>
            <div className="ft__social">
              <a href="https://www.linkedin.com/company/skyvayu" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href="https://twitter.com/skyvayu" target="_blank" rel="noopener noreferrer">X</a>
              <a href="https://www.instagram.com/skyvayu" target="_blank" rel="noopener noreferrer">Instagram</a>
            </div>
          </div>

          {/* Fleet and About Us are full pages, matching the header. Destinations
              and Get Quotes have no page of their own — they scroll to sections
              of the home page, from whatever route the footer is rendered on. */}
          <div className="ft__col">
            <h4>Navigate</h4>
            <ul>
              <li><Link to="/fleet">Fleet</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><a onClick={() => goToSection('destinations')}>Destinations</a></li>
              <li><a onClick={() => goToSection('booking')}>Get Quotes</a></li>
              <li><Link to="/operator">Operator Login</Link></li>
            </ul>
          </div>

          <div className="ft__col">
            <h4>Support</h4>
            <ul>
              <li><Link to="/help">Help Center</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/refunds">Refund &amp; Cancellation</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/cookies">Cookie Policy</Link></li>
            </ul>
          </div>

          <div className="ft__col">
            <h4>Offices</h4>
            <ul>
              <li><Link to="/contact">Mumbai</Link></li>
              <li><Link to="/contact">Delhi</Link></li>
              <li><Link to="/contact">Dubai</Link></li>
            </ul>
          </div>
        </div>

        <div className="ft__bot">
          <p className="ft__copy">© 2026 SkyVayu. All rights reserved.</p>
          <div className="ft__offices">
            <span>Mumbai</span>
            <span>Delhi</span>
            <span>Dubai</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
