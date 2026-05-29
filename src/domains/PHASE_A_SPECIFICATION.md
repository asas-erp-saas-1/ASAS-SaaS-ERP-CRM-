# ASAS REAL ESTATE OS — PHASE A OPERATIONAL SPECIFICATION
## SYSTEM DEMONS, WORKFLOWS, AND ALGERIAN REAL ESTATE REALITY

This specification serves as the absolute blueprint and operational source of truth for the ASAS Real Estate Enterprise Operating System. It defines human actors, specific state-transition pipelines, accounting double-entry impacts, multi-tenant boundaries, and Algerian fiscal and financial realities.

---

## 1. OPERATIONAL ACTORS, DEPARTMENTS, & HIERARCHIES

The organization is structured across five specific departments, with isolated visibility and granular role assignments to enforce internal accountability.

### Departments and Functional Hierarchy
1.  **Bureau du CEO (Executive Board)**:
    *   *Actor*: `executive_board`, `regional_director`
    *   *Permissions*: Unrestricted organizational access. Can override credit limits and bypass notary verification checkpoints.
2.  **Direction Administrative & Juridique (Legal & Compliance)**:
    *   *Actor*: `notary_controller`, `compliance_guardian`
    *   *Permissions*: Accesses reservation documentation, state notary descriptors (EDD), and manages legal dispute states.
3.  **Direction Commerciale (Sales & Rent)**:
    *   *Actor*: `commercial_director`, `branch_manager`, `sales_agent`
    *   *Permissions*: Restricted to assigned branches. Manages leads, logs physical onsite visits, and registers temporary reservations.
4.  **Direction Financière & Comptabilité (Finance & Treasury)**:
    *   *Actor*: `finance_director`, `treasury_controller`
    *   *Permissions*: Accesses the double-entry general ledger, authorizes material purchases, controls cash caisses, and tracks payments.
5.  **Direction Technique & Chantiers (Construction Division)**:
    *   *Actor*: `chantier_director`, `conducteur_de_chantier`
    *   *Permissions*: Manages digital twin property matrices, registers raw material receipts, and signs milestone progression.

---

## 2. LIFE-CYCLE STATES, TRANSITIONS, & STATE MACHINES

### A. Lead and Customer Lifecycle (CRM)
```
[Nouveau Lead] ──► [Visite Effectuée] ──► [Option Sélectionnée] ──► [Réservation Soumise] ──► [Contrôle Juridique Validé]
```
*   `nouveau`: Newly registered contact. Must be assigned within **4 hours** (SLA rule).
*   `visite`: Logged physical site visit. Critical to confirm buyer seriousness.
*   `option`: Selection of a digital twin unit (Bloc, Floor, F3/F4 type). Reserved for **72 hours** maximum.
*   `reservation`: Signature of the initial paper reservation form. Restricts unit from external sales.
*   `juridique`: Validation of preliminary bank credits (CNEP/BADR) and notary contracts.

### B. construction Lifecycle (Digital Twin Progress)
```
[Gros Œuvre] ──► [Ferraillage] ──► [Coulage de Dalle] ──► [Second Œuvre] ──► [Finitions/SAV] ──► [Livré]
```
1.  **Ferraillage status checks**: Must be signed off by the CTC (Contrôle Technique) inspector before proceeding.
2.  **Coulage de Dalle**: Validation of this physical state triggers an automated **15% installment call** (Appel de Fonds) to all associated buyers.
3.  **Finitions/SAV**: Unit inspection checklist completed. Triggers ready-for-delivery notification.

---

## 3. ALGERIAN BUSINESS CONSTRAINTS & WORKFLOWS

Operating a real estate development in Algeria requires handling high-inflation environment variables, delayed bank financing, and informal communication channels.

### A. The Notary Leg-Lock (EDD & Acte de Vente)
*   **The Bottleneck**: Buyers cannot secure CNEP/BADR banking releases until the Notary officially registers the **État Descriptif de Division (EDD)**.
*   **The OS Strategy**: The system models an explicit `edd_pending` state, restricting cash flow forecasts from declaring these funds as "liquid" within 60 days.

### B. Digital-first WhatsApp Communication
*   **The Reality**: Informality is standard; paper mail is ignored.
*   **The OS Strategy**: Relances (reminders) are prioritized through WhatsApp API logs. An unresponsive read-receipt status for 7 days triggers an automatic escalation to the legal department.

### C. Cash-Heavy Treasury
*   **The Reality**: Multi-million Dinar cash payments at the local desk (caisse) are common.
*   **The OS Strategy**: Strong internal audit trail requiring a physical printed receipt showing a timestamp, unique serial index, and manual cashier authorization entry.

---

## 4. EXECUTIVE DECISION GRAPH & ESCALATIONS

```
[Réserve de Trésorerie < 45 jours]
               │
               ▼
 [Calculer tranche acquéreurs bloqués] ──► [Alerte critique émise au CFO]
               │
               ▼
 [Générer campagne de relance WhatsApp & arbitrage direct du notaire]
```

This ensures that administrative issues at the notary's office do not stall the entire material supply chain.
