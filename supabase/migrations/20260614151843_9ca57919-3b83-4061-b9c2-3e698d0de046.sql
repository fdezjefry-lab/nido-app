CREATE OR REPLACE FUNCTION public.notify_booking_changes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_id uuid; property_name text;
BEGIN
  SELECT name INTO property_name FROM public.properties WHERE id = NEW.property_id;
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
    IF admin_id IS NOT NULL THEN INSERT INTO public.notifications(user_id, title, body) VALUES (admin_id, 'Nueva solicitud', 'Hay una nueva solicitud para ' || property_name || '.'); END IF;
  ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved','rejected','cancelled') THEN
    INSERT INTO public.notifications(user_id, title, body) VALUES (NEW.user_id, 'Solicitud actualizada', 'Tu solicitud para ' || property_name || ' ahora está ' || NEW.status::text || '.');
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_booking_changes() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notify_booking_changes AFTER INSERT OR UPDATE OF status ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.notify_booking_changes();