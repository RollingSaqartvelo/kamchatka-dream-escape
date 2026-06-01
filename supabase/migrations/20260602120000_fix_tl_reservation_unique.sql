-- TravelLine sync upserts with ON CONFLICT (tl_reservation_id). A PARTIAL unique
-- index (WHERE tl_reservation_id IS NOT NULL) cannot be matched by supabase-js
-- .upsert({ onConflict }) without a predicate, which errors with
-- "no unique or exclusion constraint matching the ON CONFLICT specification".
-- Replace it with a plain unique index. In Postgres NULLs are distinct, so the
-- many website/manual bookings with tl_reservation_id = NULL stay valid.
DROP INDEX IF EXISTS public.bookings_tl_reservation_id_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_tl_reservation_id_key
  ON public.bookings (tl_reservation_id);
