import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Scrolls to a section of the home page from anywhere on the site.
 *
 * The nav and the footer both link to the same four sections, and both are
 * rendered on pages that are not the home page. A plain anchor would do nothing
 * from /terms, so this navigates first and lets Home scroll once it has
 * mounted — it reads the id off location.state.
 *
 * Shared rather than copied into both components, so the two cannot drift.
 */
export default function useSectionNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return function goToSection(id) {
    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/', { state: { scrollTo: id } })
    }
  }
}
