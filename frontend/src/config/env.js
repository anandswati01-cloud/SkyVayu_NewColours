/**
 * Frontend runtime configuration — the single source of truth for all env vars.
 *
 * Nothing outside this file should read `import.meta.env`. Import the frozen
 * config instead:
 *
 *   import { config } from '../config/env'
 *
 * Two rules this file enforces:
 *
 *  1. Everything shipped here is PUBLIC. Vite inlines every VITE_* variable
 *     into the bundle, so anyone can read it in devtools. Only publishable
 *     values belong here — the Supabase anon key (guarded by row level
 *     security) is fine; a service role key or any API secret is not.
 *  2. A production build with missing config fails loudly at startup instead of
 *     silently pointing the live site at localhost.
 *
 * Vite replaces `import.meta.env.VITE_X` by static text substitution, so every
 * read below must be written out literally — dynamic lookups do not survive the
 * production build.
 */

const MODE = import.meta.env.MODE
const IS_PRODUCTION = import.meta.env.PROD

const rawApiUrl = import.meta.env.VITE_API_URL
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Invoice identity. Public by definition — a GSTIN and registered address are
// printed on every invoice. Optional: each line is omitted from the invoice when
// unset, so the document stays correct before the entity is registered rather
// than printing an empty label.
const rawCompanyName = import.meta.env.VITE_COMPANY_LEGAL_NAME
const rawCompanyAddress = import.meta.env.VITE_COMPANY_ADDRESS
const rawCompanyGstin = import.meta.env.VITE_COMPANY_GSTIN
const rawCompanyState = import.meta.env.VITE_COMPANY_STATE

// A service role key bypasses row level security. In a browser bundle that is a
// full database compromise, so refuse to run rather than ship it.
if (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'VITE_SUPABASE_SERVICE_ROLE_KEY is set. The service role key bypasses row ' +
    'level security and must never be exposed to the browser — remove it from ' +
    'the frontend environment and keep it on the backend only.'
  )
}

const missing = []

/** @param {string} name @param {string|undefined} value @param {string} [devFallback] */
function required(name, value, devFallback) {
  if (value && value.trim() !== '') return value.trim()
  if (!IS_PRODUCTION && devFallback !== undefined) return devFallback
  missing.push(name)
  return ''
}

// Trailing slashes would produce '//api/...' once a path is appended.
const stripSlash = (url) => url.replace(/\/+$/, '')

export const config = Object.freeze({
  MODE,
  IS_PRODUCTION,

  /** Base URL of the SkyVayu API, no trailing slash. */
  API_URL: stripSlash(required('VITE_API_URL', rawApiUrl, 'http://localhost:5000')),

  SUPABASE_URL: stripSlash(required('VITE_SUPABASE_URL', rawSupabaseUrl)),
  SUPABASE_ANON_KEY: required('VITE_SUPABASE_ANON_KEY', rawSupabaseAnonKey),

  /** Printed on tax invoices. Empty string means "leave the line off". */
  COMPANY_LEGAL_NAME: (rawCompanyName || '').trim(),
  COMPANY_ADDRESS: (rawCompanyAddress || '').trim(),
  COMPANY_GSTIN: (rawCompanyGstin || '').trim(),
  COMPANY_STATE: (rawCompanyState || '').trim(),
})

if (missing.length > 0) {
  throw new Error(
    `Missing required environment ${missing.length === 1 ? 'variable' : 'variables'}: ` +
    `${missing.join(', ')}.\n` +
    'Copy frontend/.env.example to frontend/.env and fill it in, or set these in ' +
    'your hosting provider before building.'
  )
}
