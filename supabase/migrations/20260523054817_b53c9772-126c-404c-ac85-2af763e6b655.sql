
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS prepayment_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alfa_order_id text,
  ADD COLUMN IF NOT EXISTS payment_provider_method text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bookings_alfa_order_id ON public.bookings(alfa_order_id);
