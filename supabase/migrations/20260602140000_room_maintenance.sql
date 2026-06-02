-- Статус физического номера: наличие строки = номер «в ремонте» (снят с продажи
-- и скрыт в шахматке). room_key — id физической комнаты (напр. dvuhmestnyy-standart#1)
-- или id типа для хостела (весь номер целиком).
CREATE TABLE IF NOT EXISTS public.room_maintenance (
  room_key text PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.room_maintenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view room maintenance" ON public.room_maintenance;
CREATE POLICY "Staff can view room maintenance"
  ON public.room_maintenance FOR SELECT
  TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'manager'::public.app_role)
  );

DROP POLICY IF EXISTS "Staff can insert room maintenance" ON public.room_maintenance;
CREATE POLICY "Staff can insert room maintenance"
  ON public.room_maintenance FOR INSERT
  TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'manager'::public.app_role)
  );

DROP POLICY IF EXISTS "Staff can delete room maintenance" ON public.room_maintenance;
CREATE POLICY "Staff can delete room maintenance"
  ON public.room_maintenance FOR DELETE
  TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'manager'::public.app_role)
  );
