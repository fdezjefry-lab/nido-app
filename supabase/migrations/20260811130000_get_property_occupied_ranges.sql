CREATE FUNCTION public.get_property_occupied_ranges(p_property_id uuid)
RETURNS TABLE(range_start date, range_end date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT start_date, end_date FROM public.availability_blocks WHERE property_id = p_property_id
  UNION ALL
  SELECT check_in, check_out FROM public.booking_requests
  WHERE property_id = p_property_id AND status = 'approved'
$$;

GRANT EXECUTE ON FUNCTION public.get_property_occupied_ranges(uuid) TO anon, authenticated;
