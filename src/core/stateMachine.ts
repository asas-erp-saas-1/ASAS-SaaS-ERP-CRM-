// src/core/stateMachine.ts
// ASAS Canonical State Machine
// This file is the SINGLE SOURCE OF TRUTH for all lifecycle transitions.
// DB triggers enforce the same rules at the data layer.

// =============================================================================
// DEAL STATE MACHINE
// =============================================================================

export const DEAL_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  NEGOTIATION: "negotiation",
  NOTARY: "notary",
  CLOSED: "closed",
  CANCELLED: "cancelled",
} as const;

export type DealStatus = (typeof DEAL_STATUS)[keyof typeof DEAL_STATUS];

// Canonical transition map — must match DB trigger fn_enforce_deal_state_machine
const DEAL_TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  draft: ["active", "cancelled"],
  active: ["negotiation", "cancelled"],
  negotiation: ["notary", "closed", "active", "cancelled"],
  notary: ["closed", "negotiation", "cancelled"],
  closed: [], // terminal — immutable
  cancelled: [], // terminal
};

// State metadata
export interface DealStateConfig {
  label: string;
  description: string;
  stepIndex: number; // position in pipeline (−1 = off-path)
  isTerminal: boolean;
  isLocked: boolean; // no field edits allowed
  colorClass: string;
  agentActions: string[];
  managerActions: string[];
}

export const DEAL_STATE_CONFIG: Record<DealStatus, DealStateConfig> = {
  draft: {
    label: "Draft",
    description: "Deal created, awaiting activation",
    stepIndex: 0,
    isTerminal: false,
    isLocked: false,
    colorClass: "gray",
    agentActions: [],
    managerActions: ["activate"],
  },
  active: {
    label: "Active",
    description: "Deal is live — client is engaged",
    stepIndex: 1,
    isTerminal: false,
    isLocked: false,
    colorClass: "blue",
    agentActions: ["log_activity", "update_next_action"],
    managerActions: ["start_negotiation", "cancel"],
  },
  negotiation: {
    label: "Negotiation",
    description: "Payment tracking in progress",
    stepIndex: 2,
    isTerminal: false,
    isLocked: false,
    colorClass: "yellow",
    agentActions: ["log_activity", "update_next_action"],
    managerActions: ["add_payment", "mark_payment_paid", "close", "cancel"],
  },
  notary: {
    label: "Notary signing",
    description: "Undergoing notary validation",
    stepIndex: 3,
    isTerminal: false,
    isLocked: false,
    colorClass: "purple",
    agentActions: ["log_activity", "update_next_action"],
    managerActions: ["close", "cancel"],
  },
  closed: {
    label: "Closed",
    description: "Deal completed — read-only",
    stepIndex: 4,
    isTerminal: true,
    isLocked: true,
    colorClass: "green",
    agentActions: [],
    managerActions: ["add_commission", "pay_commission"],
  },
  cancelled: {
    label: "Cancelled",
    description: "Deal cancelled",
    stepIndex: -1,
    isTerminal: true,
    isLocked: true,
    colorClass: "red",
    agentActions: [],
    managerActions: ["apply_penalty", "process_refund"],
  },
};

export interface TransitionMeta {
  from: DealStatus;
  to: DealStatus;
  label: string;
  requiresReason: boolean;
  requiresCheck: "all_payments_paid" | "has_payment_schedule" | null;
  managerOnly: boolean;
  confirmMsg: string;
  buttonStyle: "primary" | "success" | "danger" | "secondary";
}

export const DEAL_TRANSITION_META: TransitionMeta[] = [
  {
    from: "draft",
    to: "active",
    label: "Activate Deal",
    confirmMsg: "Activate this deal? Property will be reserved.",
    requiresReason: false,
    requiresCheck: null,
    managerOnly: false,
    buttonStyle: "primary",
  },
  {
    from: "active",
    to: "negotiation",
    label: "Start Negotiation",
    confirmMsg: "Begin negotiation phase? Payment tracking will start.",
    requiresReason: false,
    requiresCheck: null,
    managerOnly: true,
    buttonStyle: "primary",
  },
  {
    from: "negotiation",
    to: "notary",
    label: "Send to Notary",
    confirmMsg:
      "Send this deal to notary? Payment schedules will remain read-only.",
    requiresReason: false,
    requiresCheck: null,
    managerOnly: true,
    buttonStyle: "primary",
  },
  {
    from: "negotiation",
    to: "closed",
    label: "Close Deal ✓",
    confirmMsg: "Close this deal? All payments must be paid.",
    requiresReason: false,
    requiresCheck: "all_payments_paid",
    managerOnly: true,
    buttonStyle: "success",
  },
  {
    from: "notary",
    to: "closed",
    label: "Close Deal ✓",
    confirmMsg: "Close this deal? All payments must be paid.",
    requiresReason: false,
    requiresCheck: "all_payments_paid",
    managerOnly: true,
    buttonStyle: "success",
  },
  {
    from: "negotiation",
    to: "active",
    label: "Back to Active",
    confirmMsg: "Return to active state?",
    requiresReason: true,
    requiresCheck: null,
    managerOnly: true,
    buttonStyle: "secondary",
  },
  {
    from: "notary",
    to: "negotiation",
    label: "Back to Negotiation",
    confirmMsg: "Return to negotiation?",
    requiresReason: true,
    requiresCheck: null,
    managerOnly: true,
    buttonStyle: "secondary",
  },
  {
    from: "draft",
    to: "cancelled",
    label: "Cancel",
    confirmMsg: "Cancel this draft?",
    requiresReason: true,
    requiresCheck: null,
    managerOnly: true,
    buttonStyle: "danger",
  },
  {
    from: "active",
    to: "cancelled",
    label: "Cancel Deal",
    confirmMsg: "Cancel this deal? Cannot be undone.",
    requiresReason: true,
    requiresCheck: null,
    managerOnly: true,
    buttonStyle: "danger",
  },
  {
    from: "negotiation",
    to: "cancelled",
    label: "Cancel Deal",
    confirmMsg: "Cancel? All pending payments will be cancelled.",
    requiresReason: true,
    requiresCheck: null,
    managerOnly: true,
    buttonStyle: "danger",
  },
  {
    from: "notary",
    to: "cancelled",
    label: "Cancel Deal",
    confirmMsg: "Cancel? All pending payments will be cancelled.",
    requiresReason: true,
    requiresCheck: null,
    managerOnly: true,
    buttonStyle: "danger",
  },
];

// =============================================================================
// DealStateMachine class
// =============================================================================

export class DealStateMachine {
  readonly status: DealStatus;
  readonly config: DealStateConfig;

  constructor(status: DealStatus) {
    this.status = status;
    this.config = DEAL_STATE_CONFIG[status];
  }

  get isTerminal(): boolean {
    return this.config.isTerminal;
  }
  get isLocked(): boolean {
    return this.config.isLocked;
  }
  get stepIndex(): number {
    return this.config.stepIndex;
  }

  allowedTransitions(): DealStatus[] {
    return DEAL_TRANSITIONS[this.status] ?? [];
  }

  canTransitionTo(target: DealStatus): boolean {
    return this.allowedTransitions().includes(target);
  }

  validate(target: DealStatus): { ok: boolean; error?: string } {
    if (this.isTerminal) {
      return {
        ok: false,
        error: `Deal is in terminal state "${this.status}" — no transitions allowed`,
      };
    }
    if (!this.canTransitionTo(target)) {
      const allowed = this.allowedTransitions();
      return {
        ok: false,
        error: `Cannot move from "${this.status}" to "${target}". Allowed: [${allowed.join(", ")}]`,
      };
    }
    return { ok: true };
  }

  getTransitionMeta(isManager: boolean): TransitionMeta[] {
    return DEAL_TRANSITION_META.filter(
      (t) => t.from === this.status && (!t.managerOnly || isManager),
    );
  }

  // Pipeline steps for UI (excludes cancelled)
  static pipelineSteps(): DealStatus[] {
    return ["draft", "active", "negotiation", "notary", "closed"];
  }
}

// =============================================================================
// LEAD STATE MACHINE
// =============================================================================

export const LEAD_STATUS = {
  NEW: "new",
  QUALIFIED: "qualified",
  VISITING: "visiting",
  NEGOTIATING: "negotiating",
  OPTION: "option",
  RESERVED: "reserved",
  LOST: "lost",
} as const;

export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS];

const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["qualified", "lost"],
  qualified: ["visiting", "new", "lost"],
  visiting: ["negotiating", "qualified", "lost"],
  negotiating: ["option", "visiting", "lost"],
  option: ["reserved", "negotiating", "lost"],
  reserved: [], // terminal — tied to deal
  lost: ["new"], // can be reactivated
};

export class LeadStateMachine {
  readonly status: LeadStatus;

  constructor(status: string) {
    this.status = status as LeadStatus;
  }

  get isTerminal(): boolean {
    return LEAD_TRANSITIONS[this.status].length === 0;
  }
  get isReserved(): boolean {
    return this.status === "reserved";
  }
  get isLost(): boolean {
    return this.status === "lost";
  }

  canTransitionTo(target: LeadStatus): boolean {
    return LEAD_TRANSITIONS[this.status]?.includes(target) ?? false;
  }

  validate(
    target: LeadStatus,
    opts: { lost_reason?: string } = {},
  ): { ok: boolean; error?: string } {
    if (this.isTerminal && this.status !== "lost") {
      return { ok: false, error: `Lead is in terminal state "${this.status}"` };
    }
    if (!this.canTransitionTo(target)) {
      return {
        ok: false,
        error: `Cannot change lead from "${this.status}" to "${target}"`,
      };
    }
    if (target === "lost" && !opts.lost_reason?.trim()) {
      return {
        ok: false,
        error: "A reason is required when marking a lead as lost",
      };
    }
    return { ok: true };
  }
}

// =============================================================================
// RISK COMPUTATION ENGINE
// =============================================================================

export interface RiskInput {
  status: DealStatus;
  daysSinceUpdate: number;
  overduePayments: number;
  maxOverdueDays: number;
  pendingPayments: number;
  hasNextAction: boolean;
  nextActionOverdueDays: number;
  paymentCompletionPct: number;
  totalPaymentsScheduled: number;
  agreedPrice: number;
}

export interface RiskResult {
  score: number; // 0–100
  level: "low" | "medium" | "high" | "critical";
  signals: string[];
  breakdown: Record<string, number>;
}

export function computeRisk(input: RiskInput): RiskResult {
  const signals: string[] = [];
  const breakdown: Record<string, number> = {};

  // --- Payment risk (max 45pts) ---
  let paymentScore = 0;
  if (input.overduePayments > 0) {
    paymentScore = Math.min(
      45,
      input.overduePayments * 12 + Math.min(input.maxOverdueDays * 0.6, 25),
    );
    signals.push(
      `${input.overduePayments} overdue payment(s) — ${input.maxOverdueDays} days late`,
    );
  }
  breakdown.payments = paymentScore;

  // --- Inactivity risk (max 20pts) ---
  let inactivityScore = 0;
  if (input.daysSinceUpdate > 30) {
    inactivityScore = 20;
    signals.push("No activity for 30+ days");
  } else if (input.daysSinceUpdate > 14) {
    inactivityScore = 13;
    signals.push("No activity for 14+ days");
  } else if (input.daysSinceUpdate > 7) {
    inactivityScore = 7;
    signals.push("No activity for 7+ days");
  }
  breakdown.inactivity = inactivityScore;

  // --- Next action risk (max 15pts) ---
  let actionScore = 0;
  if (!input.hasNextAction && !["closed", "cancelled"].includes(input.status)) {
    actionScore = 10;
    signals.push("No next action defined");
  } else if (input.nextActionOverdueDays > 7) {
    actionScore = 15;
    signals.push(`Next action ${input.nextActionOverdueDays}d overdue`);
  } else if (input.nextActionOverdueDays > 0) {
    actionScore = 8;
    signals.push("Next action past due date");
  }
  breakdown.nextAction = actionScore;

  // --- Payment schedule risk (max 10pts) ---
  let scheduleScore = 0;
  if (
    input.status === "negotiation" &&
    input.totalPaymentsScheduled < input.agreedPrice * 0.5
  ) {
    scheduleScore = 10;
    signals.push("Less than 50% of payments scheduled");
  }
  breakdown.schedule = scheduleScore;

  // --- Pending volume risk (max 10pts) ---
  let pendingScore = 0;
  if (input.pendingPayments > 3) {
    pendingScore = 10;
    signals.push("Many pending payments");
  } else if (input.pendingPayments > 1) {
    pendingScore = 5;
  }
  breakdown.pending = pendingScore;

  const total =
    paymentScore + inactivityScore + actionScore + scheduleScore + pendingScore;
  const score = Math.min(Math.round(total), 100);

  const level: RiskResult["level"] =
    score >= 70
      ? "critical"
      : score >= 45
        ? "high"
        : score >= 20
          ? "medium"
          : "low";

  return { score, level, signals, breakdown };
}

// =============================================================================
// NEXT ACTION GENERATOR
// =============================================================================

export interface NextActionOutput {
  action: string;
  urgency: "critical" | "high" | "normal";
  dueDate: string;
  type: "call" | "payment" | "document" | "review" | "follow_up" | "close";
}

export function generateNextAction(ctx: {
  status: DealStatus;
  overduePayments: number;
  pendingPayments: number;
  daysSinceUpdate: number;
  paymentPct: number;
  next_action: string | null;
  next_action_due: string | null;
  commissionGenerated?: boolean;
  hasPaymentSchedule?: boolean;
}): NextActionOutput {
  const today = new Date().toISOString().split("T")[0]!;
  const tmrw = new Date(Date.now() + 86_400_000).toISOString().split("T")[0]!;
  const in3d = new Date(Date.now() + 3 * 86_400_000)
    .toISOString()
    .split("T")[0]!;
  const in7d = new Date(Date.now() + 7 * 86_400_000)
    .toISOString()
    .split("T")[0]!;

  if (ctx.overduePayments > 0) {
    return {
      action: `Call client immediately — ${ctx.overduePayments} payment(s) overdue`,
      urgency: "critical",
      dueDate: today,
      type: "call",
    };
  }

  switch (ctx.status) {
    case "draft":
      return {
        action: "Activate deal — verify property and client details",
        urgency: "normal",
        dueDate: tmrw,
        type: "review",
      };

    case "active":
      if (ctx.daysSinceUpdate > 5) {
        return {
          action: "Follow up with client — no activity in 5+ days",
          urgency: "high",
          dueDate: today,
          type: "call",
        };
      }
      return {
        action: ctx.next_action ?? "Schedule client meeting",
        urgency: "normal",
        dueDate: ctx.next_action_due ?? in3d,
        type: "follow_up",
      };

    case "negotiation":
      if (!ctx.hasPaymentSchedule) {
        return {
          action: "Set up payment schedule with client",
          urgency: "high",
          dueDate: tmrw,
          type: "payment",
        };
      }
      if (ctx.pendingPayments > 0) {
        return {
          action: `Track ${ctx.pendingPayments} pending payment(s)`,
          urgency: ctx.pendingPayments > 2 ? "high" : "normal",
          dueDate: ctx.next_action_due ?? in7d,
          type: "payment",
        };
      }
      if (ctx.paymentPct >= 100) {
        return {
          action: "All payments received — ready to close deal",
          urgency: "high",
          dueDate: in3d,
          type: "close",
        };
      }
      return {
        action: ctx.next_action ?? "Confirm next payment date",
        urgency: "normal",
        dueDate: ctx.next_action_due ?? in7d,
        type: "call",
      };

    case "closed":
      if (!ctx.commissionGenerated) {
        return {
          action: "Set commission for this deal — define agent splits",
          urgency: "high",
          dueDate: today,
          type: "review",
        };
      }
      return {
        action: "Deal complete — collect client testimonial",
        urgency: "normal",
        dueDate: in7d,
        type: "follow_up",
      };

    default:
      return {
        action: ctx.next_action ?? "Review deal",
        urgency: "normal",
        dueDate: ctx.next_action_due ?? in7d,
        type: "review",
      };
  }
}
