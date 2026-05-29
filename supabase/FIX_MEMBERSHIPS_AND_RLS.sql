-- =============================================================================
-- SaaS RLS & RBAC HARDENING - COMPLETE FIX
-- =============================================================================

-- 1. Create Permissions Table (Global Reference)
CREATE TABLE IF NOT EXISTS public.permissions (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  resource    TEXT      NOT NULL,
  action      TEXT      NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- 2. Create Roles Table (Per Organization)
CREATE TABLE IF NOT EXISTS public.roles (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID      NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name        TEXT      NOT NULL,
  description TEXT,
  is_system   BOOLEAN   DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, name)
);

-- 3. Create Role Permissions Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id       UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 4. Create Memberships Table
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, agency_id)
);

-- Make legacy columns nullable and ensure schema is correct for transition
DO $$
BEGIN
  BEGIN ALTER TABLE public.memberships ALTER COLUMN organization_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN END;
  BEGIN ALTER TABLE public.memberships ALTER COLUMN role DROP NOT NULL; EXCEPTION WHEN OTHERS THEN END;
  BEGIN ALTER TABLE public.memberships ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE; EXCEPTION WHEN OTHERS THEN END;
  BEGIN ALTER TABLE public.memberships ADD COLUMN role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE; EXCEPTION WHEN OTHERS THEN END;
  BEGIN ALTER TABLE public.memberships ADD UNIQUE (user_id, agency_id); EXCEPTION WHEN OTHERS THEN END;
END $$;

-- 5. Helper Functions for RBAC
CREATE OR REPLACE FUNCTION public.current_orgs()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT agency_id FROM public.memberships WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_org()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  -- Returns the primary agency for the user for insertions
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID,
    (SELECT agency_id FROM public.memberships WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p_permission TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_resource TEXT;
  v_action   TEXT;
BEGIN
  v_resource := split_part(p_permission, '.', 1);
  v_action   := split_part(p_permission, '.', 2);

  RETURN EXISTS (
    SELECT 1 
    FROM public.memberships m
    JOIN public.roles r ON r.id = m.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions perm ON perm.id = rp.permission_id
    WHERE m.user_id = auth.uid()
      AND perm.resource = v_resource
      AND perm.action = v_action
  );
END;
$$;

-- 6. Seed Global Permissions
INSERT INTO public.permissions (resource, action, description) VALUES
  ('leads',      'view',   'Can view leads'),
  ('leads',      'create', 'Can create leads'),
  ('leads',      'update', 'Can update leads'),
  ('leads',      'delete', 'Can delete leads'),
  ('deals',      'view',   'Can view deals'),
  ('deals',      'create', 'Can create deals'),
  ('deals',      'update', 'Can update deals'),
  ('deals',      'delete', 'Can delete deals'),
  ('finance',    'view',   'Can view financial data'),
  ('finance',    'manage', 'Can manage payments and refunds'),
  ('settings',   'manage', 'Can manage agency settings'),
  ('users',      'manage', 'Can manage agency users'),
  ('audit',      'view',   'Can view audit logs')
ON CONFLICT (resource, action) DO NOTHING;

-- 7. Function to bootstrap standard roles for an agency
CREATE OR REPLACE FUNCTION public.fn_bootstrap_agency_roles(p_agency_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_admin_role_id   UUID;
  v_manager_role_id UUID;
  v_agent_role_id   UUID;
BEGIN
  INSERT INTO public.roles (agency_id, name, description, is_system)
  VALUES (p_agency_id, 'Admin', 'Full administrative access', TRUE)
  ON CONFLICT (agency_id, name) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_admin_role_id;

  INSERT INTO public.roles (agency_id, name, description, is_system)
  VALUES (p_agency_id, 'Manager', 'Team management and reporting', TRUE)
  ON CONFLICT (agency_id, name) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_manager_role_id;

  INSERT INTO public.roles (agency_id, name, description, is_system)
  VALUES (p_agency_id, 'Agent', 'Property and lead management', TRUE)
  ON CONFLICT (agency_id, name) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_agent_role_id;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_admin_role_id, id FROM public.permissions
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_manager_role_id, id FROM public.permissions 
  WHERE resource IN ('leads', 'deals', 'finance', 'audit') AND action IN ('view', 'create', 'update')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_agent_role_id, id FROM public.permissions 
  WHERE resource IN ('leads', 'deals') AND action IN ('view', 'create', 'update')
  ON CONFLICT DO NOTHING;
END;
$$;

-- 8. Migration for Existing Data
DO $$
DECLARE
  r RECORD;
  default_role TEXT;
  v_role_id UUID;
BEGIN
  -- Ensure roles exist for all agencies
  FOR r IN SELECT id FROM public.agencies LOOP
    PERFORM public.fn_bootstrap_agency_roles(r.id);
  END LOOP;
  
  -- Migrate profiles into memberships
  FOR r IN SELECT id, agency_id, role FROM public.profiles WHERE agency_id IS NOT NULL LOOP
    default_role := COALESCE(INITCAP(r.role::TEXT), 'Agent');
    IF default_role NOT IN ('Admin', 'Manager', 'Agent') THEN default_role := 'Agent'; END IF;
    SELECT id INTO v_role_id FROM public.roles WHERE agency_id = r.agency_id AND name = default_role LIMIT 1;
    
    IF v_role_id IS NOT NULL THEN
      -- Use UPDATE/INSERT instead of ON CONFLICT to avoid unique constraint requirement for migration
      BEGIN
        UPDATE public.memberships
        SET role_id = v_role_id, organization_id = r.agency_id, role = default_role
        WHERE user_id = r.id AND agency_id = r.agency_id;

        IF NOT FOUND THEN
          INSERT INTO public.memberships (user_id, agency_id, role_id, organization_id, role)
          VALUES (r.id, r.agency_id, v_role_id, r.agency_id, default_role);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.memberships SET role_id = v_role_id WHERE user_id = r.id AND agency_id = r.agency_id;
        IF NOT FOUND THEN
          INSERT INTO public.memberships (user_id, agency_id, role_id)
          VALUES (r.id, r.agency_id, v_role_id);
        END IF;
      END;
    END IF;
  END LOOP;
END;
$$;

-- 9. Enable RLS on new tables
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- 10. Policies for RBAC tables
DROP POLICY IF EXISTS "Everyone can see permissions" ON public.permissions;
CREATE POLICY "Everyone can see permissions" ON public.permissions FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Agency users can see roles" ON public.roles;
CREATE POLICY "Agency users can see roles" ON public.roles FOR SELECT 
USING (agency_id IN (SELECT current_orgs()));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;
CREATE POLICY "Admins can manage roles" ON public.roles FOR ALL
USING (agency_id IN (SELECT current_orgs()) AND public.has_permission('settings.manage'));

DROP POLICY IF EXISTS "Agency users can see role permissions" ON public.role_permissions;
CREATE POLICY "Agency users can see role permissions" ON public.role_permissions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.agency_id IN (SELECT current_orgs())));

DROP POLICY IF EXISTS "Agency users can see memberships" ON public.memberships;
CREATE POLICY "Agency users can see memberships" ON public.memberships FOR SELECT
USING (agency_id IN (SELECT current_orgs()));

DROP POLICY IF EXISTS "Admins can manage memberships" ON public.memberships;
CREATE POLICY "Admins can manage memberships" ON public.memberships FOR ALL
USING (agency_id IN (SELECT current_orgs()) AND public.has_permission('users.manage'));

-- 11. Update Main RLS Policies to use new RBAC structure
DROP POLICY IF EXISTS "leads_read_v4" ON public.leads;
DROP POLICY IF EXISTS "leads_read_v5" ON public.leads;
CREATE POLICY "leads_read_v5" ON public.leads FOR SELECT 
USING (agency_id IN (SELECT current_orgs()) AND public.has_permission('leads.view') AND deleted_at IS NULL);

DROP POLICY IF EXISTS "deals_read_v3" ON public.deals;
DROP POLICY IF EXISTS "deals_read_v4" ON public.deals;
CREATE POLICY "deals_read_v4" ON public.deals FOR SELECT 
USING (agency_id IN (SELECT current_orgs()) AND public.has_permission('deals.view') AND deleted_at IS NULL);

DROP POLICY IF EXISTS "deals_insert_v2" ON public.deals;
CREATE POLICY "deals_insert_v2" ON public.deals FOR INSERT 
WITH CHECK (agency_id IN (SELECT current_orgs()) AND public.has_permission('deals.create'));

DROP POLICY IF EXISTS "deals_update_v2" ON public.deals;
CREATE POLICY "deals_update_v2" ON public.deals FOR UPDATE
USING (agency_id IN (SELECT current_orgs()) AND public.has_permission('deals.update'));

DROP POLICY IF EXISTS "payments_read_v2" ON public.deal_payments;
CREATE POLICY "payments_read_v2" ON public.deal_payments FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.agency_id IN (SELECT current_orgs())) AND public.has_permission('finance.view'));

DROP POLICY IF EXISTS "payments_write_v2" ON public.deal_payments;
CREATE POLICY "payments_write_v2" ON public.deal_payments FOR ALL
USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.agency_id IN (SELECT current_orgs())) AND public.has_permission('finance.manage'));
