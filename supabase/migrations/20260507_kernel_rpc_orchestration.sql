-- Migration: 20260507_kernel_rpc_orchestration.sql
-- Description: Implement transaction orchestrators for kernel command execution

CREATE OR REPLACE FUNCTION core_execute_mutation(
  tenant_id UUID,
  aggregate_id UUID,
  expected_version INT,
  state_payload JSONB,
  outbox_events JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Escalated privilege to write across outbox without returning RLS blocks to specific domains, we use the explicit tenant_id argument
SET search_path = public
AS $$
DECLARE
  current_version INT;
  event RECORD;
BEGIN
  -- 1. Optimistic Locking & Fetch
  -- Uses FOR UPDATE to serialize concurrent writes
  SELECT version INTO current_version 
  FROM deals 
  WHERE id = aggregate_id 
  AND agency_id = tenant_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'entity_not_found';
  END IF;

  -- 2. Version Verification
  IF current_version != expected_version THEN
    RAISE EXCEPTION 'version_conflict';
  END IF;

  -- 3. Atomic State Application
  UPDATE deals SET 
    status = state_payload->>'status',
    version = current_version + 1,
    updated_at = NOW()
  WHERE id = aggregate_id AND agency_id = tenant_id;

  -- 4. Atomic Outbox Sync
  -- Loop through outbox_events jsonb array and insert rows
  FOR event IN SELECT * FROM jsonb_array_elements(outbox_events)
  LOOP
    INSERT INTO outbox_events (
      id, aggregate_id, tenant_id, type, version, payload, trace_id, status, created_at
    ) VALUES (
      (event.value->>'event_id')::UUID,
      aggregate_id,
      tenant_id,
      event.value->>'type',
      current_version + 1,
      event.value->'payload',
      event.value->>'trace_id',
      'PENDING',
      NOW()
    );
  END LOOP;

END;
$$;
