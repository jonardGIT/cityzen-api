BEGIN;

-- This script maps the current API role model onto Supabase/Postgres RLS.
-- It mirrors what the API can actually enforce today, not the aspirational
-- role-profile scope labels. The current schema does not store department or
-- region ownership on users or incidents, so true department/region RLS is not
-- possible yet.
--
-- Assumptions:
-- 1. Supabase JWT auth is enabled and auth.uid() maps to users."supabaseAuthUserId".
-- 2. Direct writes to users/auth_sessions/password_reset_tokens remain API-only.
-- 3. service_role bypasses RLS and continues to be used by backend jobs/admin flows.

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.users
  WHERE "supabaseAuthUserId" = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.users
  WHERE "supabaseAuthUserId" = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_app_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.users
  WHERE "supabaseAuthUserId" = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_app_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_app_role() = ANY(allowed_roles), false)
$$;

CREATE OR REPLACE FUNCTION public.can_manage_app_role(target_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE public.current_app_role()
    WHEN 'SYSTEM_ADMIN' THEN target_role IN (
      'DEPARTMENT_MANAGER',
      'SUPERVISOR',
      'DISPATCHER',
      'RESPONDER',
      'CITIZEN_REPORTER'
    )
    WHEN 'DEPARTMENT_MANAGER' THEN target_role IN (
      'SUPERVISOR',
      'DISPATCHER',
      'RESPONDER',
      'CITIZEN_REPORTER'
    )
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.linked_citizen_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.citizens c
  WHERE c."contactInfo" = public.current_app_email()
  ORDER BY c."createdAt" ASC
  LIMIT 1
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.severities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.auth_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.password_reset_tokens FROM anon, authenticated;
REVOKE ALL ON TABLE public.citizens FROM anon, authenticated;
REVOKE ALL ON TABLE public.agencies FROM anon, authenticated;
REVOKE ALL ON TABLE public.responders FROM anon, authenticated;
REVOKE ALL ON TABLE public.statuses FROM anon, authenticated;
REVOKE ALL ON TABLE public.categories FROM anon, authenticated;
REVOKE ALL ON TABLE public.severities FROM anon, authenticated;
REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.incidents FROM anon, authenticated;
REVOKE ALL ON TABLE public.assignments FROM anon, authenticated;

GRANT SELECT ON TABLE public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.citizens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agencies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.responders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.statuses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.severities TO authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assignments TO authenticated;

DROP POLICY IF EXISTS users_select_self_or_admin ON public.users;
DROP POLICY IF EXISTS citizens_select_admin_or_self ON public.citizens;
DROP POLICY IF EXISTS citizens_insert_admin_or_self ON public.citizens;
DROP POLICY IF EXISTS citizens_update_admin_or_self ON public.citizens;
DROP POLICY IF EXISTS citizens_delete_admin_only ON public.citizens;
DROP POLICY IF EXISTS agencies_select_dispatch_roles ON public.agencies;
DROP POLICY IF EXISTS agencies_mutate_admin_roles ON public.agencies;
DROP POLICY IF EXISTS responders_select_dispatch_roles ON public.responders;
DROP POLICY IF EXISTS responders_mutate_admin_roles ON public.responders;
DROP POLICY IF EXISTS statuses_select_authenticated ON public.statuses;
DROP POLICY IF EXISTS statuses_mutate_admin_roles ON public.statuses;
DROP POLICY IF EXISTS categories_select_authenticated ON public.categories;
DROP POLICY IF EXISTS categories_mutate_admin_roles ON public.categories;
DROP POLICY IF EXISTS severities_select_authenticated ON public.severities;
DROP POLICY IF EXISTS severities_mutate_admin_roles ON public.severities;
DROP POLICY IF EXISTS audit_logs_select_audit_roles ON public.audit_logs;
DROP POLICY IF EXISTS incidents_select_by_role_scope ON public.incidents;
DROP POLICY IF EXISTS incidents_insert_by_role_scope ON public.incidents;
DROP POLICY IF EXISTS incidents_update_internal_roles ON public.incidents;
DROP POLICY IF EXISTS incidents_delete_internal_roles ON public.incidents;
DROP POLICY IF EXISTS assignments_manage_dispatch_roles ON public.assignments;

CREATE POLICY users_select_self_or_admin
ON public.users
FOR SELECT
TO authenticated
USING (
  id = public.current_app_user_id()
  OR public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'])
);

CREATE POLICY citizens_select_admin_or_self
ON public.citizens
FOR SELECT
TO authenticated
USING (
  public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'])
  OR (
    public.current_app_role() = 'CITIZEN_REPORTER'
    AND "contactInfo" = public.current_app_email()
  )
);

CREATE POLICY citizens_insert_admin_or_self
ON public.citizens
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'])
  OR (
    public.current_app_role() = 'CITIZEN_REPORTER'
    AND "contactInfo" = public.current_app_email()
  )
);

CREATE POLICY citizens_update_admin_or_self
ON public.citizens
FOR UPDATE
TO authenticated
USING (
  public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'])
  OR (
    public.current_app_role() = 'CITIZEN_REPORTER'
    AND "contactInfo" = public.current_app_email()
  )
)
WITH CHECK (
  public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'])
  OR (
    public.current_app_role() = 'CITIZEN_REPORTER'
    AND "contactInfo" = public.current_app_email()
  )
);

CREATE POLICY citizens_delete_admin_only
ON public.citizens
FOR DELETE
TO authenticated
USING (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER']));

CREATE POLICY agencies_select_dispatch_roles
ON public.agencies
FOR SELECT
TO authenticated
USING (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'SUPERVISOR', 'DISPATCHER']));

CREATE POLICY agencies_mutate_admin_roles
ON public.agencies
FOR ALL
TO authenticated
USING (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER']))
WITH CHECK (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER']));

CREATE POLICY responders_select_dispatch_roles
ON public.responders
FOR SELECT
TO authenticated
USING (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'SUPERVISOR', 'DISPATCHER']));

CREATE POLICY responders_mutate_admin_roles
ON public.responders
FOR ALL
TO authenticated
USING (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER']))
WITH CHECK (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER']));

CREATE POLICY statuses_select_authenticated
ON public.statuses
FOR SELECT
TO authenticated
USING (public.current_app_user_id() IS NOT NULL);

CREATE POLICY statuses_mutate_admin_roles
ON public.statuses
FOR ALL
TO authenticated
USING (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER']))
WITH CHECK (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER']));

CREATE POLICY categories_select_authenticated
ON public.categories
FOR SELECT
TO authenticated
USING (public.current_app_user_id() IS NOT NULL);

CREATE POLICY categories_mutate_admin_roles
ON public.categories
FOR ALL
TO authenticated
USING (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER']))
WITH CHECK (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER']));

CREATE POLICY severities_select_authenticated
ON public.severities
FOR SELECT
TO authenticated
USING (public.current_app_user_id() IS NOT NULL);

CREATE POLICY severities_mutate_admin_roles
ON public.severities
FOR ALL
TO authenticated
USING (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER']))
WITH CHECK (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER']));

CREATE POLICY audit_logs_select_audit_roles
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'AUDITOR']));

CREATE POLICY incidents_select_by_role_scope
ON public.incidents
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.current_app_role() = 'CITIZEN_REPORTER' THEN "citizenId" = public.linked_citizen_id()
    ELSE public.current_app_user_id() IS NOT NULL
  END
);

CREATE POLICY incidents_insert_by_role_scope
ON public.incidents
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'SUPERVISOR', 'DISPATCHER', 'RESPONDER'])
  OR (
    public.current_app_role() = 'CITIZEN_REPORTER'
    AND "citizenId" = public.linked_citizen_id()
  )
);

CREATE POLICY incidents_update_internal_roles
ON public.incidents
FOR UPDATE
TO authenticated
USING (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'SUPERVISOR', 'DISPATCHER', 'RESPONDER']))
WITH CHECK (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'SUPERVISOR', 'DISPATCHER', 'RESPONDER']));

CREATE POLICY incidents_delete_internal_roles
ON public.incidents
FOR DELETE
TO authenticated
USING (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'SUPERVISOR', 'DISPATCHER', 'RESPONDER']));

CREATE POLICY assignments_manage_dispatch_roles
ON public.assignments
FOR ALL
TO authenticated
USING (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'SUPERVISOR', 'DISPATCHER']))
WITH CHECK (public.has_app_role(ARRAY['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'SUPERVISOR', 'DISPATCHER']));

COMMIT;