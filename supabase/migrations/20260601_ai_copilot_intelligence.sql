-- =============================================================================
-- PHASE I: ADVANCED AI OPERATIONAL COPILOT & EXECUTIVE COMMAND INTELLIGENCE SCHEMA
-- =============================================================================

-- 1. AI CONVERSATIONS & CHAT HISTORY (Branch Isolated)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Nouvelle Session Copilot',
    context_metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- active filters, branch selection, screen scope
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Conversation Messages
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    structured_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- extracted metrics, graph references
    grounding_citations JSONB NOT NULL DEFAULT '[]'::jsonb, -- maps or web grounding citations
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SYSTEM-GENERATED RECOMMENDATIONS (For Human-In-The-Loop Validation)
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    namespace TEXT NOT NULL, -- 'treasury', 'crm', 'chantier', 'recovery'
    recommendation_title TEXT NOT NULL,
    recommendation_body TEXT NOT NULL,
    proposed_actions JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of mock mutations or api payloads
    confidence_score NUMERIC(4,3) NOT NULL CHECK (confidence_score BETWEEN 0.000 AND 1.000),
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb, -- references to ledger_ids, task_ids, etc.
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
    executed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    decision_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. IMMUTABLE AI ACTION TRACES & PROMPT AUDITS
CREATE TABLE IF NOT EXISTS public.ai_action_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
    intent_detected TEXT NOT NULL,
    executed_command TEXT NOT NULL,
    affected_entities JSONB NOT NULL DEFAULT '[]'::jsonb,
    was_successful BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_prompt_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    raw_prompt TEXT NOT NULL,
    sanitized_prompt TEXT,
    system_instruction_snapshot TEXT NOT NULL,
    model_version_used TEXT NOT NULL,
    input_token_count INTEGER,
    output_token_count INTEGER,
    has_injection_risk BOOLEAN NOT NULL DEFAULT false,
    was_blocked BOOLEAN NOT NULL DEFAULT false,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ACTIVE CONTEXT WINDOW SNAPSHOTS & EPHEMERAL MEMORY SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.ai_context_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    context_keys JSONB NOT NULL DEFAULT '[]'::jsonb, -- keys currently mapped to cache
    retrieved_ledger_sum NUMERIC(20,2),
    retrieved_chantier_delay_days INTEGER,
    context_freshness_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_memory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('session_ephemeral', 'branch_tactical', 'executive_strategic')),
    captured_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    expiration_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. BUSINESS COMPLIANCE & RISK FLAGS FOR COPILOT DECISIONS
CREATE TABLE IF NOT EXISTS public.ai_risk_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    recommendation_id UUID REFERENCES public.ai_recommendations(id) ON DELETE CASCADE,
    violation_tier TEXT NOT NULL CHECK (violation_tier IN ('low_warning', 'compliance_override_required', 'strict_block')),
    flag_reason TEXT NOT NULL,
    is_superseded BOOLEAN NOT NULL DEFAULT false,
    superseded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. AI CONTRACT & DOCUMENT INTELLIGENCE ANALYSES
CREATE TABLE IF NOT EXISTS public.ai_document_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    document_name TEXT NOT NULL,
    document_type TEXT NOT NULL, -- 'notary_edd', 'bank_agreement', 'supplier_invoice', 'client_id'
    raw_ocr_extracted_text TEXT NOT NULL,
    confidence_score NUMERIC(4,3) NOT NULL,
    entities_detected JSONB NOT NULL DEFAULT '{}'::jsonb, -- notary_name, stamp_checksum, payment_tranche_dzd
    potential_risks_found JSONB NOT NULL DEFAULT '[]'::jsonb, -- contract voids, timing gaps
    validation_status TEXT NOT NULL DEFAULT 'unverified' CHECK (validation_status IN ('unverified', 'partially_verified', 'verified_match_audit', 'fraud_alert')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. EXECUTION FEEDBACK SIGNALS (Human reinforcement training)
CREATE TABLE IF NOT EXISTS public.ai_feedback_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL REFERENCES public.ai_recommendations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback_comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PERFORMANCE TUNING INDEXES FOR COGNITIVE WORKLOADS
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON public.ai_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_rec_status ON public.ai_recommendations(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_audit_vuln ON public.ai_prompt_audits(agency_id) WHERE has_injection_risk = true;
CREATE INDEX IF NOT EXISTS idx_ai_doc_match ON public.ai_document_analyses(agency_id, validation_status);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) TENANT POLICIES
-- =============================================================================
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_context_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_document_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_ai_conversations" ON public.ai_conversations FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_ai_messages" ON public.ai_messages FOR ALL USING (conversation_id IN (SELECT id FROM public.ai_conversations));
CREATE POLICY "tenant_isolation_ai_recommendations" ON public.ai_recommendations FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_ai_action_traces" ON public.ai_action_traces FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_ai_prompt_audits" ON public.ai_prompt_audits FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_ai_context_windows" ON public.ai_context_windows FOR ALL USING (conversation_id IN (SELECT id FROM public.ai_conversations));
CREATE POLICY "tenant_isolation_ai_memory_snapshots" ON public.ai_memory_snapshots FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_ai_risk_flags" ON public.ai_risk_flags FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_ai_document_analyses" ON public.ai_document_analyses FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_ai_feedback_signals" ON public.ai_feedback_signals FOR ALL USING (recommendation_id IN (SELECT id FROM public.ai_recommendations));
