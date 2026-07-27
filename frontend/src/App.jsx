import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Toast from './components/ui/Toast'

import Home from './pages/Home'
import Results from './pages/Results'
import Payment from './pages/Payment'
import Confirmed from './pages/Confirmed'
import Profile from './pages/Profile'
import OperatorLogin from './pages/operator/OperatorLogin'
import OperatorDashboard from './pages/operator/OperatorDashboard'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import About from './pages/About'
import Fleet from './pages/Fleet'
import Help from './pages/Help'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Cookies from './pages/Cookies'
import Register from './pages/Register'

// Operator pages don't show the main Navbar/Footer
function CustomerLayout({ children }) {
  return <>
    <Navbar />
    {children}
    <Footer />
  </>
}

export default function App() {
  const initAuth = useAuthStore(s => s.initAuth)
  useEffect(() => { initAuth() }, [])

  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        {/* Customer-facing routes (with Navbar + Footer) */}
        <Route path="/" element={<CustomerLayout><Home /></CustomerLayout>} />
        <Route path="/results" element={<CustomerLayout><Results /></CustomerLayout>} />
        <Route path="/payment" element={<CustomerLayout><Payment /></CustomerLayout>} />
        <Route path="/confirmed" element={<CustomerLayout><Confirmed /></CustomerLayout>} />
        <Route path="/profile" element={<CustomerLayout><Profile /></CustomerLayout>} />
        <Route path="/fleet" element={<CustomerLayout><Fleet /></CustomerLayout>} />
        <Route path="/about" element={<CustomerLayout><About /></CustomerLayout>} />
        <Route path="/register" element={<CustomerLayout><Register /></CustomerLayout>} />
        <Route path="/help" element={<CustomerLayout><Help /></CustomerLayout>} />
        <Route path="/privacy" element={<CustomerLayout><Privacy /></CustomerLayout>} />
        <Route path="/terms" element={<CustomerLayout><Terms /></CustomerLayout>} />
        <Route path="/cookies" element={<CustomerLayout><Cookies /></CustomerLayout>} />

        {/* Operator portal (no Navbar/Footer — full-screen app) */}
        <Route path="/operator" element={<OperatorLogin />} />
        <Route path="/operator/dashboard" element={<OperatorDashboard />} />

        {/* Admin portal */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
