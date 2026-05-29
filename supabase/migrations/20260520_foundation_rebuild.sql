-- =============================================================================
-- PHASE C: FOUNDATION LAYER REBUILD — ENTERPRISE DATABASE ARCHITECTURE
-- =============================================================================

-- =============================================================================
-- 1. PHYSICAL ORGANIZATION LAYER & BRANCH ISOLATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL, -- ALGIERS_HQ, ORAN_02, CONSTANTINE_03
    city TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_branch_code UNIQUE(agency_id, code)
);

CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL, -- COMMERCIAL, FINANCE, LEGAL, CONSTRUCTION, SAV
    manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_dept_branch_code UNIQUE(branch_id, code)
);

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lead_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. FINE-GRAINED ACCESS CONTROLS (RBAC ENHANCED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- crm, commercial, finance, legal, construction, admin
    action VARCHAR(100) NOT NULL, -- leads.read, deals.override, cash.verify, document.approve
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_permission_action UNIQUE(category, action)
);

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- super_owner, branch_general_manager, accountant, branch_cashier, senior_agent, field_agent
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_agency_role_name UNIQUE(agency_id, name)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    scope_level VARCHAR(20) NOT NULL DEFAULT 'self' CHECK (scope_level IN ('self', 'team', 'department', 'branch', 'region', 'global')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE RESTRICT,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT uq_profile_branch_role UNIQUE(profile_id, branch_id, role_id)
);

-- =============================================================================
-- 3. ACCESS SESSIONS, DELEGATIONS & OVERRIDES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.device_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    device_model TEXT,
    os_version TEXT,
    last_known_ip TEXT,
    trust_status VARCHAR(20) NOT NULL DEFAULT 'trusted' CHECK (trust_status IN ('verification_pending', 'trusted', 'blocked')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_profile_device UNIQUE(profile_id, device_fingerprint)
);

CREATE TABLE IF NOT EXISTS public.access_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.device_registrations(id) ON DELETE SET NULL,
    jwt_id TEXT NOT NULL,
    session_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (session_status IN ('active', 'revoked', 'expired')),
    ip_address TEXT,
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    CONSTRAINT uq_session_jwt UNIQUE(jwt_id)
);

CREATE TABLE IF NOT EXISTS public.delegated_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grantor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    grantee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    delegation_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (delegation_status IN ('active', 'expired', 'revoked')),
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.emergency_override_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    authorized_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    justification TEXT NOT NULL,
    override_limit NUMERIC(15,2), -- pricing cap deviation or discount upper bound
    override_status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (override_status IN ('submitted', 'manager_review', 'finance_validation', 'active', 'expired', 'rejected')),
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 4. MILITARY-GRADE SYNDICATED AUDIT VAULT (APPEND-ONLY RECORDING)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sys_audit_vault (
    sequence_id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    correlation_id UUID NOT NULL,
    actor_id UUID NOT NULL REFERENCES public.profiles(id),
    agency_id UUID NOT NULL REFERENCES public.agencies(id),
    branch_id UUID REFERENCES public.branches(id),
    operation_type VARCHAR(50) NOT NULL, -- eg: PRICE_MODIFIED, VISIT_SCHEDULED, USER_ROLE_MUTATED
    entity_type VARCHAR(50) NOT NULL, -- eg: deal, lead, profile, organization
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    request_ip TEXT,
    device_signature TEXT,
    is_anomaly BOOLEAN NOT NULL DEFAULT FALSE
);

-- Protect sys_audit_vault from update or deletion to guarantee forensics
CREATE OR REPLACE FUNCTION public.fn_prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Immutable system entity protection. Mutation of the forensic audit trail is strictly disallowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_immutable_protection
    BEFORE UPDATE OR DELETE ON public.sys_audit_vault
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_mutation();

-- =============================================================================
-- 5. SECURE DOCUMENT ENGINE (REGISTRY, STORAGE REFERENCES, LIFECYCLE STATES)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.document_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- contract, notary_promesse, payment_receipt, plan, identity_proof
    storage_path TEXT NOT NULL, -- secure bucket reference
    file_size INTEGER,
    mime_type TEXT,
    lifecycle_state VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (lifecycle_state IN ('draft', 'uploaded', 'verified', 'approved', 'archived', 'rejected')),
    associated_entity_type VARCHAR(50) NOT NULL, -- deal, lead, project, supplier
    associated_entity_id UUID NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    hash_signature TEXT, -- SHA-256 for integrity verification
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 6. UNIFIED NOTIFICATION & COMMUNICATION LOGS (WHATSAPP RETRY QUEUE)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('client', 'staff', 'external')),
    recipient_id UUID NOT NULL, -- references profile_id or client_id depending on context
    recipient_phone VARCHAR(30) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'sms', 'internal')),
    message_content TEXT NOT NULL,
    whatsapp_template_name TEXT,
    whatsapp_template_variables JSONB,
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'retrying')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    error_message TEXT,
    send_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 7. OPERATIONS TASK ENGINE (STAFF ASSIGNMENTS & ESCALATIONS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.foundation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    task_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (task_status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'overdue', 'escalated')),
    due_date TIMESTAMPTZ,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    associated_entity_type VARCHAR(50), -- eg: deal, lead, payment
    associated_entity_id UUID,
    sla_escalation_marker_hours INTEGER NOT NULL DEFAULT 48,
    escalation_count INTEGER NOT NULL DEFAULT 0,
    escalated_to UUID REFERENCES public.profiles(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 8. PERFORMANCE INDEXES FOR ENTERPRISE SCALING
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_branches_agency ON public.branches(agency_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles ON public.staff_assignments(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_branch_role ON public.staff_assignments(branch_id, role_id);
CREATE INDEX IF NOT EXISTS idx_audit_correlation ON public.sys_audit_vault(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.sys_audit_vault(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.sys_audit_vault(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_document_entity ON public.document_records(associated_entity_type, associated_entity_id);
CREATE INDEX IF NOT EXISTS idx_comm_retry ON public.communication_logs(delivery_status, send_after) WHERE delivery_status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.foundation_tasks(assigned_to, task_status);

-- =============================================================================
-- 9. STANDARDIZED SEED DATA SEEDING (BASIC PERMISSIONS DEFINED)
-- =============================================================================

INSERT INTO public.permissions (category, action, description) VALUES
('crm', 'leads.read', 'Lecture des fiches prospects rattachées au périmètre d''affectation'),
('crm', 'leads.assign', 'Attribution de fiches prospects aux agents commerciaux'),
('crm', 'leads.delete', 'Droits de suppression ou archivage des prospects'),
('commercial', 'deals.create', 'Instanciation d''un brouillon de contrat ou réservation de bien'),
('commercial', 'deals.override', 'Modification du prix de vente catalogue ou de l''échéancier réglementaire'),
('commercial', 'documents.lock', 'Verrouillage des pièces d''identité et actes chez le notaire'),
('finance', 'cash.receipt', 'Saisie d''un encaissement et génération d''un bon de caisse physique'),
('finance', 'cash.verify', 'Clôture journalière de la caisse et validation des écarts physiques'),
('finance', 'ledger.write', 'Validation et écriture de journaux comptables d''achats/ventes'),
('finance', 'ledger.close', 'Verrouillage définitif des périodes fiscales et immutabilité historique'),
('construction', 'milestone.sign', 'Signature technique d''achèvement de phase chantier déclenchant les appels de fonds')
ON CONFLICT (category, action) DO NOTHING;
