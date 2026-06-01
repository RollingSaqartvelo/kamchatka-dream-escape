-- Cursor for the TravelLine Read-Reservation sync. We persist continueToken so
-- successive runs (manual + the 15-min cron) page forward through ALL bookings
-- (backfill), then keep returning only new/changed ones (incremental).
CREATE TABLE IF NOT EXISTS public.tl_sync_state (
  id int PRIMARY KEY DEFAULT 1,
  continue_token text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tl_sync_state_singleton CHECK (id = 1)
);

ALTER TABLE public.tl_sync_state ENABLE ROW LEVEL SECURITY;

-- The sync writes via the service role (bypasses RLS). Staff may read for visibility.
DROP POLICY IF EXISTS "Staff can view sync state" ON public.tl_sync_state;
CREATE POLICY "Staff can view sync state"
  ON public.tl_sync_state FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'manager'::public.app_role)
  );
