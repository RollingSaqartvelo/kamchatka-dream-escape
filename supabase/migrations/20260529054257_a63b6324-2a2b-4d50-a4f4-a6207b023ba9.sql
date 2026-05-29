ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'site',
  ADD COLUMN IF NOT EXISTS tl_reservation_id text;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_tl_reservation_id_uniq
  ON public.bookings (tl_reservation_id)
  WHERE tl_reservation_id IS NOT NULL;