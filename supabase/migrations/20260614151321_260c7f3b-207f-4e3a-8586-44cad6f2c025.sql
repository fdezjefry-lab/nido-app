CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
DROP FUNCTION public.claim_first_admin();
CREATE UNIQUE INDEX one_admin_only ON public.user_roles ((role)) WHERE role = 'admin';