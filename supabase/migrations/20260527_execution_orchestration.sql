-- =============================================================================
-- PHASE G: EXECUTION ORCHESTRATION & OPERATIONAL AUTOMATION ENGINE
-- =============================================================================

-- 1. TASK DEPENDENCIES (LAYER 1)
CREATE TABLE IF NOT EXISTS public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_task_dependency UNIQUE (agency_id, task_id, depends_on_task_id)
);

-- 2. SLA POLICIES & VIOLATIONS (LAYER 2)
CREATE TABLE IF NOT EXISTS public.sla_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_entity TEXT NOT NULL CHECK (target_entity IN ('lead', 'deal', 'chantier', 'task', 'approval')),
    trigger_condition TEXT NOT NULL, -- e.g., 'stage_changed' or 'lead_created'
    max_duration_hours INTEGER NOT NULL CHECK (max_duration_hours > 0),
    warning_threshold_hours INTEGER NOT NULL DEFAULT 4 CHECK (warning_threshold_hours < max_duration_hours),
    action_on_warning TEXT, -- JSON action string / code
    action_on_breach TEXT,  -- JSON action string / code
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sla_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES public.sla_policies(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL, -- Generic polymorphic reference
    entity_type TEXT NOT NULL, -- 'lead', 'deal', 'task', etc.
    deadline TIMESTAMPTZ NOT NULL,
    breached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remedied_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'unassigned' CHECK (status IN ('unassigned', 'assigned_to_agent', 'escalated_to_manager', 'resolved', 'ignored')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. AUTOMATION RULES & EXECUTIONS (LAYER 3)
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_event TEXT NOT NULL, -- e.g. 'milestone.validated', 'deal_payment.overdue'
    condition_expression TEXT,  -- JSON or string condition
    action_type TEXT NOT NULL CHECK (action_type IN ('create_task', 'send_whatsapp', 'trigger_escalation', 'reconcile_finance', 'update_unit_status')),
    action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.automation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'retrying')),
    execution_log TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. APPROVAL REQUESTS & STEPS (LAYER 4)
CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    entity_id UUID NOT NULL, -- Polymorphic relation (e.g. quote, PO, promotion phase)
    entity_type TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'bypassed')),
    current_step_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
    step_sequence INTEGER NOT NULL DEFAULT 0,
    role_required TEXT NOT NULL CHECK (role_required IN ('branch_manager', 'engineer', 'accountant', 'owner')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
    signed_checksum TEXT, -- Cryptographic stamp audit confirmation
    comment TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ESCALATIONS (LAYER 5)
CREATE TABLE IF NOT EXISTS public.escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('medium', 'high', 'critical')),
    assigned_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'stale')),
    whatsapp_notified_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. OPERATIONAL SCHEDULES / TIMERS (LAYER 6)
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cron_expression TEXT NOT NULL, -- Standard crontab or interval definition
    target_action TEXT NOT NULL,  -- RPC name or webhook code
    target_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. EVENT BUS & OUTBOX (LAYER 7)
CREATE TABLE IF NOT EXISTS public.orchestrator_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- e.g. 'deal.created', 'milestone.validated'
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    publisher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    processed_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. RECOVERY & SELF-HEALING SYSTEM (LAYER 8)
CREATE TABLE IF NOT EXISTS public.recovery_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    incident_type TEXT NOT NULL, -- e.g. 'stuck_approval', 'missing_payment_audit'
    incident_description TEXT,
    remediation_strategy TEXT NOT NULL, -- e.g., 'dispatch_reminder', 'force_sync'
    status TEXT NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'executing', 'recovered', 'failed', 'unrecoverable')),
    output_logs TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. NOTIFICATION PIPELINE (LAYER 9)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'whatsapp', 'email', 'sms')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    whatsapp_payload JSONB, -- Tracks message receipt states
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'read')),
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. UNIFIED EXECUTION TIMELINE (LAYER 10)
CREATE TABLE IF NOT EXISTS public.execution_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    event_category TEXT NOT NULL, -- 'milestone', 'financial', 'approval', 'automation', 'escalation', 'sla'
    title TEXT NOT NULL,
    description TEXT,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PERFORMANCE TUNING INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_task_deps_task ON public.task_dependencies(task_id, depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_sla_policies_active ON public.sla_policies(agency_id, target_entity) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sla_violations_status ON public.sla_violations(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_auto_execution_rule ON public.automation_executions(rule_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_req_entity ON public.approval_requests(entity_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_steps_req ON public.approval_steps(request_id, step_sequence);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON public.escalations(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_execution_timeline_proj ON public.execution_timeline(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_timeline_deal ON public.execution_timeline(deal_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY RULES (TENANT ISOLATION)
-- =============================================================================
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchestrator_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_task_deps" ON public.task_dependencies FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_sla_policies" ON public.sla_policies FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_sla_violations" ON public.sla_violations FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_auto_rules" ON public.automation_rules FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_auto_executions" ON public.automation_executions FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_approval_reqs" ON public.approval_requests FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_approval_steps" ON public.approval_steps FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_escalations" ON public.escalations FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_schedules" ON public.schedules FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_orchestrator_events" ON public.orchestrator_events FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_recovery_jobs" ON public.recovery_jobs FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_notifications" ON public.notifications FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_execution_timeline" ON public.execution_timeline FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
