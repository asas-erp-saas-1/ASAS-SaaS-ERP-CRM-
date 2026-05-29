-- ASAS RE-OS: Implementation of Steps 5, 6, and 7
-- Step 5: Business Logic Mapping (Commission Trigger & Deal Stages)
-- Step 6: Security & Edge Cases (Optimistic Locking & Identity Fixes)
-- Step 7: RLS Performance (JWT App Metadata Binding)

BEGIN;

-------------------------------------------------------------------------------
-- 1. STEP 7 improvements: JWT Claim extraction function
-------------------------------------------------------------------------------
-- Instead of doing a SELECT on tenant_members every single row, we pull it from the JWT
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' ->> 'tenant_id')::UUID;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS UUID AS $$
  SELECT current_tenant_id();
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS text AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' ->> 'role';
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.user_role() RETURNS text AS $$
  SELECT current_user_role();
$$ LANGUAGE SQL STABLE;

-------------------------------------------------------------------------------
-- 2. STEP 6 improvements: Optimistic Locking for Deals to prevent Concurrent Updates
-------------------------------------------------------------------------------
-- Adds an `updated_at` check constraint logic or just a version number.
ALTER TABLE deals ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

CREATE OR REPLACE FUNCTION check_optimistic_locking() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'Concurrent update detected on deal %. Expected version %, got %', NEW.id, OLD.version + 1, NEW.version;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deal_optimistic_lock ON deals;
CREATE TRIGGER deal_optimistic_lock
BEFORE UPDATE ON deals
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.agreed_price IS DISTINCT FROM NEW.agreed_price)
EXECUTE FUNCTION check_optimistic_locking();


-------------------------------------------------------------------------------
-- 3. STEP 5 improvements: Commission Logic Trigger
-------------------------------------------------------------------------------
-- Deals closed -> Insert commission
CREATE OR REPLACE FUNCTION trigger_commission_on_closed_won() RETURNS TRIGGER AS $$
DECLARE
  v_commission_amount DECIMAL(15, 2);
  v_tenant_config RECORD;
BEGIN
  -- If the deal status changes to 'closed'
  IF NEW.status = 'closed' AND OLD.status IS DISTINCT FROM 'closed' THEN
    
    -- In a real scenario, this gets the configured rate from tenants or settings
    -- We assume a flat 5% commission if no config is found for demonstration
    v_commission_amount := NEW.agreed_price * 0.05;

    INSERT INTO transactions (
      tenant_id,
      deal_id,
      type,
      amount,
      reference,
      logged_by,
      created_at,
      updated_at
    ) VALUES (
      NEW.agency_id, -- assuming tenant_id maps to agency_id in this table
      NEW.id,
      'commission',
      v_commission_amount,
      'Auto-generated commission for closing deal ' || NEW.id,
      NEW.agent_id,
      NOW(),
      NOW()
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Notice SECURITY DEFINER: allows the trigger to write to transactions even if the agent lacks direct insert access.

DROP TRIGGER IF EXISTS trg_deal_commission ON deals;
CREATE TRIGGER trg_deal_commission
AFTER UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION trigger_commission_on_closed_won();

-------------------------------------------------------------------------------
-- 4. STEP 5 improvements: Lead Lifecycle (Stale chron or trigger)
-------------------------------------------------------------------------------
-- Marking leads as stale if not updated in 48h. Usually run via pg_cron.
-- Assuming pg_cron is enabled:
/*
SELECT cron.schedule('check-stale-leads', '0 * * * *', $$
  UPDATE leads 
  SET status = 'closed_lost' -- or 'stale' 
  WHERE status = 'new' AND updated_at < NOW() - INTERVAL '48 hours';
$$);
*/

COMMIT;
