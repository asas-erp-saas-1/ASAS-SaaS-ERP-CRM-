-- =============================================================================
-- ASAS ERP: MASTER MIGRATION (PRODUCTION READY)
-- =============================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations (Agencies)
CREATE TABLE IF NOT EXISTS public.agencies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  settings    JSONB DEFAULT '{}'
);

-- 2. Profiles (Linked to Auth.Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id   UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT UNIQUE,
  role        TEXT CHECK (role IN ('admin', 'manager', 'agent')) DEFAULT 'agent',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id   UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  nationality TEXT,
  source      TEXT,
  type        TEXT CHECK (type IN ('buyer', 'seller', 'tenant', 'investor')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id   UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  city        TEXT,
  status      TEXT DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Properties
CREATE TABLE IF NOT EXISTS public.properties (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id   UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  reference_code TEXT,
  type        TEXT,
  list_price  NUMERIC(15,2),
  status      TEXT CHECK (status IN ('available', 'reserved', 'sold', 'off_market')) DEFAULT 'available',
  images      TEXT[],
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Leads
CREATE TABLE IF NOT EXISTS public.leads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id   UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  agent_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status      TEXT CHECK (status IN ('new', 'contacted', 'interested', 'visit_scheduled', 'converted', 'lost')) DEFAULT 'new',
  source      TEXT,
  budget_min  NUMERIC(15,2),
  budget_max  NUMERIC(15,2),
  notes       TEXT,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Deals
CREATE TABLE IF NOT EXISTS public.deals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id   UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT CHECK (status IN ('active', 'negotiation', 'closed', 'cancelled')) DEFAULT 'active',
  agreed_price NUMERIC(15,2) NOT NULL,
  commission_amount NUMERIC(15,2),
  closing_date DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id   UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  new_data    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- RLS POLICIES (MULTI-TENANCY)
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper to get user agency_id
CREATE OR REPLACE FUNCTION public.fn_agency_id() RETURNS UUID AS $$
  SELECT agency_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Profiles Policy
CREATE POLICY "Users can see profiles in their agency" ON public.profiles
  FOR SELECT USING (agency_id = public.fn_agency_id());

-- Clients Policy
CREATE POLICY "Agency isolation for clients" ON public.clients
  FOR ALL USING (agency_id = public.fn_agency_id());

-- Leads Policy
CREATE POLICY "Agency isolation for leads" ON public.leads
  FOR ALL USING (agency_id = public.fn_agency_id());

-- Deals Policy
CREATE POLICY "Agency isolation for deals" ON public.deals
  FOR ALL USING (agency_id = public.fn_agency_id());

-- Create Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agencies_modtime BEFORE UPDATE ON public.agencies FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_leads_modtime BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_deals_modtime BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
