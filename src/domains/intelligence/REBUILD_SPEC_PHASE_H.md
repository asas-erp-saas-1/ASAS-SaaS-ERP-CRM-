# ASAS REAL ESTATE OS — SYSTEM SPECIFICATION DIRECTIVE: PHASE H
## DECISION INTELLIGENCE, FORECASTING & EXECUTIVE OPERATIONS CORE

This system architecture blueprint details the technical design and operational specifications for Phase H: **Decision Intelligence & Mathematical Operational Forecasting**. This layer consumes foundational ledgers, digital twins, physical construction progress, and SLA orchestration buses to synthesize deterministic predictions, financial stress triggers, and automated recommendations for real-estate executive board members.

---

## PART 1 — CURRENT DATA & OPERATIONAL INTELLIGENCE AUDIT

The operational audit targets data pipelines across active systems to trace financial leakage, operational bottlenecks, and predictive visibility voids.

### 1. Matrix of Measured Entities and Voids
| Engine / Domain | Current Physical Data Available | Analytical / Predictive Blind Zone | Impact of Blind Zone | Corrective Snapping Strategy (Phase H) |
| :--- | :--- | :--- | :--- | :--- |
| **Financial Ledger (Double-Entry)** | General journal transactions, caisse balances, accounts payable / receivable. | Overdue pressure forecasting; liquid reserve exhaustion indicators, VAT offsets. | Short-term cash crunches, missed payment windows under high currency fluctuation. | Run-rate rolling simulations & stress curve projections on mock and real tables. |
| **Chantier Production & Milestones** | Construction dates, material quantities used, subcontractor visas. | Subcontractor unreliability indicators, chantier margin erosion forecast. | Uncontrolled cost overflows discovered months too late to recover. | Multi-tier cost overrun indexing based on real-time material receipt gaps. |
| **Commercial Operations / CRM** | Lead count, assignment timestamps, visit status lists, total reservations. | Late bank agreement probabilities, notary signature stall delays. | Sunk reservation queues, blocked liquidity lockups in delayed CNEP approvals. | Scorecard indicators weighting delinquency risks by Algerian payment milestones. |
| **SLA & Orchestrator Metrics** | Warning alerts, violation logs, execution timelines. | Cascading breach likelihoods, approval sequence latency indexes. | Management intervention late responses, silent workflow stalling on key approvals. | Predictive workflow bottleneck metrics & auto-healing remediation cycles. |

### 2. Analytical Entity Classifications
1. **Measurable Operational Entities**: Transaction logs, material receipts, time stamps on task executions, agent-assigned lead records.
2. **Predictive Operational Entities**: Client Delinquency Profiles, Chantier Drag Calculations, Rolling Liquidity Stress Vectors.
3. **Strategic Management Entities**: Multi-agency Profitability Curves, Overdue Debt Asset Risk Profiles, Capital Allocation Efficiency indexes.
4. **Real-time Monitoring Entities**: Triggered Execution Alerts, Live Approved Commits versus Liquid Reserve ratios.

---

## PART 2 — ENTERPRISE EXECUTIVE INTELLIGENCE MODEL

The Executive Intelligence Model encapsulates structural boundaries and hierarchical oversight for multi-branch organizations.

```
       [Executive Board / CEO]  <-- Full Org Visibility Scope
                  |
     +------------+------------+
     |                         |
[CFO / Finance]          [Chantier Director]  <-- Specific Domain Intelligence Scopes
     |                         |
[Branch Managers]        [Conducteurs de Chantier] <-- Local Branch & Project Scopes
```

### 1. Organizational Actors & Information Isolation Map
* **executive_board**: Unrestricted aggregate reading across all branches, projects, and accounts. Holds system-wide approval overrides.
* **finance_director**: Read/write access on accounts, treasury cashflows, delinquency scores, procurement budgets. No raw construction material logs except cost consequences.
* **chantier_director**: Direct access over construction progress, material metrics, subcontractor scores, project delay forecasting. Non-financial treasury visibility.
* **branch_manager**: Access restricted to local CRM pipelines, branch bank/caisse performance, local agents SLA scores, local lead costs.

---

## PART 3 — KPI & OPERATIONAL METRICS ENGINE

Deterministic mathematical formulas configured in the background computation engine:

### 1. Technical Formulation Table

#### Financial KPIs
* **Cash Burn Rate ($CBR_m$)**:
  $$\text{CBR}_m = \sum \text{OperatingExpenses}_{\text{last 30 days}}$$
* **Liquidity Reserve Days ($LRD$)**:
  $$\text{LRD} = \frac{\text{LiquidTreasuryAssets}}{\text{CBR}_m / 30}$$
* **Collection Velocity ($CV$)**:
  $$\text{CV} = \frac{\text{ActualCollections}_{\text{period}}}{\text{ScheduledInstallments}_{\text{period}}}$$
* **Overdue Installment Ratio ($OIR$)**:
  $$\text{OIR} = \frac{\text{TotalOverdueDebts}}{\text{TotalActiveReceivables}}$$

#### Commercial KPIs
* **Lead-to-Visit Velocity ($LVV$)**:
  Avg time between lead reception and completed physical site visit.
* **Visit-to-Reservation Velocity ($VRV$)**:
  Avg time between physical site visit and formal unit booking.

#### Construction / Delays KPIs
* **Chantier Delay Index ($CDI_p$)**:
  $$\text{CDI}_p = \sum (\text{ActualMilestoneCompletionDate} - \text{TargetMilestoneDate})$$
* **Margin Erosion Forecast ($MEF$)**:
  $$\text{MEF} = \text{BudgetCostWorkScheduled} - \text{ActualCostWorkPerformed}$$

---

## PART 4 — CASHFLOW & TREASURY FORECASTING ENGINE

This system models cashflow with explicit rules for Algerian real estate payment methods, primarily bank delays.

### 1. Real Estate Installment Culture Simulation Logic

```
   [Purchase Agreement Signed] 
               │
               ▼
      [Notary Files EDD] 
               │
               ▼  <=== [Manual Processing Delay: 30 - 90 Days]
      [CNEP / Bank Agreement]
               │
               ▼  <=== [Verification Block: Delayed Tranche Release]
   [Treasury Account Inflow]
```

### 2. Mathematical Forecasting Algorithm
To forecast cash balance ($B_{t}$) at month $t$:
$$B_{t} = B_{t-1} + \sum_{i} I_{i, t} \cdot P(\text{success}_{i, t}) - \sum_{j} O_{j, t}$$
Where:
* $I_{i, t}$ represents the value of incoming client payment $i$ scheduled at month $t$.
* $P(\text{success}_{i, t})$ is the collection probability score, heavily penalized by notary and banking approval flags.
* $O_{j, t}$ represents projected supplier invoices, payroll, and physical chantier procurement expenditure.

To address Algerian operational realities:
* **CNEP Bank Release Delays**: Shifting the scheduled date of bank funds by a default coefficient of $+45$ to $+90$ days.
* **Notary State bottlenecks**: Penalizing release milestones until the physical state stamp checksum is verified.

---

## PART 5 — DELINQUENCY & RISK PREDICTION ENGINE

Evaluating risk metrics and automating escalation rules before a client enters actual default.

### 1. Client Delinquency Risk Scoring Weights
* **Historical payment delay of previous tranches**: Weight = **35%**
* **Lack of response to formal WhatsApp notifications (7-day window)**: Weight = **25%**
* **Incomplete Notariat paperwork or lack of preliminary bank agreement**: Weight = **30%**
* **Commercial agent subjective risk assessment**: Weight = **10%**

### 2. Construction Blockage Alerts
* **Rupture de Stock (Materials shortage)**: Exceeding 48 hours trigger high severity logs.
* **Subcontractor Delay Cascade**: Delays in foundational concrete trigger automated locks on plumbing task starts.

---

## PART 6 — OPERATIONAL INTELLIGENCE GRAPH

```
[Chantier Interrupted] ──► [Tranche Unlock Failed] ──► [Treasury Balance Decline] ──► [SLA Breach Triggered]
```

### Example Propagation Chain
* Delay in casting foundation slab Bloc B $\rightarrow$ Delays unlocking Bank Credit Agreement milestone $\rightarrow$ Inability to pay Lafarge Materials supplier invoice $\rightarrow$ Materials supplier blocks delivery of brick stocks $\rightarrow$ Entire construction workforce stalls $\rightarrow$ Client payment schedules delayed due to progress failure.

---

## PART 7 — EXECUTIVE DASHBOARD ARCHITECTURE

The executive workspace translates metrics into specific operational decisions:

1. **Treasury War-Room**: Visualizes $P(10)$ cash reserve scenarios. Answers: *"Should we delay payment to supplier X or trigger high-velocity WhatsApp collections on client Y?"*
2. **Chantier Profitability Index**: Shows margin erosion markers by team. Answers: *"Which subcontractor needs to be replaced before material waste exceeds normal bounds?"*
3. **Branch Performance Matrix**: Overviews branch metrics side-by-side. Answers: *"Which branch requires intervention due to deteriorating SLA times?"*

---

## PART 8 — SQL & ANALYTICS INFRASTRUCTURE

*Refer to the database schema defined in `/supabase/migrations/20260530_decision_intelligence.sql`. This uses append-only kpi snapshots to guarantee historical tracking over multiple quarters.*

---

## PART 9 — EVENT-DRIVEN INTELLIGENCE ENGINE

The intelligence engine listens to system events on the Event Bus:

### 1. Trigger Subscriptions
* `deal_payment.overdue` $\rightarrow$ Recalculate Client Delinquency Probability.
* `milestone.validated` $\rightarrow$ Run Forecasting Models to shift projected cash balance curves.
* `sla_violations.inserted` $\rightarrow$ Update Branch SLA Compliance Scores.

---

## PART 10 — ALGERIAN REALITY MODELING

Assumptions configured in the engine logic:
* **Cash-Heavy operations**: Allowing direct manual treasury validation.
* **WhatsApp tracking**: Counting digital read receipts as official follow-up markers before sending physical notary notices.
* **CNEP Delayed Financing**: Hardcoded manual verification buffers for regional bank transfers.

---

## PART 11 — API & DIRECTORY RESTRUCTURE

The future directory tree will be laid out as follows:

```
/src/domains/intelligence/
  ├── forecasting/           # Mathematical cashflow simulation models
  ├── treasury/              # Liquidity risk tracking engines
  ├── risk/                  # Delinquency scorecard calculators
  ├── analytics/             # Raw SQL aggregation scripts
  ├── reporting/             # PDF reports and summaries
  ├── dashboards/            # Core dashboard rendering components
  ├── alerts/                # System exception threshold watchers
  ├── event-processors/      # Subscriptions to the event bus
  ├── materialized-views/    # DB optimization scripts
  ├── executive/             # Executive board specialized models
  └── services/              # Common business intelligence runtime wrappers
```

---

## PART 12 — EXECUTIVE DECISION FLOWS

```
                  [T-Reserve < 45 Days Triggered]
                                │
                                ▼
              [Retrieve delinquent installment list]
                                │
                                ▼
         [Generate prioritized WhatsApp escalation chain]
                                │
                                ▼
       [Apply emergency credit approvals or notary notices]
```

---

## PART 13 — FAILURE SCENARIOS & RECOVERY

* **Corrupted analytics**: The snapshot job runs an independent verification script matching total ledger records. If a cash variance occurs, the snap is discarded and an anomaly alert is raised.
* **Duplicate forecasting**: Task processing locks are maintained in the database using unique `(agency_id, run_date)` constraints to prevent duplicate model simulation runs.

---

## PART 14 — SAFE MIGRATION STRATEGY

1. **Cold Warm-Up**: Backfill `kpi_snapshots` using historic deals and construction entries.
2. **Parallel run**: Maintain current standard metrics while testing predictions against outcomes over a 30-day trial period.
3. **Migration complete**: Expose the predictions suite to the main dashboard.

---

## PART 15 — FINAL ENTERPRISE EVALUATION

This implementation moves the core operations from simple data registries into analytical automation. Cashflow forecasting mitigates liquidity crises by identifying risks up to 90 days in advance, adapting to local real-estate market realities.
