-- =============================================================================
-- 004 — Persist password reset tokens
--
-- Safe to re-run.
--
-- Why: reset tokens lived in a module-level `new Map()` inside the API process.
-- That works on one long-lived dev server and nowhere else. On Render the free
-- tier sleeps after 15 minutes and every deploy restarts the process, so a
-- reset link emailed at 10:00 is already dead by 10:20 — and the user gets
-- "Invalid or expired reset token" for a token that never expired. Run more
-- than one instance and it fails outright, because the token is only known to
-- whichever instance happened to serve the request.
--
-- The token is stored as a SHA-256 hash, not the token itself: this column is a
-- password-equivalent, and a database leak should not hand over live reset
-- links. The raw token exists only in the email.
-- =============================================================================

ALTER TABLE public.operator_users
  ADD COLUMN IF NOT EXISTS reset_token_hash    text,
  ADD COLUMN IF NOT EXISTS reset_token_expires timestamptz;

-- Reset redeems by hash, so it needs to be findable. Partial, because almost
-- every row has no reset in flight at any given moment.
CREATE INDEX IF NOT EXISTS operator_users_reset_token_hash_idx
  ON public.operator_users (reset_token_hash)
  WHERE reset_token_hash IS NOT NULL;

COMMENT ON COLUMN public.operator_users.reset_token_hash IS
  'SHA-256 of the active password reset token. Never the token itself. Cleared on use.';
