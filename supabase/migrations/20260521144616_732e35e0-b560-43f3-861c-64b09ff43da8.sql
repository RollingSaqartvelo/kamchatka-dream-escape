
-- Fix function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Tighten INSERT policy with basic input checks
DROP POLICY IF EXISTS "Anyone can create a booking" ON public.bookings;

CREATE POLICY "Anyone can create a valid booking"
  ON public.bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(first_name)) BETWEEN 1 AND 100
    AND length(trim(last_name)) BETWEEN 1 AND 100
    AND length(trim(email)) BETWEEN 5 AND 255
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(trim(phone)) BETWEEN 5 AND 32
    AND check_in >= current_date
    AND check_out > check_in
    AND adults BETWEEN 1 AND 10
    AND children BETWEEN 0 AND 10
    AND total_price BETWEEN 0 AND 10000000
    AND id_consent = true
    AND terms_consent = true
  );
