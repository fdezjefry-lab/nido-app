CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
CREATE TYPE public.property_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.booking_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'completed');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 30),
  avatar_url text CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 1000),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'customer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  LOCK TABLE public.user_roles IN EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END; $$;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

CREATE POLICY "Users view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create customer role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'customer');
CREATE POLICY "Profiles view own or admin" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Profiles create own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 120),
  city text NOT NULL CHECK (char_length(city) BETWEEN 2 AND 100),
  country text NOT NULL DEFAULT 'España' CHECK (char_length(country) BETWEEN 2 AND 100),
  short_description text NOT NULL CHECK (char_length(short_description) BETWEEN 10 AND 220),
  description text NOT NULL CHECK (char_length(description) BETWEEN 20 AND 5000),
  price_per_night numeric(10,2) NOT NULL CHECK (price_per_night > 0),
  max_guests integer NOT NULL CHECK (max_guests BETWEEN 1 AND 30),
  bedrooms integer NOT NULL DEFAULT 1 CHECK (bedrooms BETWEEN 0 AND 20),
  beds integer NOT NULL DEFAULT 1 CHECK (beds BETWEEN 1 AND 30),
  bathrooms numeric(4,1) NOT NULL DEFAULT 1 CHECK (bathrooms > 0),
  min_nights integer NOT NULL DEFAULT 1 CHECK (min_nights BETWEEN 1 AND 90),
  max_nights integer NOT NULL DEFAULT 30 CHECK (max_nights BETWEEN min_nights AND 365),
  house_rules text[] NOT NULL DEFAULT '{}',
  status public.property_status NOT NULL DEFAULT 'draft',
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.properties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view published properties" ON public.properties FOR SELECT TO anon, authenticated USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage properties" ON public.properties FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.property_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  storage_path text NOT NULL CHECK (char_length(storage_path) BETWEEN 1 AND 500),
  alt_text text NOT NULL CHECK (char_length(alt_text) BETWEEN 2 AND 180),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.property_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_images TO authenticated;
GRANT ALL ON public.property_images TO service_role;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view published property images" ON public.property_images FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.status = 'published') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage property images" ON public.property_images FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 2 AND 80),
  icon text NOT NULL DEFAULT 'check' CHECK (char_length(icon) <= 50),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.amenities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amenities TO authenticated;
GRANT ALL ON public.amenities TO service_role;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Amenities are public" ON public.amenities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage amenities" ON public.amenities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.property_amenities (
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  amenity_id uuid NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, amenity_id)
);
GRANT SELECT ON public.property_amenities TO anon;
GRANT SELECT, INSERT, DELETE ON public.property_amenities TO authenticated;
GRANT ALL ON public.property_amenities TO service_role;
ALTER TABLE public.property_amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view published property amenities" ON public.property_amenities FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.status = 'published') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage property amenities" ON public.property_amenities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text CHECK (reason IS NULL OR char_length(reason) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);
GRANT SELECT ON public.availability_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_blocks TO authenticated;
GRANT ALL ON public.availability_blocks TO service_role;
ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view published availability" ON public.availability_blocks FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.status = 'published') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage availability" ON public.availability_blocks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  user_id uuid NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests integer NOT NULL CHECK (guests BETWEEN 1 AND 30),
  nightly_rate numeric(10,2) NOT NULL CHECK (nightly_rate > 0),
  total_amount numeric(12,2) NOT NULL CHECK (total_amount > 0),
  message text CHECK (message IS NULL OR char_length(message) <= 1000),
  status public.booking_status NOT NULL DEFAULT 'pending',
  admin_note text CHECK (admin_note IS NULL OR char_length(admin_note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);
GRANT SELECT, INSERT, UPDATE ON public.booking_requests TO authenticated;
GRANT ALL ON public.booking_requests TO service_role;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers view own bookings" ON public.booking_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers create own bookings" ON public.booking_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Customers cancel pending bookings" ON public.booking_requests FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'pending') WITH CHECK (user_id = auth.uid() AND status = 'cancelled');
CREATE POLICY "Admins update bookings" ON public.booking_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER booking_requests_updated_at BEFORE UPDATE ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE UNIQUE INDEX no_duplicate_active_booking ON public.booking_requests(property_id, user_id, check_in, check_out) WHERE status IN ('pending','approved');

CREATE OR REPLACE FUNCTION public.validate_booking_request() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.properties%ROWTYPE; nights integer;
BEGIN
  SELECT * INTO p FROM public.properties WHERE id = NEW.property_id AND status = 'published';
  IF NOT FOUND THEN RAISE EXCEPTION 'Property unavailable'; END IF;
  nights := NEW.check_out - NEW.check_in;
  IF NEW.check_in < current_date OR nights < p.min_nights OR nights > p.max_nights OR NEW.guests > p.max_guests THEN RAISE EXCEPTION 'Invalid dates or guest count'; END IF;
  IF EXISTS (SELECT 1 FROM public.availability_blocks b WHERE b.property_id = NEW.property_id AND daterange(b.start_date,b.end_date,'[)') && daterange(NEW.check_in,NEW.check_out,'[)')) THEN RAISE EXCEPTION 'Dates unavailable'; END IF;
  IF EXISTS (SELECT 1 FROM public.booking_requests r WHERE r.property_id = NEW.property_id AND r.id <> NEW.id AND r.status = 'approved' AND daterange(r.check_in,r.check_out,'[)') && daterange(NEW.check_in,NEW.check_out,'[)')) THEN RAISE EXCEPTION 'Dates already booked'; END IF;
  IF TG_OP = 'INSERT' THEN NEW.nightly_rate := p.price_per_night; NEW.total_amount := p.price_per_night * nights; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER validate_booking BEFORE INSERT OR UPDATE OF check_in, check_out, guests, property_id, status ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.validate_booking_request();

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 2 AND 500),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users mark own notifications read" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins upload property images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'property-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update property images storage" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'property-images' AND public.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'property-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete property images storage" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'property-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated view property images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'property-images');

CREATE INDEX properties_public_idx ON public.properties(status, city, price_per_night);
CREATE INDEX images_property_idx ON public.property_images(property_id, sort_order);
CREATE INDEX blocks_property_dates_idx ON public.availability_blocks(property_id, start_date, end_date);
CREATE INDEX bookings_property_dates_idx ON public.booking_requests(property_id, check_in, check_out, status);
CREATE INDEX bookings_user_idx ON public.booking_requests(user_id, created_at DESC);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);