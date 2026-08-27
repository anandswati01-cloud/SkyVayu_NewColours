// API service — talks to the Phase 1 backend
import { config } from '../config/env'
import { supabase } from './supabase'

const API_URL = config.API_URL

/**
 * Two token types reach the API: the operator/admin token this API issues, and
 * the customer's Supabase access token. The operator portal token wins when
 * present, so operator requests are unchanged.
 */
async function getToken() {
  const operatorToken = localStorage.getItem('sv_token')
  if (operatorToken) return operatorToken

  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || ''
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = await getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, message: data.error || 'Request failed', data }
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
}

// Auth
export const authApi = {
  login: (body) => api.post('/api/auth/login', body),
  logout: () => api.post('/api/auth/logout'),
  profile: () => api.get('/api/auth/profile'),
  // Phone and KYC details. The server whitelists the columns — kyc_verified is
  // not one of them, so a customer cannot mark their own documents approved.
  updateProfile: (body) => api.patch('/api/auth/profile', body),
  refresh: (refreshToken) => api.post('/api/auth/refresh', { refreshToken }),
  syncProfile: (body) => api.post('/api/auth/sync-profile', body),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (body) => api.post('/api/auth/reset-password', body),
}

// Queries
export const queryApi = {
  create: (body) => api.post('/api/queries', body),
  list: (params = '') => api.get(`/api/queries${params}`),
  get: (id) => api.get(`/api/queries/${id}`),
  update: (id, body) => api.patch(`/api/queries/${id}`, body),
}

// Bookings
export const bookingApi = {
  create: (body) => api.post('/api/bookings', body),
  list: () => api.get('/api/bookings'),
  get: (id) => api.get(`/api/bookings/${id}`),
  update: (id, body) => api.put(`/api/bookings/${id}`, body),
}

// Quotes
export const quoteApi = {
  list: (params = '') => api.get(`/api/quotes${params}`),
  get: (id) => api.get(`/api/quotes/${id}`),
  create: (body) => api.post('/api/quotes', body),
  update: (id, body) => api.patch(`/api/quotes/${id}`, body),
  claim: (queryId) => api.post('/api/quotes/claim', { queryId }),
  releaseClaim: (claimId) => api.delete(`/api/quotes/claims/${claimId}`),
}

// Fleet
/* Phone verification. None of these need a session — a visitor verifies a
 * number before they have an account. `verify` returns a signed phoneToken that
 * /api/queries reads the number out of, so the token is the valuable part of
 * the response, not the boolean. */
export const otpApi = {
  send: (phone) => api.post('/api/otp/send', { phone }),
  verify: (phone, code) => api.post('/api/otp/verify', { phone, code }),
  status: (token) => api.get(`/api/otp/status?token=${encodeURIComponent(token)}`),
}

export const fleetApi = {
  list: () => api.get('/api/fleet'),
  get: (id) => api.get(`/api/fleet/${id}`),
  add: (body) => api.post('/api/fleet', body),
  update: (id, body) => api.put(`/api/fleet/${id}`, body),
  delete: (id) => api.delete(`/api/fleet/${id}`),
  updateDocStatus: (id, docStatus) => api.patch(`/api/fleet/${id}/status`, { docStatus }),
}

// Admin — always uses the admin session token explicitly, so an operator token
// left in localStorage from another tab cannot shadow it.
async function adminRequest(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('sv_admin_token')
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, message: data.error || 'Request failed', data }
  return data
}

export const adminApi = {
  // Confirms the stored token belongs to an admin. The server re-reads
  // profiles.is_admin on every admin request, so a 200 here is the real answer —
  // the login screen used to ask the database directly from the browser, which
  // row level security correctly refuses to answer.
  me: () => adminRequest('GET', '/api/admin/me'),
  list: (resource) => adminRequest('GET', `/api/admin/${resource}`),
  update: (resource, id, body) => adminRequest('PATCH', `/api/admin/${resource}/${id}`, body),
  remove: (resource, id) => adminRequest('DELETE', `/api/admin/${resource}/${id}`),

  // Payment operations. They live on /api/payments rather than /api/admin, but
  // are behind the same server-side admin check — so they go out with the admin
  // token, not whatever getToken() happens to find first.
  refund: (body) => adminRequest('POST', '/api/payments/refund', body),
  reconcile: (bookingId) => adminRequest('POST', `/api/payments/reconcile/${bookingId}`),
  dismiss: (bookingId) => adminRequest('POST', `/api/payments/dismiss/${bookingId}`),
}

// Payments — the amount is never sent from here; the server prices the quote.
export const paymentApi = {
  createOrder: (body) => api.post('/api/payments/order', body),
  verify: (body) => api.post('/api/payments/verify', body),
}

// Operators
export const operatorApi = {
  register: (body) => api.post('/api/operators', body),
  get: (id) => api.get(`/api/operators/${id}`),
  update: (id, body) => api.put(`/api/operators/${id}`, body),
  listUsers: (id) => api.get(`/api/operators/${id}/users`),
  addUser: (id, body) => api.post(`/api/operators/${id}/users`, body),
  updateUser: (id, uid, body) => api.patch(`/api/operators/${id}/users/${uid}`, body),
  removeUser: (id, uid) => api.delete(`/api/operators/${id}/users/${uid}`),
}

// Feedback
export const feedbackApi = {
  submit: (body) => api.post('/api/feedback', body),
  newsletter: (email) => api.post('/api/feedback/newsletter', { email }),
  contact: (body) => api.post('/api/feedback/contact', body),
}
