CREATE TYPE public.payment_status AS ENUM ('unpaid', 'partially_paid', 'paid', 'partially_refunded', 'refunded');

ALTER TABLE public.booking_requests
  ADD COLUMN payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  ADD COLUMN amount_paid numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  ADD COLUMN amount_refunded numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_refunded >= 0);

CREATE TABLE public.booking_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('charge', 'refund')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  reference text CHECK (reference IS NULL OR char_length(reference) <= 120),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.booking_transactions TO authenticated;
GRANT ALL ON public.booking_transactions TO service_role;
ALTER TABLE public.booking_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own booking transactions" ON public.booking_transactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.booking_requests b WHERE b.id = booking_id AND b.user_id = auth.uid())
  OR private.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins record booking transactions" ON public.booking_transactions FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE INDEX booking_transactions_booking_idx ON public.booking_transactions(booking_id, created_at);

CREATE OR REPLACE FUNCTION public.validate_booking_transaction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.booking_requests%ROWTYPE;
BEGIN
  SELECT * INTO b FROM public.booking_requests WHERE id = NEW.booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF NEW.type = 'refund' AND NEW.amount > (b.amount_paid - b.amount_refunded) THEN
    RAISE EXCEPTION 'Refund amount exceeds net amount paid';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_booking_transaction() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validate_booking_transaction BEFORE INSERT ON public.booking_transactions FOR EACH ROW EXECUTE FUNCTION public.validate_booking_transaction();

CREATE OR REPLACE FUNCTION public.apply_booking_transaction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE paid numeric(12,2); refunded numeric(12,2); total numeric(12,2); new_status public.payment_status;
BEGIN
  SELECT COALESCE(SUM(amount) FILTER (WHERE type = 'charge'), 0), COALESCE(SUM(amount) FILTER (WHERE type = 'refund'), 0)
    INTO paid, refunded FROM public.booking_transactions WHERE booking_id = NEW.booking_id;
  SELECT total_amount INTO total FROM public.booking_requests WHERE id = NEW.booking_id;
  IF refunded > 0 AND refunded >= total THEN new_status := 'refunded';
  ELSIF refunded > 0 THEN new_status := 'partially_refunded';
  ELSIF paid >= total THEN new_status := 'paid';
  ELSIF paid > 0 THEN new_status := 'partially_paid';
  ELSE new_status := 'unpaid';
  END IF;
  UPDATE public.booking_requests SET amount_paid = paid, amount_refunded = refunded, payment_status = new_status WHERE id = NEW.booking_id;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.apply_booking_transaction() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER apply_booking_transaction AFTER INSERT ON public.booking_transactions FOR EACH ROW EXECUTE FUNCTION public.apply_booking_transaction();

CREATE TABLE public.booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  old_status public.booking_status,
  new_status public.booking_status NOT NULL,
  changed_by uuid,
  reason text CHECK (reason IS NULL OR char_length(reason) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.booking_status_history TO authenticated;
GRANT ALL ON public.booking_status_history TO service_role;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view booking audit history" ON public.booking_status_history FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE INDEX booking_status_history_booking_idx ON public.booking_status_history(booking_id, created_at);

CREATE OR REPLACE FUNCTION public.log_booking_status_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_status_history(booking_id, old_status, new_status, changed_by, reason) VALUES (NEW.id, NULL, NEW.status, auth.uid(), NULL);
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.booking_status_history(booking_id, old_status, new_status, changed_by, reason) VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NEW.admin_note);
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.log_booking_status_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER log_booking_status_change AFTER INSERT OR UPDATE OF status ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.log_booking_status_change();
