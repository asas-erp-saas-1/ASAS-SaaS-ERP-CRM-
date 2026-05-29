-- =============================================================================
-- SaaS RLS & RBAC HARDENING - INCREMENTAL UPDATE
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
  is_system   BOOLEAN   DEFAULT FALSE, -- System roles cannot be deleted
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

-- 4. Update Profiles to support Role ID
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

-- 5. Helper Functions for RBAC
CREATE OR REPLACE FUNCTION public.current_org()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.fn_agency_id();
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p_permission TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_resource TEXT;
  v_action   TEXT;
BEGIN
  -- Split "resource.action"
  v_resource := split_part(p_permission, '.', 1);
  v_action   := split_part(p_permission, '.', 2);

  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions perm ON perm.id = rp.permission_id
    WHERE p.id = auth.uid()
      AND p.agency_id = r.agency_id -- Strict isolation
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
  -- 1. Create Admin Role
  INSERT INTO public.roles (agency_id, name, description, is_system)
  VALUES (p_agency_id, 'Admin', 'Full administrative access', TRUE)
  RETURNING id INTO v_admin_role_id;

  -- 2. Create Manager Role
  INSERT INTO public.roles (agency_id, name, description, is_system)
  VALUES (p_agency_id, 'Manager', 'Team management and reporting', TRUE)
  RETURNING id INTO v_manager_role_id;

  -- 3. Create Agent Role
  INSERT INTO public.roles (agency_id, name, description, is_system)
  VALUES (p_agency_id, 'Agent', 'Property and lead management', TRUE)
  RETURNING id INTO v_agent_role_id;

  -- 4. Assign Permissions to Admin (All)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_admin_role_id, id FROM public.permissions;

  -- 5. Assign Permissions to Manager
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_manager_role_id, id FROM public.permissions 
  WHERE resource IN ('leads', 'deals', 'finance', 'audit') AND action IN ('view', 'create', 'update');

  -- 6. Assign Permissions to Agent
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_agent_role_id, id FROM public.permissions 
  WHERE resource IN ('leads', 'deals') AND action IN ('view', 'create', 'update');
END;
$$;

-- 8. Migration for Existing Data
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.agencies LOOP
    PERFORM public.fn_bootstrap_agency_roles(r.id);
    
    -- Assign role_id to existing profiles based on their old enum role
    UPDATE public.profiles p
    SET role_id = (SELECT id FROM public.roles WHERE agency_id = p.agency_id AND name = INITCAP(p.role::TEXT))
    WHERE p.agency_id = r.id;
  END LOOP;
END;
$$;

-- 9. Enterprise: Soft Delete / Audit Log Hardening
-- Example of soft delete for deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Hardened Audit Logic
CREATE OR REPLACE FUNCTION public.fn_log_activity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_agency_id UUID;
  v_entity_id UUID;
  v_data      JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_agency_id := OLD.agency_id;
    v_entity_id := OLD.id;
    v_data      := row_to_json(OLD);
  ELSE
    v_agency_id := NEW.agency_id;
    v_entity_id := NEW.id;
    v_data      := row_to_json(NEW);
  END IF;

  INSERT INTO public.audit_logs (agency_id, user_id, action, entity_type, entity_id, new_data)
  VALUES (v_agency_id, auth.uid(), TG_OP, TG_TABLE_NAME, v_entity_id, v_data);
  
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- 10. Enable RLS on new tables
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 11. Policies for RBAC tables
CREATE POLICY "Everyone can see permissions" ON public.permissions FOR SELECT USING (TRUE);

CREATE POLICY "Agency users can see roles" ON public.roles FOR SELECT 
USING (agency_id = public.fn_agency_id());

CREATE POLICY "Admins can manage roles" ON public.roles FOR ALL
USING (agency_id = public.fn_agency_id() AND public.fn_has_permission('settings', 'manage'));

CREATE POLICY "Agency users can see role permissions" ON public.role_permissions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.agency_id = public.fn_agency_id()));

-- 12. Update Main RLS Policies to use Permissions
-- =============================================================================

-- LEADS
DROP POLICY IF EXISTS "leads_read" ON public.leads;
DROP POLICY IF EXISTS "leads_read_v2" ON public.leads;
DROP POLICY IF EXISTS "leads_read_v3" ON public.leads;
CREATE POLICY "leads_read_v4" ON public.leads FOR SELECT 
USING (agency_id = public.current_org() AND public.has_permission('leads.view') AND deleted_at IS NULL);

-- DEALS
DROP POLICY IF EXISTS "deals_read" ON public.deals;
DROP POLICY IF EXISTS "deals_read_v2" ON public.deals;
CREATE POLICY "deals_read_v3" ON public.deals FOR SELECT 
USING (agency_id = public.current_org() AND public.has_permission('deals.view') AND deleted_at IS NULL);

DROP POLICY IF EXISTS "deals_insert" ON public.deals;
CREATE POLICY "deals_insert_v2" ON public.deals FOR INSERT 
WITH CHECK (agency_id = public.current_org() AND public.has_permission('deals.create'));

DROP POLICY IF EXISTS "deals_update" ON public.deals;
CREATE POLICY "deals_update_v2" ON public.deals FOR UPDATE
USING (agency_id = public.current_org() AND public.has_permission('deals.update'));

-- FINANCE (Payments / Commissions)
DROP POLICY IF EXISTS "payments_read" ON public.deal_payments;
CREATE POLICY "payments_read_v2" ON public.deal_payments FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.agency_id = public.current_org()) AND public.has_permission('finance.view'));

DROP POLICY IF EXISTS "payments_write" ON public.deal_payments;
CREATE POLICY "payments_write_v2" ON public.deal_payments FOR ALL
USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.agency_id = public.current_org()) AND public.has_permission('finance.manage'));

-- 13. Audit Triggers
-- =============================================================================
CREATE TRIGGER trg_audit_leads
  AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_activity();

CREATE TRIGGER trg_audit_deals
  AFTER INSERT OR UPDATE OR DELETE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_activity();

-- 14. Org Limits Check Function
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_check_org_limit(p_limit_name TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_agency_id UUID;
  v_limit_val INTEGER;
  v_curr_val  INTEGER;
BEGIN
  v_agency_id := public.current_org();
  
  -- Example: check leads count for the current month
  IF p_limit_name = 'max_leads_mtd' THEN
    SELECT max_leads_mtd INTO v_limit_val FROM public.agencies WHERE id = v_agency_id;
    SELECT leads_created INTO v_curr_val FROM public.usage_counters 
    WHERE agency_id = v_agency_id AND period = date_trunc('month', CURRENT_DATE)::DATE;
    
    RETURN COALESCE(v_curr_val, 0) < v_limit_val;
  END IF;

  RETURN TRUE;
END;
$$;
