
-- Booking number sequence
CREATE SEQUENCE IF NOT EXISTS public.booking_number_seq START 1000;

CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_number TEXT NOT NULL UNIQUE DEFAULT ('PKC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.booking_number_seq')::text, 4, '0')),

  -- Guest
  salutation TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT,
  country TEXT,

  -- Stay
  room_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL,
  adults INTEGER NOT NULL DEFAULT 2,
  children INTEGER NOT NULL DEFAULT 0,
  meal_plan TEXT NOT NULL DEFAULT 'room_only', -- room_only | breakfast

  -- Requests
  special_requests JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_request TEXT,
  promo_code TEXT,

  -- Messenger
  messenger_type TEXT, -- telegram | vk_max | none
  messenger_username TEXT,

  -- Money
  room_price_total INTEGER NOT NULL DEFAULT 0,
  breakfast_total INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL DEFAULT 0,

  -- Payment
  payment_method TEXT, -- card | invoice
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | failed | refunded

  -- Consent
  id_consent BOOLEAN NOT NULL DEFAULT false,
  terms_consent BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT bookings_dates_chk CHECK (check_out > check_in),
  CONSTRAINT bookings_guests_chk CHECK (adults >= 1 AND children >= 0)
);

CREATE INDEX bookings_check_in_idx ON public.bookings(check_in);
CREATE INDEX bookings_email_idx ON public.bookings(email);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Anyone (anon/auth) can create a booking
CREATE POLICY "Anyone can create a booking"
  ON public.bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No public SELECT/UPDATE/DELETE (service role only)

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
