-- =============================================================================
-- PHASE F: CONSTRUCTION OPERATIONS & PROJECT LIFECYCLE ENGINE
-- =============================================================================

-- 1. PROJECT PHASES & APPROVAL GATES
CREATE TABLE IF NOT EXISTS public.project_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    phase_code TEXT NOT NULL CHECK (phase_code IN ('acquisition', 'excavation', 'foundation', 'structure', 'finishing', 'delivery')),
    phase_name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'unstarted' CHECK (status IN ('unstarted', 'in_progress', 'completed', 'delayed')),
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved')),
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CHANTIERS (PHYSICAL SITES)
CREATE TABLE IF NOT EXISTS public.chantiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'completed', 'on_hold')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_chantier_code UNIQUE (agency_id, code)
);

-- 3. CHANTIER DAILY ACTIVITY LOGGING
CREATE TABLE IF NOT EXISTS public.chantier_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    work_completed TEXT,
    incidents_noted TEXT,
    delay_minutes INTEGER NOT NULL DEFAULT 0,
    delay_reason TEXT,
    photo_urls TEXT[] NOT NULL DEFAULT '{}',
    worker_count INTEGER NOT NULL DEFAULT 0,
    gps_coordinates TEXT,
    offline_synced BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. MATERIALS REGISTRY & PROCUREMENT SYSTEM
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit_of_measure TEXT NOT NULL, -- tons, bags, units, cubic_meters
    unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
    stock_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
    min_threshold NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_material_name UNIQUE (agency_id, name)
);

CREATE TABLE IF NOT EXISTS public.material_consumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,
    quantity_used NUMERIC(15,2) NOT NULL,
    unit_cost_at_consumption NUMERIC(15,2) NOT NULL,
    logged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_supplier_name UNIQUE (agency_id, name)
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    vat_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'delivered', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'fully_paid')),
    approval_signature TEXT,
    ledger_reference_id UUID, -- References high-integrity ledger transaction
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. UNITS / REAL ESTATE INVENTORY (SYNCHRONIZED WITH COMMERCIAL PROPERTIES)
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL, -- Commercial property binding
    block TEXT NOT NULL, -- Block A, B, etc.
    floor INTEGER NOT NULL,
    residence TEXT,
    reference_code TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('F1', 'F2', 'F3', 'F4', 'F5', 'villa', 'duplex', 'commercial', 'other')),
    status TEXT NOT NULL DEFAULT 'under_construction' CHECK (status IN ('reserved', 'under_construction', 'completed', 'available_for_sale', 'sold', 'delivered')),
    rooms_count INTEGER,
    surface_area NUMERIC(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_unit_reference UNIQUE(agency_id, reference_code)
);

CREATE TABLE IF NOT EXISTS public.unit_states_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- 6. CONTRACTORS (SUBCONTRACTORS) & ALLOCATIONS
CREATE TABLE IF NOT EXISTS public.contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL, -- Masonry, Electrical, Plumbing, HVAC
    email TEXT,
    phone TEXT,
    score NUMERIC(3,2) NOT NULL DEFAULT 5.00,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blacklisted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_contractor_name UNIQUE(agency_id, name)
);

CREATE TABLE IF NOT EXISTS public.contractor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    budget NUMERIC(15,2) NOT NULL DEFAULT 0,
    penalty_per_delay_day NUMERIC(15,2) NOT NULL DEFAULT 0,
    contract_status TEXT NOT NULL DEFAULT 'active' CHECK (contract_status IN ('active', 'completed', 'cancelled', 'terminated')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. MILESTONE STANDARDS & PROOF-BASED VALIDATION
CREATE TABLE IF NOT EXISTS public.milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    percentage_unlock NUMERIC(5,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_verification', 'validated', 'bypassed', 'failed')),
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.milestone_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
    validated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    role TEXT NOT NULL CHECK (role IN ('chantier_director', 'engineer', 'branch_manager')),
    photo_url TEXT NOT NULL, -- Photographic proof reference
    comment TEXT,
    gps_coordinates TEXT,
    checksum TEXT, -- Telemetry sanity check
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PERFORMANCE TUNING INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_project_phases_proj ON public.project_phases(project_id, status);
CREATE INDEX IF NOT EXISTS idx_chantiers_proj ON public.chantiers(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON public.chantier_daily_logs(chantier_id, date);
CREATE INDEX IF NOT EXISTS idx_material_cons_chant ON public.material_consumptions(chantier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supp ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_units_project_prop ON public.units(project_id, property_id);
CREATE INDEX IF NOT EXISTS idx_milestones_proj_status ON public.milestones(project_id, status);
CREATE INDEX IF NOT EXISTS idx_contractor_assignments ON public.contractor_assignments(contractor_id, project_id);

-- =============================================================================
-- SECURITY LAYERS: RLS ON ALL DOMAIN TABLES
-- =============================================================================
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chantier_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_states_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_validations ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
CREATE POLICY "tenant_isolation_project_phases" ON public.project_phases FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_chantiers" ON public.chantiers FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_chantier_daily_logs" ON public.chantier_daily_logs FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_materials" ON public.materials FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_material_consumptions" ON public.material_consumptions FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_suppliers" ON public.suppliers FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_purchase_orders" ON public.purchase_orders FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_units" ON public.units FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_unit_states_history" ON public.unit_states_history FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_contractors" ON public.contractors FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_contractor_assignments" ON public.contractor_assignments FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_milestones" ON public.milestones FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_milestone_validations" ON public.milestone_validations FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);

-- =============================================================================
-- AUTO-SYNC TRIGGER: UPDATE COMMERICAL STATUS WHEN UNIT STATE MUTATES
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_unit_to_property_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.property_id IS NOT NULL THEN
        UPDATE public.properties
        SET status = CASE 
            WHEN NEW.status = 'available_for_sale' THEN 'available'::text
            WHEN NEW.status = 'reserved' THEN 'reserved'::text
            WHEN NEW.status = 'sold' THEN 'sold'::text
            WHEN NEW.status = 'delivered' THEN 'sold'::text
            ELSE status
        END
        WHERE id = NEW.property_id;
    END IF;
    
    -- Insert into history log
    INSERT INTO public.unit_states_history (agency_id, unit_id, old_status, new_status, changed_by, notes)
    VALUES (NEW.agency_id, NEW.id, OLD.status, NEW.status, auth.uid(), 'Statut chantier unifié');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_unit_status_commercial_sync
    AFTER UPDATE OF status ON public.units
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.fn_sync_unit_to_property_status();
