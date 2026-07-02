DROP POLICY "Public view published properties" ON public.properties;
CREATE POLICY "Visitors view published properties" ON public.properties FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "Members view published or managed properties" ON public.properties FOR SELECT TO authenticated USING (status = 'published' OR private.has_role(auth.uid(), 'admin'));

DROP POLICY "Public view published property images" ON public.property_images;
CREATE POLICY "Visitors view published property images" ON public.property_images FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.status = 'published'));
CREATE POLICY "Members view published or managed images" ON public.property_images FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.status = 'published') OR private.has_role(auth.uid(), 'admin'));

DROP POLICY "Public view published property amenities" ON public.property_amenities;
CREATE POLICY "Visitors view published property amenities" ON public.property_amenities FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.status = 'published'));
CREATE POLICY "Members view published or managed amenities" ON public.property_amenities FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.status = 'published') OR private.has_role(auth.uid(), 'admin'));

DROP POLICY "Public view published availability" ON public.availability_blocks;
CREATE POLICY "Visitors view published availability" ON public.availability_blocks FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.status = 'published'));
CREATE POLICY "Members view published or managed availability" ON public.availability_blocks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.status = 'published') OR private.has_role(auth.uid(), 'admin'));