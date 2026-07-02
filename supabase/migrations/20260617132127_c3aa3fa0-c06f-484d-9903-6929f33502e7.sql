
CREATE OR REPLACE FUNCTION public.prevent_customer_booking_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.check_in IS DISTINCT FROM OLD.check_in
     OR NEW.check_out IS DISTINCT FROM OLD.check_out
     OR NEW.guests IS DISTINCT FROM OLD.guests
     OR NEW.nightly_rate IS DISTINCT FROM OLD.nightly_rate
     OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
     OR NEW.admin_note IS DISTINCT FROM OLD.admin_note
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Customers may only change booking status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_customer_booking_field_changes ON public.booking_requests;
CREATE TRIGGER prevent_customer_booking_field_changes
BEFORE UPDATE ON public.booking_requests
FOR EACH ROW EXECUTE FUNCTION public.prevent_customer_booking_field_changes();

DROP POLICY IF EXISTS "Authenticated view property images" ON storage.objects;

CREATE POLICY "View published property images"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (
  bucket_id = 'property-images'
  AND EXISTS (
    SELECT 1
    FROM public.property_images pi
    JOIN public.properties p ON p.id = pi.property_id
    WHERE pi.storage_path = storage.objects.name
      AND p.status = 'published'
  )
);

CREATE POLICY "Admins view all property images storage"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'property-images'
  AND private.has_role(auth.uid(), 'admin'::public.app_role)
);
