-- =============================================================================
-- 001 — Payment tracking columns on bookings
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (every statement is IF NOT EXISTS).
--
-- Why: /api/payments creates a booking as 'pending_payment' and only promotes
-- it to 'confirmed' after the Razorpay signature and captured amount check out.
-- Without these columns the order-to-booking link cannot be verified, so a
-- signature from one booking could be replayed against another.
-- =============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_order_id text,
  ADD COLUMN IF NOT EXISTS payment_id       text,
  ADD COLUMN IF NOT EXISTS paid_at          timestamptz;

-- One Razorpay order maps to exactly one booking.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_payment_order_id_key
  ON public.bookings (payment_order_id)
  WHERE payment_order_id IS NOT NULL;

-- A payment id must never confirm two bookings.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_payment_id_key
  ON public.bookings (payment_id)
  WHERE payment_id IS NOT NULL;

-- Operators should not see unpaid bookings as real business.
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings (status);

COMMENT ON COLUMN public.bookings.payment_order_id IS 'Razorpay order id, set when checkout opens';
COMMENT ON COLUMN public.bookings.payment_id       IS 'Razorpay payment id, set once verified';
COMMENT ON COLUMN public.bookings.paid_at          IS 'When the payment was verified server-side';
