-- PHASE 1: ROW LEVEL SECURITY & INDEXES

-- 1. Enable RLS on core tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 2. Enforce Tenant Isolation Policies
-- System users (owner, manager, agent) can only access rows matching their authorized tenant boundary
-- Main tables use "agency_id", billing tables use "tenant_id"

-- Leads Isolation
CREATE POLICY "Strict Tenant Isolation" ON leads
  FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid);

-- Deals Isolation
CREATE POLICY "Strict Tenant Isolation" ON deals
  FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid);

-- Activities Isolation
CREATE POLICY "Strict Tenant Isolation" ON activities
  FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid);

-- Properties Isolation
CREATE POLICY "Strict Tenant Isolation" ON properties
  FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid);

-- Projects Isolation
CREATE POLICY "Strict Tenant Isolation" ON projects
  FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid);

-- Invoices Isolation
CREATE POLICY "Strict Tenant Isolation" ON invoices
  FOR ALL USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid);

-- Subscriptions Isolation
CREATE POLICY "Strict Tenant Isolation" ON subscriptions
  FOR ALL USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid);

-- Payments Isolation
CREATE POLICY "Strict Tenant Isolation" ON payments
  FOR ALL USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid);

-- 3. High Performance Indexes Setup
CREATE INDEX idx_leads_agency_status ON leads (agency_id, status);
CREATE INDEX idx_deals_agency_lead ON deals (agency_id, lead_id);
CREATE INDEX idx_activities_agency_lead ON activities (agency_id, lead_id);
CREATE INDEX idx_properties_agency_status ON properties (agency_id, status);
CREATE INDEX idx_invoices_tenant_status ON invoices (tenant_id, status);

-- 4. Foreign Key Constraints & Cascade Deletes
ALTER TABLE deals 
  DROP CONSTRAINT IF EXISTS deals_lead_id_fkey,
  ADD CONSTRAINT deals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

ALTER TABLE activities 
  DROP CONSTRAINT IF EXISTS activities_lead_id_fkey,
  ADD CONSTRAINT activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- 5. Soft Delete Strategy additions
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_leads_agency_not_deleted ON leads (agency_id) WHERE is_deleted = FALSE;
