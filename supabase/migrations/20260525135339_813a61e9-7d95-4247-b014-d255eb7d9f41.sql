-- Allow staff (admin/manager) to insert bookings from the admin panel
-- bypassing the strict public-form CHECK constraints.
CREATE POLICY "Staff can insert bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
);