# ASAS REAL ESTATE OS
## MASTER ERP RESTRUCTURING & UX CONVERGENCE PLAN (V2)

### STATEMENT OF PURPOSE
This document represents the **Master Blueprint** for reorganizing, restructuring, and hardening the UX/UI and component architecture of the ASAS Real Estate ERP. The application has grown into a fragmented "mess" of isolated dashboards. This plan shifts the architecture from a **Data-Viewing Application** (Dashboard Syndrome) to a **Task-Execution Machine** (Command Center).

This roadmap is strictly focused on human-computer interaction, component standardization, screen workflows, and front-end determinism—explicitly separate from the AI/Copilot layer.

---

## CORE UX/UI PHILOSOPHY: FROM "PAGES" TO "WORKFLOWS"

1. **No Passive Pages:** Users do not log in to *look* at data; they log in to *act* on data. Every screen must highlight explicit actions: "Approve Payment", "Relancer Client", "Validate Milestone".
2. **Standardized Component Primitives:** The `components/` folder will be strictly governed. No duplicated table designs, no inconsistent modal behaviors.
3. **Context Retention (Drawers > Pages):** Clicking a lead should not redirect the user to a new URL that loses the list context. It should open a side-drawer or sliding panel, allowing rapid execution.
4. **Mobile/Field First for Operations:** Construction and SAV modules must have oversized touch targets and high-contrast forms for outdoor sunlight readability.
5. **High-Density for Finance:** The Treasury and Ledger modules must resemble Bloomberg terminals: high data density, monospaced digits, zero whitespace waste.

---

## STAGE 1: FOUNDATION STANDARDIZATION & COMPONENT CLEANUP
**Goal:** Eliminate design inconsistencies and establish a strict, reusable component vocabulary.

*   **1.1 Directory Restructuring:**
    *   Reorganize `/src/components` into:
        *   `ui/` (Atomic elements: Button, Input, Modal, Badge, Dropdown - highly restricted Tailwind)
        *   `patterns/` (Compound elements: DataTable, ActionHeader, SlideOverDrawer)
        *   `layouts/` (Grid layouts, Main Sidebar, Topbar)
*   **1.2 The Unified `DataTable` Component:**
    *   Burn all fragmented tables. Create a single, hyper-performant, standardized `DataTable` component with built-in search, bulk-actions selection, and pagination.
*   **1.3 The Unified `ActionPanel` (Slide-Over Drawer):**
    *   Replace full-page detail views with a unified overlay drawer. When reviewing a client or executing a task, context of the list must not be lost.
*   **1.4 Enterprise Typography & Spacing Scale:**
    *   Enforce `Space Grotesk` for headers/KPIs, `Inter` for tables, `JetBrains Mono` for all currency (DZD) and dates.

---

## STAGE 2: NAVIGATION & THE OMNI-COMMAND CENTER
**Goal:** Fix the routing mess so users can execute actions from anywhere without hunting through menus.

*   **2.1 Role-Based Dynamic Sidebars:**
    *   The sidebar must filter out noise. A `conducteur_de_chantier` should never see marketing or finance menus.
*   **2.2 Omni-Search & Quick Actions (Command+K):**
    *   Implement an OS-wide Command menu. Pressing `Cmd+K` allows instant: "Search Client: Belkacem", "New Lead", "Log Payment".
*   **2.3 The Global "Inbox" (Action Hub):**
    *   Replace the generic `dashboard/overview` with a unified "Action Inbox". It collates overdue tasks, pending approvals, and SLA breaches into a single actionable queue.

---

## STAGE 3: FRONT-OFFICE CONVERGENCE (CRM, LEADS & COMMERCIAL)
**Goal:** Transform the CRM from a contact list into a high-velocity sales execution pipeline.

*   **3.1 Pipeline View (Kanban / Timeline):**
    *   Combine `/leads`, `/clients`, and `/deals` into a unified pipeline.
    *   Drag-and-drop state transitions: `Nouveau` -> `Visite` -> `Option` -> `Réservation`.
*   **3.2 The "360 Client View" Drawer:**
    *   When clicking a client, open a drawer showing their: Contact info, interaction timeline (Calls, WhatsApp), active reservations, and overdue installments all in one place.
*   **3.3 One-Click Log Interactions:**
    *   Forms to log visits, calls, or WhatsApp messages must be one-click accessible and instantly update the Activity Timeline component.

---

## STAGE 4: FIELD OPERATIONS & CHANTIER (PROJECTS)
**Goal:** Create ruggedized, checklist-driven workflows for physical construction operations.

*   **4.1 Mobile-Optimized Milestone Execution:**
    *   Refactor `/projects` into a digital twin matrix.
    *   Use bold, clickable progress trackers (e.g., "Gros Œuvre", "Ferraillage", "Coulage de Dalle").
*   **4.2 Material & Subcontractor Forms:**
    *   Simple, large-input forms for logging supplier delays or material stock-outs on-site.
*   **4.3 SAV (Service Après-Vente) Ticketing Validation:**
    *   Photo-upload capable ticketing UI for unit deliveries and defect tracking.

---

## STAGE 5: BACK-OFFICE RIGOR (FINANCE & LEDGER)
**Goal:** Hardened, high-density interfaces for accountants and executives tracking millions in cashflow.

*   **5.1 High-Density Double-Entry Ledger UI:**
    *   Table rows must be physically smaller, fitting more lines.
    *   Red for credit, Green/Black for debit. Strict Monospace alignment for DZD amounts.
*   **5.2 Two-Step Validation Workflows:**
    *   Any state change involving money (e.g., approving an installment payment) uses a strict confirmation modal summarizing the exact ledger entry it is about to create.
*   **5.3 Caisse (Cash Desk) Daily Closing View:**
    *   A specialized screen for Branch Managers to print daily reconciliation receipts.

---

## STAGE 6: ENGINE INTEGRATION & SETTINGS (ORCHESTRATION)
**Goal:** Visualizing the automated rules of the system so admins can understand what the ERP is doing.

*   **6.1 SLA & Rule Visualizer:**
    *   A clean, logic-tree UI (like Zapier/Make) under `/orchestration` to visualize what happens when SLAs are breached.
*   **6.2 System Audit Trail Explorer:**
    *   A read-only log viewer for system admins mapping every user click, login, and mutation.
*   **6.3 Unified Settings Architecture:**
    *   Consolidate all branch configurations, roles, and profiles into a segmented layout with horizontal sub-navigation.

---

## EXECUTION DIRECTIVE: HOW WE PROCEED

We will execute this plan sequentially.
1. **First Action:** We will begin with **Stage 1 (Foundation Standardization)**. We will perform a massive cleanup of the `/src/components` folder and design the master `DataTable` and `SlideOverDrawer`.
2. **Second Action:** We will rewrite the generic Dashboard Layout to accommodate the Omni-Command Center.
3. **Follow-through:** We will systematically rewrite the sub-directories (Commercial, Field, Finance) one by one using ONLY the new standardized components.

*This plan is locked. No chaotic feature additions. Only systematic, modular restructuring.*
