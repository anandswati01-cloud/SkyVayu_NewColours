import { create } from 'zustand'
import { authApi, quoteApi, queryApi, fleetApi, operatorApi } from '../services/api'

const useOperatorStore = create((set, get) => ({
  user: null,
  operator: null,
  token: null,

  // Data
  activeQueries: [],
  sharedQuotes: [],
  confirmedQuotes: [],
  expiredQueries: [],
  aircraftList: [],
  operatorUsers: [],
  activeClaims: [],

  loading: false,
  currentClaimId: null,

  // "Has the first fetch finished?", distinct from `loading`, which flips back
  // and forth on every 10-second poll. The sections show a skeleton until these
  // turn true; without them an empty list is indistinguishable from an
  // unfetched one and the UI claims there is no work waiting.
  queriesLoaded: false,
  fleetLoaded: false,

  // ── Auth ────────────────────────────────────────────────────────────────────
  init: () => {
    const token = localStorage.getItem('sv_token')
    const user = localStorage.getItem('sv_op_user')
    const operator = localStorage.getItem('sv_operator')
    if (token && user && operator) {
      set({ token, user: JSON.parse(user), operator: JSON.parse(operator) })
      return true
    }
    return false
  },

  login: async (username, password) => {
    const res = await authApi.login({ username, password })
    const { accessToken, refreshToken, user, operator } = res.data
    localStorage.setItem('sv_token', accessToken)
    localStorage.setItem('sv_refresh_token', refreshToken)
    localStorage.setItem('sv_op_user', JSON.stringify(user))
    localStorage.setItem('sv_operator', JSON.stringify(operator))
    set({ token: accessToken, user, operator })
    return { user, operator }
  },

  logout: () => {
    localStorage.removeItem('sv_token')
    localStorage.removeItem('sv_refresh_token')
    localStorage.removeItem('sv_op_user')
    localStorage.removeItem('sv_operator')
    set({ user: null, operator: null, token: null, activeQueries: [], sharedQuotes: [], confirmedQuotes: [], expiredQueries: [], aircraftList: [], operatorUsers: [], activeClaims: [], queriesLoaded: false, fleetLoaded: false })
  },

  isOwner: () => get().user?.role === 'owner',

  // ── Load all dashboard data ──────────────────────────────────────────────────
  loadAllData: async () => {
    const { operator } = get()
    if (!operator) return
    set({ loading: true })
    try {
      const [queriesRes, quotesRes, usersRes] = await Promise.all([
        queryApi.list(`?status=open&limit=100`),
        quoteApi.list(`?operatorId=${operator.id}&limit=200`),
        operatorApi.listUsers(operator.id),
      ])

      const queries = queriesRes.data || []
      const quotes = quotesRes.data || []
      const users = usersRes.data || []

      const quotedQueryIds = quotes.map(q => q.query_id)
      const active = queries.filter(q => !quotedQueryIds.includes(q.id) && new Date(q.created_at) > new Date(Date.now() - 60 * 60 * 1000))
      const shared = quotes.filter(q => q.status === 'shared')
      const confirmed = quotes.filter(q => ['accepted', 'confirmed', 'booked'].includes(q.status))
      const expired = queries.filter(q => new Date(q.created_at) < new Date(Date.now() - 60 * 60 * 1000) && !['accepted', 'confirmed'].includes(q.status))

      set({
        activeQueries: active,
        sharedQuotes: shared,
        confirmedQuotes: confirmed,
        expiredQueries: expired,
        operatorUsers: users,
        loading: false,
        queriesLoaded: true,
      })
    } catch (e) {
      console.error('loadAllData error:', e)
      // Marked loaded on failure too: a failed fetch should fall through to the
      // empty state, not leave a skeleton shimmering forever.
      set({ loading: false, queriesLoaded: true })
    }
  },

  loadFleet: async () => {
    try {
      const res = await fleetApi.list()
      set({ aircraftList: res.data || [], fleetLoaded: true })
    } catch (e) {
      // Previously uncaught, so a fleet request that failed surfaced only as an
      // unhandled rejection in the console.
      console.error('loadFleet error:', e)
      set({ fleetLoaded: true })
    }
  },

  // ── Quote claim ──────────────────────────────────────────────────────────────
  claimQuery: async (queryId) => {
    const res = await quoteApi.claim(queryId)
    set({ currentClaimId: res.data?.claim?.id || null })
    return res.data
  },

  releaseClaim: async () => {
    const { currentClaimId } = get()
    if (currentClaimId) {
      await quoteApi.releaseClaim(currentClaimId)
      set({ currentClaimId: null })
    }
  },

  // ── Submit quote ─────────────────────────────────────────────────────────────
  submitQuote: async (queryId, aircraftId, aircraftType, aircraftReg, baseCharge, handlingFee, crewAccommodation, catering, notes) => {
    const res = await quoteApi.create({ queryId, aircraftId, aircraftType, aircraftRegistration: aircraftReg, baseCharge, handlingFee, crewAccommodation, catering, notes })
    return res.data
  },
}))

export default useOperatorStore
