-- 20260507_rls_governance.sql
-- Description: Physical PostgreSQL Row-Level Security for strict Multi-Tenant Isolation

-- 1. Enable RLS on core tables
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_metrics ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing potentially weak policies
DROP POLICY IF EXISTS "tenant_isolation_outbox" ON outbox_events;
DROP POLICY IF EXISTS "tenant_isolation_deals" ON deals;
DROP POLICY IF EXISTS "tenant_isolation_leads" ON leads;

-- 3. The Master Gate Policy (ABAC based on JWT Claims)
-- Supabase JWT must inject the custom `app_metadata.agency_id` during Auth session generation.

-- Deals Isolation
CREATE POLICY "tenant_isolation_deals" ON deals
    FOR ALL
    USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID)
    WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);

-- Leads Isolation
CREATE POLICY "tenant_isolation_leads" ON leads
    FOR ALL
    USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID)
    WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);

-- Outbox Events Isolation
CREATE POLICY "tenant_isolation_outbox" ON outbox_events
    FOR ALL
    USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID)
    WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);

-- Read Models / Pipeline Metrics
CREATE POLICY "tenant_isolation_pipeline_metrics" ON pipeline_metrics
    FOR ALL
    USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID)
    WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);

-- 4. Service Role Bypasses
-- RLS policies inherently bypass for the service_role key, which is heavily utilized 
-- by our isolated CQRS projection workers and kernel orchestrators operating securely server-side.
