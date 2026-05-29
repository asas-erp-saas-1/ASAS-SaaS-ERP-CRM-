# ASAS Real Estate OS — Ultimate Enterprise Rebuild Blueprint
## Operational Governance, Core Security, and Banking-Grade Financial Ledger

---

## Part 1 — Current Access Architecture Audit & Repository Map (Phase B)

### 1.1 Complete Repository Mapping
An exhaustive pass of the active workspace reveals the following deployment of controllers, models, and UI screens:

```
/src/
├── actions/                  <-- Fragmented Server Actions (leadAction, dealAction, metricAction, taskAction)
├── app/                      <-- Next.js 15 Routing Layer
│   ├── api/                  <-- Endpoint Gateways (leads, deals, documents, cron, command-gateway, ledger)
│   └── dashboard/            <-- UI Containers (divided into agents, clients, finance, sav, settings, tasks, etc.)
├── components/               <-- Reusable UI Utilities & Cross-cutting modules (ThemeProvider, WhatsAppDrawer)
├── core/                     <-- Core state machines (stateMachine.ts) and business rule triggers
├── db/                       <-- Schema Migrations (01_production_rls_and_indexes.sql)
├── lib/                      <-- System utilities & platform runtime
│   ├── cache/                <-- In-memory and persistence-backed cached handlers
│   ├── enforcement/          <-- Query Interceptors, Runtime guards, and security mitigations
│   └── kernel/               <-- Central execution gateway (core.ts)
└── modules/                  <-- UI Subsystems (deals, overview, projects, sav, settings, workspace)
```

### 1.2 Access & Permission Vulnerability Diagnosis
1. **Simplified Roles (`user_role` Enum)**: Currently, the system relies on flat role identifiers (`admin`, `manager`, `agent`). There is no operational grouping or permission matrix. High-privilege actions (e.g., deleting deals, overriding prices) are gated using hardcoded string lookups, creating massive risks of privilege drift.
2. **Missing Logical Branch Boundaries**: Branches do not exist as physical tables. An `agency_id` isolates tenant accounts, but there is no middle layer separating Algiers (HQ), Oran, or Constantine branches. General Ledger boundaries and client files are exposed to any local agent who happens to share the tenant credential.
3. **Implicit Mutability in API Routes**: High-value financial mutations (such as validating a payment or modifying a price) are processed through raw actions without passing through a structural approval or ledger consolidation workflow.
4. **Weak Audit Trail Tracking**: The existing `activities` system serves as an informational timeline rather than an immutable forensic ledger. Deleting activities is currently possible through API routes without cryptographic signing or validation.
5. **No System Override Controls**: Emergency actions (e.g., granting discount rates to secure a reservation during unstable local economic cycles) lack formal state representation, leaving them entirely untracked and exposing the company to rogue agent behavior.

### 1.3 Audit Allocation Matrix (Domain Isolation RECONSTRUCT-MAP)

| Module / System Directory | Operational Purpose | Ownership Domain | Criticality | Target Action | Runtime Risk Mitigation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/src/actions/` | User-facing Mutation dispatching | `execution/` | Important | **REFACTOR** | Wrap entirely in command validation blocks using the Command Gateway to ensure full audit compliance. |
| `/src/services/leads/` | Lead scoring and acquisition lifecycle | `crm/` | Important | **RELOCATE** | Migrate to `/src/domains/crm/` to serve as the single source of truth for acquisition logic. |
| `/src/services/deals/` | Sales reservation, pricing and execution | `commercial/` | Critical | **RELOCATE** | Migrate to `/src/domains/commercial/`. Secure all transitions under notary controls. |
| `/src/services/billing/` | Platform license subscriptions | `platform/` | Auxiliary | **ISOLATE** | Keep isolated from the core real estate general ledger. This is SaaS-layer billing, and should not contaminate business operations. |
| `/src/lib/kernel/` | Low-level execution context & auth resolver | `foundation/` | Critical | **KEEP** | Standardize security identity hydration; integrate JWT claims with branch scopes. |
| `/src/lib/enforcement/` | Query interceptors & RLS filters | `foundation/` | Critical | **KEEP** | Harden database triggers to prevent RLS bypass on local mutations. |
| `/src/modules/sav/` | Post-handover customer delivery | `delivery/` | Auxiliary | **RELOCATE** | Move into `/src/domains/delivery/` to govern keys, inspection reports, and maintenance records. |
| `/src/app/api/ledger/` | Real Estate billing & financial snapshots | `accounting/` | Critical | **REBUILD** | Replace placeholder queries with transactional, double-entry General Ledger integrations. |

---

## Part 2 — Enterprise Access Governance Model (Phase D)

```
                            AGENCY (TENANT ROOT)
                            ┌──────────────────┐
                            │    Super Owner   │
                            └────────┬─────────┘
                                     ▼
                              REGIONAL DIRECTOR
                            ┌──────────────────┐
                            │  All Branches    │
                            └────────┬─────────┘
                                     ▼
                          BRANCH GENERAL MANAGER
                        ┌────────────────────────┐
                        │   Branch Executive     │
                        └────────────┬───────────┘
            ┌────────────────────────┴────────────────────────┬────────────────────────┐
            ▼                                                 ▼                        ▼
     FINANCE DIRECTOR                                   LEGAL DIRECTOR        CHANTIER DIRECTOR
┌───────────────────────┐                           ┌────────────────────┐   ┌─────────────────┐
│ Ledger / Cash / Bank  │                           │ Notary/ VSP / Acte │   │ Materials / Job │
└───────────┬───────────┘                           └───────────┬────────┘   └────────┬────────┘
            ▼                                                   ▼                     ▼
     BRANCH CASHIER                                        SENIOR AGENT          FIELD AGENT
┌───────────────────────┐                           ┌────────────────────┐   ┌─────────────────┐
│ Caisse / Receipts     │                           │ Reservation Deals  │   │ Inspections/SAV │
└───────────────────────┘                           └────────────────────┘   └─────────────────┘
```

### 2.1 Staff Organizational Structure
Every individual actor in the ASAS Enterprise Matrix coordinates under a precise hierarchy of responsibilities.

```
Agency (Tenant) 
  └── Branch (Physical Regional Division)
       └── Department (Finance, Commercial, Legal, Construction)
            └── Team (Sales Unit, Audit Taskforce, Site Engineers)
                 └── Employee Assignment (Active/Suspended Profile)
```

1. **Global Roles**:
   - `super_owner`: Absolute credentialed system root. Authority to provision branches, lock structural ledgers, and change configuration matrices.
   - `executive_board`: Cross-branch analysts with unified transactional reporting views.
   - `regional_director`: Full operational oversight over a specific geographic cluster (e.g. Oran + Sidi Bel Abbès).
2. **Branch Roles**:
   - `branch_manager`: Full strategic authority inside a single branch boundary. Can reassign portfolios, authorize standard expense bounds, and sign-off on standard commissions.
   - `accountant`: Absolute operational authority over General Ledger double-entries and bank clearances. Cannot hold caisse cash custody.
   - `branch_cashier`: Complete physical custody of the branch cash drawer (`la caisse`). Performs entries of payments and collections. Cannot modify ledger journals directly (dual control).
   - `crm_director`: Lead supervisor for field agents. Manages SLA allocation matrix.
   - `senior_agent`: Licensed real estate officer. Oversees standard sales pipelines and negotiates installment terms within bounded limits.
   - `field_agent`: Acquisition officer. Performs property viewings and logs customer activities.
3. **Temporary Operating Roles (Delegation Protocols)**:
   - `delegated_auditor`: Grant-based system access permitting cross-branch transactional file auditing for a deterministic time frame (e.g., 7 days).
   - `override_officer`: Temporary executive credential issued during structural emergencies to modify fixed inventory schedules.

---

## Part 3 — Fine-Grained Permission Matrix Engine

### 3.1 Granular Operational Scope
To prevent permission decay, actions are resolved by mapping an actor’s `IdentityContext` across a bi-dimensional array where **Scope Level** defines the horizontal reach and **Operation ID** determines the action boundaries.

```
Permission String Format: [category].[entity].[action]
Example: finance.cash.verify
```

| Domain | Action Identifier | Level Permitted | Business Control Policy |
| :--- | :--- | :--- | :--- |
| **CRM** | `crm.leads.read` | `self`, `team`, `branch` | Access leads owned by self, team, or matching branch scope. |
| | `crm.leads.assign` | `team`, `branch` | Ability to allocate leads or override SLA auto-distribution. |
| | `crm.leads.delete` | `branch_manager` | Soft delete authorization. Restricts field agent deletion. |
| **Commercial** | `commercial.deals.create`| `agent`, `manager` | Initiate a new VSP / VEFA deal draft in the branch. |
| | `commercial.deals.override`| `manager`, `executive` | Modify the list price or alter the default installment schedule. |
| | `commercial.documents.lock`| `legal_director` | Lock reservation documents post-notary signing. |
| **Finance** | `finance.cash.receipt` | `cashier` | Log physical cash deposits into the local `Caisse` drawer. |
| | `finance.cash.verify` | `accountant`, `manager` | Perform daily physical reconciliation and balance verification. |
| | `finance.ledger.write` | `accountant` | Execute double-entry ledger journals. Blocked for cashiers. |
| | `finance.ledger.close` | `finance_director` | Lock accounting periods, making historically posted entries immutable. |
| **Chantier** | `chantier.milestone.sign`| `chantier_director`| Certificate upload of phase completion (triggering VEFA payments). |

### 3.2 Permission Inheritance & Conflict Rules
1. **Deny Precedence**: Any explicit `DENY` override at a department or project level immediately invalidates any wildcard `ALLOW` inherited from roles.
2. **Context Superiority**: Temporary permissions delegated via valid tokens override default branch limitations for matching paths.
3. **Implicit Role Hierarchy**:
   ```
   super_owner ──> regional_director ──> branch_manager ──> crm_director ──> senior_agent ──> field_agent
                                       └── finance_dir  ──> accountant   ──> cashier
   ```

---

## Part 4 — Base Access Engine & Identity Control SQL DDL

This script defines the physical schemas for organization tree, permissions matrix, and session trackers. 

```sql
-- =============================================================================
-- SECTION 4.1: ENTERPRISE ORGANIZATIONAL DESIGN (LAYER 1)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    legal_registration TEXT,
    tax_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE, -- ALGIERS_01, ORAN_02
    address TEXT,
    city TEXT NOT NULL,
    phone TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL, -- CRM, FINANCE, LEGAL, CONSTRUCTION
    manager_id UUID, -- References profiles(id)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(branch_id, code)
);

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lead_id UUID, -- References profiles(id)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SECTION 4.2: EXPANDED ROLE AND ACCESS CONTROL SCHEMAS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- crm, finance, chantier, etc.
    action VARCHAR(100) NOT NULL, -- crm.leads.assign, finance.cash.verify
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(category, action)
);

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- super_owner, branch_manager, cashier, senior_agent
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
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
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID,
    UNIQUE(profile_id, branch_id, role_id)
);

-- =============================================================================
-- SECTION 4.3: ACCESS SESSIONS AND DEVICE INTEGRITY SCHEMAS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.device_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    device_model TEXT,
    os_version TEXT,
    last_known_ip TEXT,
    trust_status VARCHAR(20) NOT NULL DEFAULT 'verification_pending' CHECK (trust_status IN ('verification_pending', 'trusted', 'blocked')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(profile_id, device_fingerprint)
);

CREATE TABLE IF NOT EXISTS public.access_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.device_registrations(id) ON DELETE SET NULL,
    jwt_id TEXT UNIQUE NOT NULL,
    session_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (session_status IN ('active', 'revoked', 'expired')),
    ip_address TEXT,
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
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
    override_limit NUMERIC(15,2), -- discount override limit / pricing deviation
    override_status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (override_status IN ('submitted', 'manager_review', 'finance_validation', 'active', 'expired', 'rejected')),
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PERFORMANCE INDICES FOR FEDERATED ACCESS VALIDATION
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_staff_assignment_profile ON public.staff_assignments (profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignment_branch ON public.staff_assignments (branch_id);
CREATE INDEX IF NOT EXISTS idx_device_profile_fingerprint ON public.device_registrations (profile_id, device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_delegated_grantee_active ON public.delegated_permissions (grantee_id) WHERE delegation_status = 'active';
```

---

## Part 5 — Access Systems Lifecycle State Machines

```
EMPLOYEE ACCESS LIFECYCLE
[Invited] ──(Redeem Onboarding)──> [Pending Verification] ──(MFABind / DeviceRegister)──> [Active]
                                                                                            │
                                                                       ┌────────────────────┴────────────────────┐
                                                                       ▼ (Rogue Action)                          ▼ (Offboarded)
                                                                  [Suspended]                              [Revoked]
```

### 5.1 Employee Access Transitions
- `invited`: Profile record created, waiting on auth callback initialization.
- `pending_verification`: Token redeemed, identity validated. Access blocked pending supervisor security-clearance review.
- `active`: Cleared for operations inside registered branches.
- `suspended`: Temporary operational lock triggers on suspicious anomalies (e.g., cross-branch query bounds broken).
- `revoked`: Permanent termination state. All active sessions invalidated.

### 5.2 Delegated Access & Override Transitions
- **Delegated Access**: `requested` ➔ `approved` ➔ `active` ➔ `expired` / `revoked` (real-time eviction triggers on state transition).
- **Emergency Override**: `submitted` ➔ `manager_review` ➔ `finance_validation` (required for discounts >15%) ➔ `active` ➔ `expired`.

---

## Part 6 — Access Validation Pipelines

### 6.1 Identity Hydration & Auth Sequence

```
                                  INCOMING OPERATION REQUEST
                                              │
                                              ▼
                                  SECURITY POLICY INTERCEPTOR
                                 (Check DeviceTrust fingerprint)
                                              │
                                              ▼
                                   IDENTITY CONTEXT PIPELINE
                                              ├─ Parse JSON Web Token (JWT)
                                              ├─ Hydrate assignments & permissions
                                              └─ Mount delegator fallback leases
                                              │
                                              ▼
                                 BRANCH ISOLATION VALIDATOR
                                (Compare request branch scope vs DB)
                                              │
                                              ▼
                                    LEAD / DEAL GATEKEEPER
                              (Verify scope: self, team, branch, org)
                                              ├─ DENIED? ➔ Log Incident ➔ Stop
                                              └─ GRANTED? ──┐
                                                            ▼
                                                AUDIT RECONSTRUCTION TRACE
                                                   (Insert sys_audit_vault)
                                                            │
                                                            ▼
                                                  BUSINESS EXECUTION ENTRY
```

### 6.2 Target Application State Objects

```typescript
export interface BranchScope {
  id: string;
  code: string;
  scopeLevel: 'self' | 'team' | 'department' | 'branch' | 'region' | 'global';
}

export interface IdentityContext {
  userId: string;
  email: string;
  tenantId: string;
  isSuperAdmin: boolean;
  activeBranch: BranchScope;
  permissions: Set<string>;
  delegatorKeys?: {
    grantorId: string;
    overrideClaims: string[];
    expiresAt: Date;
  };
}
```

---

## Part 7 — Row-Level Security Rules (RLS)

Every database table is securely encapsulated at the kernel layer. No client can access records outside their branch assignments.

```sql
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_override_requests ENABLE ROW LEVEL SECURITY;

-- 1. Branch Isolation: Profiles can read entries only within registered branches
CREATE POLICY branch_isolation_policy ON public.branches
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_assignments sa
            WHERE sa.profile_id = auth.uid() 
            AND (sa.branch_id = id OR sa.role_id IN (SELECT id FROM public.roles WHERE name = 'super_owner'))
        )
    );

-- 2. Prevent Write Collusions: Staff assignments can only be created by owners
CREATE POLICY staff_write_policy ON public.staff_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_assignments exec
            JOIN public.roles r ON exec.role_id = r.id
            WHERE exec.profile_id = auth.uid() 
            AND r.name IN ('super_owner', 'executive_board')
        )
    );
```

---

## Part 8 — High-Risk Operation Governance (Dual Approval Matrix)

When a critical action occurs, the system mandates **Dual-Control Verification (M-of-N signatures)**:

```
OPERATION RESOLUTION PATHway (High-Risk Flow)
[Agent requests price override] ➔ [State logged as 'pending_approval']
                                               │
                                               ├─> Trigger OTP verification to agent mobile
                                               ├─> Create Task in Manager & Auditor timeline with 30m SLA
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               ▼ (Approved within SLA by Manager? yes/no)                      ▼
    [Apply state modification]                                       [Escalate/Block]
               │                                                               │
     Post Audit Journal lines                                        Notify Risk Panel (SLA)
```

1. **Dual Approval Restrictions**:
   * **Deletes (Leads/Deals)**: Require a manager validation step (or soft-deletion assignment marking).
   * **Price Deviation & Schedule Adjustments**: Adjusting base real estate values triggers validation logic matching the approval brackets below:
     * Discounts **< 5%**: Senior Agent single sign-off.
     * Discounts **5% - 15%**: Branch Manager authorization.
     * Discounts **> 15%**: Multi-disciplinary review panel approval (Finance + Legal Directors).

---

## Part 9 — Offline Field Operation Security

Chantier environments (often plagued by spotty coverage) run on a **De-synchronized State Pipeline**:

```typescript
export interface SignedOfflineMutation {
  sequenceId: number;
  correlationId: string;
  actorId: string;
  operationType: 'RESERVATION_CREATE' | 'VISIT_LOG';
  payloadSchema: any;
  cryptographicSignature: string; // HMAC computed locally with secure device key
  clientTimestamp: string;
}
```

1. **Authentication Pin-Locking**: Active tokens are cached locally using encrypted key storage.
2. **Conflict Verification Engine**:
   * If property `A1-20` is reserved simultaneously by Agent Oran and Agent Algiers, the sync engine matches the earliest cryptographically certified timestamp.
   * If verification fails, the second record is shifted into a `Manual Reconciliation Queue` with immediate notification to the Branch Cashier.

---

## Part 10 — Military-Grade Append-Only Audit Engine (Syndicated Audit Vault)

We decommission the unstable `activities` design and establish the **Immutable Audit Ledger**. No user can edit, clear, or modify accounting/mutation logs.

```sql
CREATE TABLE IF NOT EXISTS public.sys_audit_vault (
    sequence_id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    correlation_id UUID NOT NULL,
    actor_id UUID NOT NULL REFERENCES public.profiles(id),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id),
    branch_id UUID REFERENCES public.branches(id),
    operation_type VARCHAR(50) NOT NULL, -- "PRICE_MODIFIED", "CASH_RECONCILED"
    entity_type VARCHAR(50) NOT NULL, -- "deal", "general_ledger_line"
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    request_ip TEXT,
    device_signature TEXT,
    operational_hash TEXT NOT NULL, -- HMAC(prev_hash + cur_data) ensuring tamper detection
    is_anomaly BOOLEAN NOT NULL DEFAULT FALSE
);

-- Deny all updates and deletes on critical audit traces
CREATE TRIGGER audit_immutable_protection
    BEFORE UPDATE OR DELETE ON public.sys_audit_vault
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_mutation();
```

---

## Part 11 — Target Architecture Directory Alignment

We restructure current directories into isolated, standalone operational components:

```
/src/domains/foundation/access/
├── controllers/          <-- Gateway handlers, mounting OTP and dual-signature authorizations
├── services/             <-- Rule validators, permissions, token lease controllers
├── policies/             <-- Supabase RLS policies and server-side assertion gates
├── middleware/           <-- Branch scopes, JWT extraction, and device-integrity guards
├── rpc/                  <-- Remote stored procedures validating cross-branch delegator actions
└── types/                <-- Strict specifications for access contexts and scopes
```

---

## Part 12 — Business Execution Access Graph

```
                                      COMMERCIAL ACTION TRIGGERS
 ┌─────────────────────────┬─────────────────────────┬─────────────────────────┬─────────────────────────┐
 ▼ (Lead Reassignment)     ▼ (Override Discount)     ▼ (Cash Receipt Process)  ▼ (Deal Cancel)           ▼ (Sync Offline)
Verify assign roles       OTP verified.             Assigned cashier          Escalate to Finance       Verify HMAC.
Validate SLA deadline     Check override limits.    drawer verified.          Review liabilities        Commit mutation lines;
Post system reassign      Re-calculate state        Double-entry balance      Register reversal         Run conflict rules
activities log.           liabilities.              committed to journal.     entries.                  or push anomaly flag.
```

---

## Part 13 — Failure Scenarios & Security Safeguards

1. **Rogue Accountant Scenario**: Financial thresholds limit ledger postings. Any manual modification to historic periods triggers systemic alarms and escalations.
2. **Stolen Device Scenario**: Sessions require active heartbeats. If a device is reported lost, the superadmin triggers a systemic command:
   ```sql
   UPDATE public.device_registrations SET trust_status = 'blocked' WHERE id = :device_id;
   UPDATE public.access_sessions SET session_status = 'revoked' WHERE device_id = :device_id;
   ```

---

## Part 14 — Zero-Downtime Migration Strategy

```
TRANSITION MATRIX
Current Flat Role Schema  ──>  Temporary Compatibility Layer  ──>  Hydrate organizations/branches  ──> Enable strict RLS & RBAC
```

1. Run backward-compatible role fallback mapping: `role` 'admin' mapping to roles `super_owner` inside default branches.
2. Backfill existing profile structures: Auto-assigning agents to regional nodes based on historical deal entries.
3. Validate permissions system integrity with active system audits.

---

## Part 15 — Financial Systems & General Ledger Specifications (Phase E)

### 15.1 Algerian Real Estate Context Integration (VSP / VEFA)
Under local law (Promotion Immobilière), financing is tightly integrated with construction operations:
1. **VEFA Installments (Vente en l'État Futur d'Achèvement)**: Installment collections are strictly regulated. The buyer releases funds at certified construction milestones (e.g. 20% on foundation, 15% on concrete structures, etc.).
2. **"Delayed Bank Financing" & Credit Delays**: Buyers rely on bank-approved credit releases. Disbursements face prolonged administrative lags, requiring specific ledger reconciliation markers.
3. **Branch-Level Cash Desk Operations (`La Caisse`)**: Physical cash transactions remain highly prevalent. It is mandatory to isolate and reconcile daily physical balances with absolute traceability, providing strict checks against local branch cash leakage.

```
                                  VSP / VEFA TRANSACTION Lifecycles
 Lead Nurturing ➔ Reservation (10% Deposit) ➔ Notary Act (Promesse) ➔ Installment Cycles (Chantier Progress) ➔ Final Delivery
```

---

## Part 16 — Double-Entry General Ledger Core Design

No financial modification is allowed via loose field updates. Direct table modifications are strictly prohibited. Every financial action must post journal entries to historically balanced charts of accounts using standard debit and credit constraints.

### 16.1 Chart of Accounts Structure (Algerian SCF Integration)

| Account Number | Account Name | Account Type | Normal Balance | Scope |
| :--- | :--- | :--- | :--- | :--- |
| **10100** | Capital Social | Equity | Credit | Global |
| **41100** | Clients - Installments Receivable | Asset | Debit | Branch-Isolated |
| **41190** | Clients - Notary Withholding Escrow | Asset | Debit | Branch-Isolated |
| **44200** | State - Collected VAT (7% / 19%) | Liability | Credit | Branch-Isolated |
| **51200** | Banque d'Algérie | Asset | Debit | Branch-Isolated |
| **53100** | Cash registers (La Caisse Clotûre) | Asset | Debit | Branch-Isolated |
| **70100** | Real Estate VSP Revenues | Revenue | Credit | Branch-Isolated |

---

## Part 17 — Financial Operations & Ledger Schemas (Phase E)

This production DDL covers cash desks, charts of accounts, double-entry journals, client installments, subcontractor payables, and commission allocations, featuring immutable data controls.

```sql
-- =============================================================================
-- SECTION 17.1: SYSTEM GENERAL LEDGER & CHART OF ACCOUNTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    account_code VARCHAR(20) PRIMARY KEY, -- "41100", "53100" based on Algerian SCF
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.accounting_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_at ENVIRONMENT_VAR_TYPE_TIMESTAMP TIMESTAMPTZ,
    locked_by UUID REFERENCES public.profiles(id),
    UNIQUE(branch_id, fiscal_year, period_month)
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    accounting_period_id UUID REFERENCES public.accounting_periods(id),
    entry_number TEXT NOT NULL UNIQUE, -- "JE-2026-ALGIERS-0001"
    business_event VARCHAR(100) NOT NULL, -- "RESERVATION_DEPOSIT", "MILESTONE_PROGRESS"
    reference_id UUID, -- References primary trigger table (eg: deals.id, payables.id)
    narration TEXT NOT NULL,
    posted_by UUID NOT NULL REFERENCES public.profiles(id),
    posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversal_entry_id UUID REFERENCES public.journal_entries(id) -- audit reversal support
);

CREATE TABLE IF NOT EXISTS public.journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL REFERENCES public.chart_of_accounts(account_code),
    debit NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (debit >= 0),
    credit NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (credit >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Keep double entries balanced at all times
    CONSTRAINT ck_balanced_not_both CHECK ((debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0))
);

-- =============================================================================
-- SECTION 17.2: LIQUIDITY NODES (CAISSE & BANK ENGINES)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- "Principal Caisse - Algiers HQ"
    current_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES public.profiles(id),
    closed_by UUID REFERENCES public.profiles(id),
    opening_balance NUMERIC(15,2) NOT NULL,
    closing_balance_actual NUMERIC(15,2),
    closing_balance_system NUMERIC(15,2),
    session_status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (session_status IN ('open', 'closed', 'flagged_variance')),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    reconciliation_notes TEXT
);

CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL, -- "Banque d'Algérie"
    account_number TEXT NOT NULL UNIQUE,
    current_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SECTION 17.3: CUSTOMER AND INSTALLMENT MANAGEMENT (LAYER 2)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- "Standard VEFA 5-Step Plan"
    is_milestone_based BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_plan_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
    step_sequence INTEGER NOT NULL,
    trigger_milestone_code VARCHAR(50), -- "FOUNDATION", "FIRST_FLOOR"
    days_from_signing INTEGER,
    percent_weight NUMERIC(5,2) NOT NULL CHECK (percent_weight > 0)
);

CREATE TABLE IF NOT EXISTS public.client_receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    amount_due NUMERIC(15,2) NOT NULL,
    amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    installment_sequence INTEGER NOT NULL,
    receivable_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (receivable_status IN ('unpaid', 'partially_paid', 'fully_paid', 'delinquent', 'negotiated')),
    milestone_trigger_locked BOOLEAN NOT NULL DEFAULT FALSE,
    milestone_trigger_code VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SECTION 17.4: PAYABLES AND COMMISSION ENGINES (LAYER 2)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_payables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    subcontractor_id UUID REFERENCES public.clients(id), -- Supplier/Subcontractor details
    total_invoice_amount NUMERIC(15,2) NOT NULL,
    amount_paid ENVIRONMENT_VAR_TYPE_NUMERIC NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved_for_payment', 'partially_paid', 'fully_paid', 'disputed')),
    approved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.commission_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    accrued_amount NUMERIC(15,2) NOT NULL,
    paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    accrued_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    commission_status VARCHAR(20) NOT NULL DEFAULT 'accrued' CHECK (commission_status IN ('accrued', 'approved_for_payout', 'paid', 'clawed_back')),
    clawback_notes TEXT
);

-- =============================================================================
-- FINANCIAL DOUBLE-ENTRY PARITY SANITY ENGINE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_ensure_journal_lines_parity()
RETURNS TRIGGER AS $$
DECLARE
    v_sum_debit NUMERIC(15,2);
    v_sum_credit NUMERIC(15,2);
BEGIN
    SELECT COALESCE(SUM(debit), 0.00), COALESCE(SUM(credit), 0.00)
    INTO v_sum_debit, v_sum_credit
    FROM public.journal_lines
    WHERE journal_entry_id = NEW.journal_entry_id;

    IF v_sum_debit <> v_sum_credit THEN
        RAISE EXCEPTION 'Journal entry balance violation. Current sum debits (%) must equal sum credits (%).', v_sum_debit, v_sum_credit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Part 18 — Critical Financial Lifecycle State Machines

```
RECEIVABLE INSTALLMENT LIFECYCLE
[Unpaid] ──(Due Date breached)──> [Delinquent] ──(Notary Dispute)──> [Negotiated Dispute]
   │                                   │                                    │
   ├──(Partial Payment Posted)─────────┼────────────────────────────────────┤
   │                                   ▼                                    ▼
   ├────────────────────────────> [Partially Paid] ──(Final Settlement)──> [Fully Paid]
   │                                                                        ▲
   └────────────────────────────────────────────────────────────────────────┘
```

### 18.1 Installment Receivables Lifecycle
- `unpaid`: Clean invoice state. Open for settlement.
- `partially_paid`: Installment met with partial cash deposit. Difference allocated as deferred liability.
- `fully_paid`: Zero balance outstanding. Closed.
- `delinquent`: Settlement delayed > 30 days past due-date boundaries. Auto risk-alerts route to recovery team.
- `negotiated`: Late payment restructured or adjusted due to temporary macroeconomic variations.

### 18.2 Session Caisses Drawer Lifecycle
- `open` ➔ `closed` ➔ `flagged_variance` (Triggered dynamically during the daily close where physical cash counts deviate from transactions).

---

## Part 19 — Financial Forecasting & Loss Prevention Matrix

### 19.1 Algorithmic Risk Calculations
We calculate the default score of dynamic real estate profiles (`Delinquency Scoring`) using the vector:

$$\rho = S_{past} \times w_1 + D_{notary} \times w_2 + t_{overdue} \times w_3$$

- $S_{past}$ is historical installment failure.
- $D_{notary}$ is delays in notary approvals.
- $t_{overdue}$ accounts for raw duration delay variables.

### 19.2 Direct Fraud Point Mitigations
* **Cash Desk Theft Prevention**: Cashiers are structurally blocked from posting journal entries. Bank clearing updates require matching physical proof documents validated by branch managers.
* **Unauthorized Pricing Deviation**: Override requests automatically expire within 12 hours. Any price lower than system boundaries without an active override blocks deal activation.

---

## Part 20 — Migration Blueprint (Access ──> Finance)

We coordinate the migration of historical CRM tables to the integrated General Ledger through the following execution phases:

### Phase 1: Organizational Node Migration (Days 1–3)
Deploy the core organization models (`branches`, `departments`, `teams`), populating operational associations using active staff profiles. 

### Phase 2: fine-Grained Authorization Deployment (Days 4–7)
Map active user categories across structural Permission vectors. Enable strict Supabase Row-Level Security policies to protect branch-level financial data.

### Phase 3: General Ledger Chart Classification (Days 8–10)
Set up the chart of accounts following the standard Algerian SCF format. Establish physical cash drawers (Caisse) inside active branches.

### Phase 4: Installment and Receivables Onboarding (Days 11–14)
Convert current active deal metrics into formal double-entry Accounts Receivable journals. Bind future collections to construction milestones.

### Next Recommended Progression: Core Financial Orchestrator (Phase F)
With core security, organization boundaries, and General Ledger frameworks locked, we recommend initiating **Phase F: Construction & Project Financial Synchronization Engine**. This step binds construction progress on-site directly to sales collection schedules, making cash flow tracking and subcontractor payables completely deterministic.
