INSERT INTO public.profiles (id, full_name, phone)
SELECT
  u.id,
  trim(coalesce(u.raw_user_meta_data->>'first_name', '') || ' ' || coalesce(u.raw_user_meta_data->>'last_name', '')),
  u.raw_user_meta_data->>'phone'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND char_length(trim(coalesce(u.raw_user_meta_data->>'first_name', '') || ' ' || coalesce(u.raw_user_meta_data->>'last_name', ''))) BETWEEN 2 AND 100;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'customer'
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;
