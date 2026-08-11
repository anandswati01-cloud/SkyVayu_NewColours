-- =============================================================================
-- 003 — bookings.operator_id, so a booking can be scoped to its operator
--
-- Safe to re-run.
--
-- Why: GET /api/bookings returned every booking on the platform to any operator
-- token — client names, emails, phone numbers and amounts, including bookings
-- belonging to competitors. There was no way to filter, because a booking only
-- recorded operator_name as free text; the authoritative operator id lived one
-- table away on quotes. This adds the column so the API can scope by it.
-- =============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS operator_id uuid;

-- Backfill from the quote the booking was made against. Bookings created by
-- staff without a quote stay NULL and remain admin-only to view.
UPDATE public.bookings b
   SET operator_id = q.operator_id
  FROM public.quotes q
 WHERE b.quote_id = q.id
   AND b.operator_id IS NULL
   AND q.operator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_operator_id_idx
  ON public.bookings (operator_id);

COMMENT ON COLUMN public.bookings.operator_id IS
  'Operator this booking belongs to. Copied from the quote at order time; the only thing the API scopes operator access by.';
