import OperatorLoginForm from './OperatorLoginForm'

/* The standalone /operator page. The form itself lives in OperatorLoginForm so
 * the site header can open the same thing in a modal — this file is now just the
 * full-screen frame around it. The route is kept because operators bookmark it
 * and OperatorDashboard redirects here when a session expires. */

const page = {
  minHeight: '100vh',
  background: '#0a0f1e',
  display: 'flex',
  position: 'relative',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
}

export default function OperatorLogin() {
  return (
    <div style={page}>
      <OperatorLoginForm />
    </div>
  )
}
