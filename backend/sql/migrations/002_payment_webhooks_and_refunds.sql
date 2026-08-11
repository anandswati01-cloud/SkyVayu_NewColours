-- =============================================================================
-- 002 — Webhook event log and refund tracking
--
-- Safe to re-run (every statement is IF NOT EXISTS).
--
-- Why: confirmation used to depend entirely on the customer's browser calling
-- /api/payments/verify. If the tab closed, the network dropped, or the phone
-- locked between paying and the callback firing, the money was taken and the
-- booking stayed 'pending_payment' forever. Razorpay's webhook fixes that, but
-- a webhook is delivered *at least* once — sometimes several times, and both it
-- and the browser callback can arrive together. payment_events is the ledger
-- that makes replaying an event a no-op.
-- =============================================================================

-- ── Webhook event ledger ─────────────────────────────────────────────────────
-- id is Razorpay's own x-razorpay-event-id header. Making it the primary key is
-- what enforces once-only processing: the second delivery fails the insert.
CREATE TABLE IF NOT EXISTS public.payment_events (
  id           text PRIMARY KEY,
  event        text NOT NULL,
  payment_id   text,
  order_id     text,
  -- Deliberately not a foreign key. An event for a booking we cannot resolve
  -- must still be recorded — that record is how the gap gets investigated.
  booking_id   text,
  status       text NOT NULL DEFAULT 'received',
  error        text,
  payload      jsonb,
  received_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_events_order_id_idx  ON public.payment_events (order_id);
CREATE INDEX IF NOT EXISTS payment_events_booking_id_idx ON public.payment_events (booking_id);
CREATE INDEX IF NOT EXISTS payment_events_received_at_idx ON public.payment_events (received_at DESC);

-- Only the service role touches this table, and it bypasses RLS. Enabling RLS
-- with no policy means the anon key sees nothing, which is the intent.
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.payment_events        IS 'Razorpay webhook deliveries, keyed by event id for once-only processing';
COMMENT ON COLUMN public.payment_events.status IS 'received | processed | ignored | failed';

-- ── Refund and failure tracking on bookings ──────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS refund_id             text,
  ADD COLUMN IF NOT EXISTS refund_amount         numeric,
  ADD COLUMN IF NOT EXISTS refunded_at           timestamptz,
  ADD COLUMN IF NOT EXISTS refund_reason         text,
  ADD COLUMN IF NOT EXISTS payment_method        text,
  ADD COLUMN IF NOT EXISTS payment_failed_reason text;

-- Partial refunds mean one booking can hold several refund ids over time; the
-- column keeps the most recent. Total refunded is refund_amount.
COMMENT ON COLUMN public.bookings.refund_id      IS 'Most recent Razorpay refund id';
COMMENT ON COLUMN public.bookings.refund_amount  IS 'Total rupees refunded so far across all refunds';
COMMENT ON COLUMN public.bookings.payment_method IS 'card / upi / netbanking / wallet, as reported by Razorpay';

-- Finding bookings stuck between paying and confirming is a routine operational
-- query, so it gets an index rather than a full scan of every booking ever made.
CREATE INDEX IF NOT EXISTS bookings_pending_payment_idx
  ON public.bookings (created_at DESC)
  WHERE status = 'pending_payment';
