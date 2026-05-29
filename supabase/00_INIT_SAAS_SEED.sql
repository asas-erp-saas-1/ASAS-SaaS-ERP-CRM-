-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. DATABASE SCHEMA
-- ==========================================

-- Tenants (Companies)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties (ERP Module)
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    reference_code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- e.g., 'apartment', 'villa', 'commercial'
    status VARCHAR(50) DEFAULT 'available', -- 'available', 'reserved', 'sold'
    price NUMERIC(15, 2) NOT NULL,
    surface NUMERIC(10, 2),
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads (CRM Module)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'converted', 'lost'
    budget NUMERIC(15, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals (CRM & Finance Module)
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL,
    stage VARCHAR(50) DEFAULT 'presentation', -- 'presentation', 'negotiation', 'contract', 'won', 'lost'
    probability INTEGER DEFAULT 10,
    expected_close_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities / Interactions
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'call', 'email', 'meeting', 'note'
    description TEXT NOT NULL,
    activity_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Tenants Policy
CREATE POLICY "Users can view their own tenant"
    ON public.tenants FOR SELECT
    USING (id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Roles Policy
CREATE POLICY "Roles are viewable by all authenticated users"
    ON public.roles FOR SELECT
    TO authenticated
    USING (true);

-- Profiles Policies
CREATE POLICY "Users can view profiles in their tenant"
    ON public.profiles FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());

-- Properties Policies
CREATE POLICY "Users can view properties in their tenant"
    ON public.properties FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage properties in their tenant"
    ON public.properties FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Leads Policies
CREATE POLICY "Users can view leads in their tenant"
    ON public.leads FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage leads in their tenant"
    ON public.leads FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Deals Policies
CREATE POLICY "Users can view deals in their tenant"
    ON public.deals FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage deals in their tenant"
    ON public.deals FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Activities Policies
CREATE POLICY "Users can view activities in their tenant"
    ON public.activities FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage activities in their tenant"
    ON public.activities FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- ==========================================
-- 3. SEED DATA & AUTH USERS
-- ==========================================

-- Define static UUIDs for linking relations
DO $$
DECLARE
    v_tenant_id UUID := '11111111-1111-1111-1111-111111111111';
    v_role_admin_id UUID := '22222222-2222-2222-2222-222222222222';
    v_role_agent_id UUID := '33333333-3333-3333-3333-333333333333';
    v_role_client_id UUID := '44444444-4444-4444-4444-444444444444';
    
    v_user_admin_id UUID := '55555555-5555-5555-5555-555555555555';
    v_user_agent1_id UUID := '66666666-6666-6666-6666-666666666666';
    v_user_agent2_id UUID := '77777777-7777-7777-7777-777777777777';
    v_user_client1_id UUID := '88888888-8888-8888-8888-888888888888';
    v_user_client2_id UUID := '99999999-9999-9999-9999-999999999999';

    v_property1_id UUID := gen_random_uuid();
    v_property2_id UUID := gen_random_uuid();
    
    v_lead1_id UUID := gen_random_uuid();
    v_lead2_id UUID := gen_random_uuid();
    
    v_deal1_id UUID := gen_random_uuid();
BEGIN

    -- Insert Tenant
    INSERT INTO public.tenants (id, name, domain)
    VALUES (v_tenant_id, 'ASAS Real Estate', 'asas-os.com')
    ON CONFLICT (id) DO NOTHING;

    -- Insert Roles
    INSERT INTO public.roles (id, name, description) VALUES
        (v_role_admin_id, 'admin', 'System Administrator'),
        (v_role_agent_id, 'agent', 'Sales Agent'),
        (v_role_client_id, 'client', 'Client / Customer')
    ON CONFLICT (id) DO NOTHING;

    -- Create Auth Users
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES 
        (v_user_admin_id, 'authenticated', 'authenticated', 'admin@asas-os.com', crypt('Admin123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin User"}', now(), now()),
        (v_user_agent1_id, 'authenticated', 'authenticated', 'agent1@asas-os.com', crypt('Agent123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sales Agent 1"}', now(), now()),
        (v_user_agent2_id, 'authenticated', 'authenticated', 'agent2@asas-os.com', crypt('Agent123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sales Agent 2"}', now(), now()),
        (v_user_client1_id, 'authenticated', 'authenticated', 'client1@test.com', crypt('Client123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Test Client 1"}', now(), now()),
        (v_user_client2_id, 'authenticated', 'authenticated', 'client2@test.com', crypt('Client123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Test Client 2"}', now(), now())
    ON CONFLICT (id) DO NOTHING;

    -- Insert Profiles
    INSERT INTO public.profiles (id, tenant_id, role_id, full_name, phone) VALUES
        (v_user_admin_id, v_tenant_id, v_role_admin_id, 'Admin User', '+213000000000'),
        (v_user_agent1_id, v_tenant_id, v_role_agent_id, 'Sarah Mansouri', '+213555000111'),
        (v_user_agent2_id, v_tenant_id, v_role_agent_id, 'Karim Haddad', '+213555000222'),
        (v_user_client1_id, v_tenant_id, v_role_client_id, 'Amine B.', '+213666000111'),
        (v_user_client2_id, v_tenant_id, v_role_client_id, 'Nadia T.', '+213666000222')
    ON CONFLICT (id) DO NOTHING;

    -- Insert Properties
    INSERT INTO public.properties (id, tenant_id, title, reference_code, type, status, price, surface, location) VALUES
        (v_property1_id, v_tenant_id, 'Villa Horizon', 'REF-VIL-001', 'villa', 'available', 15000000.00, 320.50, 'Sidi Fredj, Algiers'),
        (v_property2_id, v_tenant_id, 'Apartment Atlas', 'REF-APT-002', 'apartment', 'available', 8500000.00, 110.00, 'Hydra, Algiers')
    ON CONFLICT (id) DO NOTHING;

    -- Insert Leads
    INSERT INTO public.leads (id, tenant_id, assigned_to, first_name, last_name, email, phone, source, status, budget) VALUES
        (v_lead1_id, v_tenant_id, v_user_agent1_id, 'Amine', 'B.', 'client1@test.com', '+213666000111', 'Website', 'qualified', 16000000.00),
        (v_lead2_id, v_tenant_id, v_user_agent2_id, 'Nadia', 'T.', 'client2@test.com', '+213666000222', 'Referral', 'new', 9000000.00)
    ON CONFLICT (id) DO NOTHING;

    -- Insert Deals
    INSERT INTO public.deals (id, tenant_id, lead_id, property_id, assigned_to, amount, stage, probability) VALUES
        (v_deal1_id, v_tenant_id, v_lead1_id, v_property1_id, v_user_agent1_id, 14500000.00, 'negotiation', 60)
    ON CONFLICT (id) DO NOTHING;

    -- Insert Activities
    INSERT INTO public.activities (tenant_id, lead_id, created_by, type, description) VALUES
        (v_tenant_id, v_lead1_id, v_user_agent1_id, 'call', 'Called lead to discuss Villa Horizon. Very interested.'),
        (v_tenant_id, v_lead2_id, v_user_agent2_id, 'email', 'Sent initial brochure for new apartments in Hydra.'),
        (v_tenant_id, v_lead1_id, v_user_agent1_id, 'meeting', 'Organized a site visit at Sidi Fredj.')
    ON CONFLICT (id) DO NOTHING;

END $$;
