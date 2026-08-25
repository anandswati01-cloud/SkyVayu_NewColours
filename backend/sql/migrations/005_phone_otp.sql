-- =============================================================================
-- 005 — Phone number verification by SMS OTP
--
-- Safe to re-run.
--
-- Why: the charter form collected no reliable way to reach the customer. A
-- query could be submitted with any phone number, or none, and the desk had to
-- chase an email that may never be read. Verifying the number before the
-- request is created means every quote request carries a number somebody
-- actually answered on, which is also the identity the membership tier will be
-- built on later.
--
-- The code is stored as a SHA-256 hash, following 004: a live OTP is a
-- credential, and a database leak should not hand over the ability to complete
-- somebody else's verification. The plaintext exists only in the SMS.
--
-- Rows are kept after use rather than deleted — `consumed_at` is the record
-- that a given number was verified, and the table doubles as the audit trail
-- for abuse investigations. See the cleanup note at the bottom.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.phone_otps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- E.164, normalised by the API before it reaches here (+919876543210).
  phone       text        NOT NULL,
  code_hash   text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  -- Wrong guesses against THIS code. The row is burnt once it passes the
  -- configured ceiling, so a six-digit code cannot be walked through.
  attempts    integer     NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  -- Recorded to rate limit by origin as well as by number. Nullable because a
  -- proxy misconfiguration should never block a legitimate verification.
  request_ip  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Every read is "the newest unconsumed code for this number", and the resend
-- cooldown is "when did we last send to this number".
CREATE INDEX IF NOT EXISTS phone_otps_phone_created_idx
  ON public.phone_otps (phone, created_at DESC);

-- Per-IP send throttling looks back over a short window.
CREATE INDEX IF NOT EXISTS phone_otps_ip_created_idx
  ON public.phone_otps (request_ip, created_at DESC)
  WHERE request_ip IS NOT NULL;

COMMENT ON TABLE public.phone_otps IS
  'One row per OTP send. code_hash is SHA-256 of the six-digit code, never the code itself.';

-- ── Profiles ─────────────────────────────────────────────────────────────────
-- profiles.phone already existed but was free text nobody had checked. This
-- column is what separates "a number they typed" from "a number they proved".
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

COMMENT ON COLUMN public.profiles.phone_verified_at IS
  'Set when the account completed an SMS OTP for profiles.phone. NULL means the number is self-declared and unverified.';

-- ── Queries ──────────────────────────────────────────────────────────────────
-- Whether the client_phone on this specific request came from a completed OTP.
-- Kept per-row rather than inferred from the profile, because a signed-out
-- visitor can verify a number without ever creating an account.
ALTER TABLE public.queries
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.queries.phone_verified IS
  'True when client_phone was taken from a verified OTP token rather than the request body.';

-- ── Housekeeping ─────────────────────────────────────────────────────────────
-- Nothing here expires rows automatically. Expired and consumed codes are inert
-- (the API checks expires_at and consumed_at on every verify), so they are a
-- storage question, not a security one. If the table grows large enough to
-- matter, delete consumed or expired rows older than 90 days — keep the recent
-- ones, they are the abuse trail.
