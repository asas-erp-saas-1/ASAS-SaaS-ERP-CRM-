# ASAS Real Estate OS - Enterprise Operational Architecture Plan

This document serves as the master specification and execution plan for transitioning ASAS Real Estate OS from a standard SaaS/CRM into a true Enterprise Operating System for Algerian/North African real estate developers (Promotion Immobilière).

## Phase A: Operational Architecture Specification

### 1. Operational Actors & Departments
- **Direction / CEO**: Strategic oversight, profitability analysis, final approval on high-risk deals.
- **Direction Commerciale**: Manages agents, sets targets, pipeline oversight, SLA enforcement.
- **Agent Commercial**: Executes pipeline (calls, visits, negotiation), handles WhatsApp ops, tracks leads.
- **Finance & Comptabilité**: Manages cashflow, calls for funds (Appels de fonds), deposits, commissions, bank relations.
- **Direction Technique / Projet**: Manages construction phases (Chantiers), timelines, suppliers, subcontractors.
- **SAV (Service Après Vente)**: Delivery of units, defect tracking (Réserves), client satisfaction.

### 2. Core Workflows
- **Acquisition (CRM)**: Lead ingestion -> Qualification -> Visite -> Négociation -> Option (Pre-reservation) -> Réservation.
- **Encaissement (Finance)**: Réservation -> Validation VSP/VFA -> Appels de fonds liés au taux d'avancement -> Paiements échelonnés.
- **Production (Chantier)**: Lancement de phase -> Approvisionnement -> Exécution sous-traitants -> Validation d'avancement (impacts finance).
- **SAV / Livraison**: Notification de fin de travaux -> Remise des clés -> Levée des réserves.

### 3. Algerian Operational Constraints Support
- WhatsApp-first communication is mandatory for commercial workflows.
- "Vente sur Plan" (VSP) regulatory workflow involving Notaries.
- Highly fragmented payment schedules (installments, cheques, cash deposits, bank transfers).
- Delayed bank financing and administrative holdups.
- Manual approvals and paper trails (Bordereaux).

## Phase B: Repository Operational Audit

### Keep & Refactor
- **Auth & Tenants**: Keep existing multi-tenant architecture but enhance with strict RBAC (Role-Based Access Control).
- **Action Inbox (Overview)**: Refactor to be the execution hub for ALL roles.
- **Pipeline Leads/Deals**: Merge conceptually. Leads become the early stage of a unified "Opération" lifecycle.

### Relocate & Merge
- **Clients & Leads**: Merge into a unified "Profil" entity where state dictates if they are a raw prospect, active buyer, or owner.
- **Deals**: Evolve into "Dossiers de Vente" (Sales Folders) tightly coupled with Notary and Finance steps.

### Delete (Or Deprecate)
- Generic vanity charts.
- Unlinked task lists (all tasks must attach to a Deal, Phase, or Client).

## Phase C: Foundation Layer Rebuild
**Objective**: Build the strict governance and history engines.
1. Branch & Team Hierarchy.
2. Unified Activity Timeline (immutable event sourcing for all actions).
3. Document Engine (Vaults attached to Deals/Clients).

## Phase D: CRM & Commercial Operations (Execution)
**Objective**: "What must the agent do today?"
1. Unified Commercial Pipeline (Nouveau -> Visite -> Option -> Réservé).
2. Risk calculations for reservations.
3. SLA timers (momentum alerts).

## Phase E: Finance & Accounting Core
**Objective**: Real cashflow tracking based on Algerian standards.
1. Payment milestone generation based on property construction % (Appels de fonds).
2. Deposit verification and reconciliation.

## Phase F: Promotion & Construction
**Objective**: Tie physical construction to financial billing.
1. Construction Phases.
2. Subcontractor management and incident tracking.

## Phase G: Execution Orchestration
**Objective**: Prevent chaos through systemic rules.
1. Automated escalations for missed payments or stalled deals.
2. Approval workflows for discounts.

## Phase H: Intelligence
**Objective**: Management dashboards.
1. Cashflow projections.
2. Conversion rates and SLA compliance.
