-- Maintenance / manual date blocks shown on the admin calendar.
-- Previously these lived only in React state and were lost on reload.
CREATE TABLE IF NOT EXISTS public.room_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (room_id, date)
);

CREATE INDEX IF NOT EXISTS room_blocks_date_idx ON public.room_blocks (date);

ALTER TABLE public.room_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view room blocks" ON public.room_blocks;
CREATE POLICY "Staff can view room blocks"
  ON public.room_blocks FOR SELECT
  TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'manager'::public.app_role)
  );

DROP POLICY IF EXISTS "Staff can insert room blocks" ON public.room_blocks;
CREATE POLICY "Staff can insert room blocks"
  ON public.room_blocks FOR INSERT
  TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'manager'::public.app_role)
  );

DROP POLICY IF EXISTS "Staff can delete room blocks" ON public.room_blocks;
CREATE POLICY "Staff can delete room blocks"
  ON public.room_blocks FOR DELETE
  TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'manager'::public.app_role)
  );
