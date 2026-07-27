import { create } from 'zustand'
import { supabase } from '../services/supabase'
import { authApi } from '../services/api'

const useAuthStore = create((set, get) => ({
  user: null,         // Supabase user (customer)
  opUser: null,       // Operator user (JWT login)
  opToken: null,
  loading: true,

  // ── Customer auth (Google OAuth via Supabase) ───────────────────────────────
  initAuth: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ user: data.session?.user ?? null, loading: false })
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null })

      // Sync profile to backend
      if (session?.user) {
        authApi.syncProfile({
          id: session.user.id,
          fullName: session.user.user_metadata?.full_name || '',
          email: session.user.email,
        }).catch(() => {})
      }
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },

  // ── Operator auth (JWT) ─────────────────────────────────────────────────────
  operatorLogin: async (username, password) => {
    const res = await authApi.login({ username, password })
    localStorage.setItem('sv_token', res.data.accessToken)
    localStorage.setItem('sv_refresh_token', res.data.refreshToken)
    localStorage.setItem('sv_op_user', JSON.stringify(res.data.user))
    localStorage.setItem('sv_operator', JSON.stringify(res.data.operator))
    set({ opUser: res.data.user, opToken: res.data.accessToken })
    return res.data
  },

  operatorLogout: () => {
    localStorage.removeItem('sv_token')
    localStorage.removeItem('sv_refresh_token')
    localStorage.removeItem('sv_op_user')
    localStorage.removeItem('sv_operator')
    set({ opUser: null, opToken: null })
  },

  initOperatorAuth: () => {
    const token = localStorage.getItem('sv_token')
    const opUser = localStorage.getItem('sv_op_user')
    if (token && opUser) {
      set({ opToken: token, opUser: JSON.parse(opUser) })
    }
  },

  isLoggedIn: () => !!get().user,
  isOperator: () => !!get().opUser,
}))

export default useAuthStore
