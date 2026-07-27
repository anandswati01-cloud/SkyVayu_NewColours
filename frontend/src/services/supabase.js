import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env'

export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
})

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

/**
 * DEV ONLY — sign in with a local test account using email + password.
 *
 * This exists so the app can be tested end to end on localhost without the
 * Google OAuth round-trip, which redirects to the production Site URL unless
 * localhost is in the Supabase redirect allowlist. It uses a real Supabase
 * session, so the token it produces passes the backend's verification and every
 * authenticated feature works.
 *
 * `import.meta.env.DEV` is false in production builds, so this refuses to run
 * there even if the button that calls it somehow shipped. Create the account
 * first with:  cd backend && npm run dev:user
 */
export async function signInAsDevUser(
  email = import.meta.env.VITE_DEV_USER_EMAIL || 'dev@skyvayu.local',
  password = import.meta.env.VITE_DEV_USER_PASSWORD || 'devpassword123',
) {
  if (!import.meta.env.DEV) {
    throw new Error('Dev sign-in is disabled outside development.')
  }
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}
