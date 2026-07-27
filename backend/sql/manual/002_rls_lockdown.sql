-- =============================================================================
-- 002 — Row Level Security lockdown
--
-- Goal: the browser can do NOTHING against the database directly. Every read
-- and write goes through the Express API, which uses the service role key and
-- therefore bypasses RLS. RLS becomes the backstop that makes a leaked anon key
-- worthless, rather than the primary access control.
--
-- ⚠ RUN THIS ONLY AFTER BOTH OF THESE ARE TRUE — otherwise you WILL break prod:
--
--   1. backend/.env has the REAL service_role key.
--      Right now it holds an anon key, so the backend is subject to RLS too.
--      Applying this first would stop the API writing anything at all.
--      Check:  the key's payload must decode to  "role":"service_role"
--
--   2. The admin dashboard no longer queries PostgREST from the browser.
--      src/pages/admin/AdminDashboard.jsx currently reads these 7 tables
--      directly with the anon key: aircraft, bookings, contact_messages,
--      feedback, operator_users, operators, queries.
--      Until it goes through /api/admin/*, this script blanks that screen.
--
-- Run in: Supabase Dashboard → SQL Editor. Sections are separate on purpose —
-- run STEP 1 alone first and read the output.
-- =============================================================================


-- ── STEP 1 — Look before you change anything (read-only) ─────────────────────
-- Shows which tables have RLS off and what policies already exist.

SELECT c.relname                AS table_name,
       c.relrowsecurity         AS rls_enabled,
       COALESCE(p.policy_count, 0) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN (
  SELECT tablename, COUNT(*) AS policy_count
  FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename
) p ON p.tablename = c.relname
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relrowsecurity, c.relname;

-- And the policies themselves, so you know what you are about to drop:
SELECT tablename, policyname, roles, cmd, qual
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ── STEP 2 — Enable RLS on every table ───────────────────────────────────────
-- With RLS on and no policies, anon/authenticated get nothing. service_role is
-- unaffected — it bypasses RLS by design.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'charter_user_access', 'airports',
    'queries', 'quotes', 'quote_items',
    'bookings', 'booking_passengers',
    'operators', 'operator_users', 'aircraft',
    'query_claims', 'query_views',
    'feedback', 'newsletter_subscribers', 'contact_messages',
    'notifications', 'activity_logs'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
      RAISE NOTICE 'RLS enabled: %', t;
    ELSE
      RAISE NOTICE 'skipped (no such table): %', t;
    END IF;
  END LOOP;
END $$;

-- NOTE on FORCE: it makes RLS apply even to the table owner. service_role still
-- bypasses because it holds BYPASSRLS, not because it owns the table. If your
-- API starts returning empty results after this, that is the signal that it is
-- NOT actually using the service_role key.


-- ── STEP 3 — Remove permissive policies left over from the old setup ─────────
-- These are what currently let the anon key read aircraft, operators and
-- charter_user_access from any browser. Review STEP 1's output first; if you
-- have policies you wrote deliberately, exclude them by name here.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'charter_user_access', 'airports',
        'queries', 'quotes', 'quote_items',
        'bookings', 'booking_passengers',
        'operators', 'operator_users', 'aircraft',
        'query_claims', 'query_views',
        'feedback', 'newsletter_subscribers', 'contact_messages',
        'notifications', 'activity_logs'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    RAISE NOTICE 'dropped policy % on %', r.policyname, r.tablename;
  END LOOP;
END $$;


-- ── STEP 4 — Verify the lockdown ─────────────────────────────────────────────
-- Expect: rls_enabled = true and policies = 0 for every row.

SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       COALESCE(p.policy_count, 0) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN (
  SELECT tablename, COUNT(*) AS policy_count
  FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename
) p ON p.tablename = c.relname
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

-- Then confirm from outside: this must now return [] rather than rows.
--   curl "https://<project>.supabase.co/rest/v1/operators?select=*&limit=1" \
--        -H "apikey: <ANON KEY>"


-- ── OPTIONAL — belt and braces ───────────────────────────────────────────────
-- RLS with zero policies is already deny-all. Revoking the grants as well means
-- a future accidental "allow all" policy still cannot expose these tables.
-- Skip this if you plan to let the browser read anything directly later.
--
-- REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
