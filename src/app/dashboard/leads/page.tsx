// src/app/dashboard/leads/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Clock,
  ArrowRight,
  Filter,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import type { Lead } from "@/types/app";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { LeadDetailModal } from "./LeadDetailModal";
import { AlertTriangle } from "lucide-react";

import { LeadCreateModal } from "./LeadCreateModal";

import { WhatsAppDrawer } from "@/components/WhatsAppDrawer";

// ─── Kanban column definitions ────────────────────────────────────────────────
const COLUMNS = [
  {
    key: "new",
    label: "Nouveau",
    color:
      "bg-asas-silver/10 border-asas-silver/20 text-asas-charcoal dark:text-asas-silver",
    dot: "bg-asas-silver",
  },
  {
    key: "qualified",
    label: "Qualification",
    color: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    dot: "bg-blue-500",
  },
  {
    key: "visiting",
    label: "Visite",
    color:
      "bg-asas-navy/10 border-asas-navy/20 text-asas-navy dark:text-asas-sand/80",
    dot: "bg-asas-navy",
  },
  {
    key: "negotiating",
    label: "Négociation",
    color: "bg-asas-copper/10 border-asas-copper/20 text-asas-copper",
    dot: "bg-asas-copper",
  },
  {
    key: "option",
    label: "Option",
    color: "bg-amber-500/10 border-amber-500/20 text-amber-500",
    dot: "bg-amber-500",
  },
  {
    key: "reserved",
    label: "Réservé",
    color: "bg-asas-emerald/10 border-asas-emerald/20 text-asas-emerald",
    dot: "bg-asas-emerald",
  },
  {
    key: "lost",
    label: "Perdu",
    color: "bg-red-500/10 border-red-500/20 text-red-500",
    dot: "bg-red-500",
  },
] as const;

type LeadStatus = (typeof COLUMNS)[number]["key"];

function inactiveHours(lastActivity: string): number {
  return (Date.now() - new Date(lastActivity).getTime()) / 3_600_000;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M DZD";
  return new Intl.NumberFormat("fr-DZ").format(n) + " DZD";
}

// ─── MultiSelect Component ───────────────────────────────────────────────────
function MultiSelect({
  options,
  selected,
  onChange,
  label,
}: {
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (val: string[]) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm text-xs font-medium text-asas-charcoal dark:text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand transition-colors"
      >
        <Filter className="w-3.5 h-3.5 text-asas-gold" />
        {label}
        {selected.length > 0 && (
          <span className="ml-1 bg-asas-navy/10 dark:bg-white/10 text-asas-navy dark:text-asas-sand px-1.5 py-0.5 rounded-sm text-[10px]">
            {selected.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 right-0 w-48 bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm shadow-sm z-50 overflow-hidden">
            <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin">
              {options.length === 0 ? (
                <div className="p-2 text-xs text-asas-silver italic text-center">
                  Aucune option
                </div>
              ) : (
                options.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-asas-sand/50 dark:hover:bg-black/20 rounded-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(opt.id)}
                      onChange={() => toggle(opt.id)}
                      className="w-3.5 h-3.5 rounded-sm border-asas-silver/40 text-asas-gold focus:ring-asas-gold/20"
                    />
                    <span className="text-xs text-asas-charcoal dark:text-asas-sand truncate">
                      {opt.name}
                    </span>
                  </label>
                ))
              )}
            </div>
            {selected.length > 0 && (
              <div className="p-1 border-t border-asas-silver/10">
                <button
                  onClick={() => onChange([])}
                  className="w-full py-1.5 text-xs text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand rounded-sm flex items-center justify-center gap-1"
                >
                  <X className="w-3 h-3" /> Effacer
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Lead card ────────────────────────────────────────────────────────────────
function LeadCard({
  lead,
  onSelect,
  onWhatsApp,
  onStatusChange,
  onConvert,
  index,
}: {
  lead: Lead;
  onSelect: (id: string) => void;
  onWhatsApp: (lead: Lead) => void;
  onStatusChange: (id: string, s: string) => void;
  onConvert: (id: string) => void;
  index: number;
}) {
  const hours = inactiveHours(lead.last_activity);
  const isHot = hours < 24;
  const isStale = hours > 48;

  // Compute required execution action based on status and latency
  let nextRequiredAction = "";
  let actionColor = "";
  if (lead.status === "new" || lead.status === "qualified") {
      nextRequiredAction = hours > 2 ? "CONTACT INITIAL REQUIS" : "QUALIFIER PROFIL";
      actionColor = hours > 2 ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-asas-copper bg-asas-copper/10 border-asas-copper/20";
  } else if (lead.status === "visiting") {
      nextRequiredAction = hours > 48 ? "RELANCE VISITE OBLIGATOIRE" : "PROGRAMMER VISITE";
      actionColor = isStale ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-blue-500 bg-blue-500/10 border-blue-500/20";
  } else if (lead.status === "negotiating") {
      nextRequiredAction = "SÉCURISER INTENTION / PROPOSAL";
      actionColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
  } else if (lead.status === "option" || lead.status === "reserved") {
      nextRequiredAction = lead.status === "reserved" ? "VÉRIFIER FINANCEMENT & CONVERTIR" : "CONCRÉTISER RÉSERVATION";
      actionColor = "text-asas-emerald bg-asas-emerald/10 border-asas-emerald/20";
  }

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onSelect(lead.id)}
          className={clsx(
            "bg-white dark:bg-[#141618] rounded-sm border p-4 shadow-sm transition-all cursor-pointer select-none hover:border-asas-gold/40 relative",
            isStale ? "border-asas-copper/40" : "border-asas-silver/20",
            snapshot.isDragging &&
              "shadow-lg shadow-asas-gold/10 ring-1 ring-asas-gold/50 rotate-1 scale-105 z-50 cursor-grabbing bg-asas-sand/50 dark:bg-[#1C1E20]"
          )}
        >
          {/* Execution Requirement Banner */}
          {nextRequiredAction && (
              <div className={clsx(
                  "absolute top-0 left-0 right-0 py-0.5 px-2 text-[8px] uppercase tracking-widest font-black text-center whitespace-nowrap overflow-hidden text-ellipsis border-b",
                  actionColor
              )}>
                  ACTION REQUISE : {nextRequiredAction}
              </div>
          )}

          <div className="flex items-start justify-between gap-2 mb-3 mt-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-asas-charcoal dark:text-asas-sand truncate text-sm">
                {(lead as any).clients?.full_name ?? "Client Inconnu"}
              </p>
              {(lead as any).clients?.phone && (
                <p className="text-xs text-asas-silver mt-1 font-mono tracking-wide">
                  {(lead as any).clients.phone}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1 items-end">
              {isHot && (
                <span className="text-[9px] uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-sm font-bold shrink-0">
                  🔥 Actif
                </span>
              )}
              {isStale && (
                <span className="text-[9px] uppercase tracking-widest bg-asas-copper/10 text-asas-copper border border-asas-copper/20 px-2 py-0.5 rounded-sm font-bold shrink-0">
                  ⚠️ Inactif
                </span>
              )}
            </div>
          </div>

          {/* Source + project */}
          <div className="flex items-center gap-2 mb-4">
            {lead.source && (
              <span className="text-[9px] uppercase font-bold tracking-wider bg-black/5 dark:bg-white/5 border border-asas-silver/10 text-asas-silver px-2 py-0.5 rounded-sm">
                {lead.source}
              </span>
            )}
            {(lead as any).projects?.name && (
              <span className="text-[9px] uppercase font-bold tracking-wider bg-asas-navy/5 border border-asas-navy/10 text-asas-navy dark:text-asas-sand px-2 py-0.5 rounded-sm">
                {(lead as any).projects.name}
              </span>
            )}
          </div>

          {/* Budget */}
          {(lead.budget_min || lead.budget_max) && (
            <div className="mb-4 bg-asas-sand/50 dark:bg-black/20 p-2.5 rounded-sm border border-asas-silver/10">
              <span className="text-asas-silver font-bold mb-1 block text-[9px] uppercase tracking-widest">
                Projection Finance
              </span>
              <span className="font-bold text-asas-charcoal dark:text-asas-sand text-xs font-mono">
                {lead.budget_min ? fmt(lead.budget_min) : "?"} {" → "}{" "}
                {lead.budget_max ? fmt(lead.budget_max) : "?"}
              </span>
            </div>
          )}

          {/* Inactivity warning / Momentum */}
          {isStale && lead.status !== "visiting" && (
            <p className="text-[9px] uppercase tracking-widest text-asas-copper flex items-center gap-1.5 mb-4 font-bold bg-asas-copper/10 border border-asas-copper/20 px-2 py-1 rounded-sm">
              <Clock className="h-3 w-3" />
              Latence: {Math.floor(hours)}h
            </p>
          )}

          {lead.status === "visiting" && isStale && (
            <div className="text-[9px] uppercase tracking-widest text-red-500 flex items-center gap-1.5 mb-4 font-bold bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-sm">
              <AlertTriangle className="h-3 w-3" />
              Momentum Faible (+3j)
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-asas-silver/10 mt-2">
            <div
              className="relative isolate"
              onClick={(e) => e.stopPropagation()}
            >
              <select
                value={lead.status}
                onChange={(e) => onStatusChange(lead.id, e.target.value)}
                className="appearance-none block w-full bg-asas-sand/50 dark:bg-[#141618] border border-asas-silver/20 text-asas-charcoal dark:text-asas-sand text-[9px] uppercase tracking-widest font-bold py-2 pl-2 pr-6 rounded-sm focus:outline-none focus:border-asas-gold/50 cursor-pointer"
              >
                {COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center px-1 text-asas-silver">
                <svg
                  className="fill-current h-3 w-3"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M5.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615l-4.695 4.502c-0.268 0.268-0.707 0.268-0.975 0l-4.695-4.502c-0.408-0.418-0.436-1.17 0-1.615z" />
                </svg>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onWhatsApp(lead);
              }}
              className="flex items-center justify-center p-2 min-w-[32px] min-h-[32px] border border-asas-silver/20 bg-[#25D366]/5 dark:bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/10 rounded-sm transition-all shadow-sm"
              title="Message WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="flex items-center justify-center p-2 min-w-[32px] min-h-[32px] border border-asas-silver/20 bg-white dark:bg-[#141618] text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand hover:border-asas-gold/40 rounded-sm transition-all"
              title="Initier Appel"
            >
              <Phone className="h-3.5 w-3.5" />
            </button>
            {lead.status === "reserved" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConvert(lead.id);
                }}
                className="ml-auto flex items-center justify-center gap-1.5 min-h-[32px] text-[9px] uppercase tracking-widest font-bold bg-asas-charcoal dark:bg-asas-sand text-asas-sand dark:text-asas-charcoal px-3 py-1.5 rounded-sm hover:bg-black dark:hover:bg-white transition-all shadow-sm"
              >
                Dossier <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const [whatsAppLead, setWhatsAppLead] = useState<Lead | null>(null);

  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const router = useRouter();

  async function handleConvert(leadId: string) {
    // Navigate to new deal form pre-filled with lead
    router.push(`/dashboard/deals/new?leadId=${leadId}`);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads?limit=100");
      if (!res.ok)
        throw new Error((await res.text()) || "Failed to fetch leads");
      const data = await res.json();
      setLeads(data.data ?? []);
      setTotal(data.count ?? 0);
    } catch (err: any) {
      import("@/lib/observability/errors").then((mod) =>
        mod.ErrorTracker.captureError(err, { context: "LeadsPage load" }),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Derive filter options
  const sourceOptions = useMemo(() => {
    const sources = new Set(
      leads.map((l) => l.source).filter(Boolean) as string[],
    );
    return Array.from(sources).map((s) => ({ id: s, name: s }));
  }, [leads]);

  const agentOptions = useMemo(() => {
    const agents = new Map<string, string>();
    leads.forEach((l) => {
      if (l.assigned_agent && (l as any).profiles?.full_name) {
        agents.set(l.assigned_agent, (l as any).profiles.full_name);
      }
    });
    return Array.from(agents.entries()).map(([id, name]) => ({ id, name }));
  }, [leads]);

  // Filter by search and multi-select
  const filtered = leads.filter((l) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchesSearch =
        (l as any).clients?.full_name?.toLowerCase().includes(q) ||
        (l as any).clients?.phone?.includes(q) ||
        (l as any).projects?.name?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    if (selectedSources.length > 0) {
      if (!l.source || !selectedSources.includes(l.source)) return false;
    }

    if (selectedAgents.length > 0) {
      if (!l.assigned_agent || !selectedAgents.includes(l.assigned_agent))
        return false;
    }

    return true;
  });

  // Group by status
  const byStatus = (status: string) =>
    filtered.filter((l) => l.status === status);
  const activeColumns = COLUMNS;

  async function onStatusChange(leadId: string, newStatus: string) {
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus as any } : lead,
      ),
    );
    try {
      const { v4: uuidv4 } = await import("uuid");
      const res = await fetch("/api/command-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commandId: uuidv4(),
          aggregateId: leadId,
          type: "SET_LEAD_STATUS",
          expectedVersion: 1,
          payload: { status: newStatus },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Conflict");
    } catch (e: any) {
      import("@/lib/observability/errors").then((mod) =>
        mod.ErrorTracker.captureError(e, {
          context: "LeadsPage onStatusChange",
        }),
      );
      load(); // Revert
    }
  }

  async function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const newStatus = destination.droppableId as LeadStatus;

    // Optimistic update
    setLeads((current) =>
      current.map((lead) =>
        lead.id === draggableId ? { ...lead, status: newStatus as any } : lead,
      ),
    );

    try {
      const { v4: uuidv4 } = await import("uuid");
      const res = await fetch("/api/command-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commandId: uuidv4(),
          aggregateId: draggableId,
          type: "SET_LEAD_STATUS",
          expectedVersion: 1, // Leads typically don't have strict versions in legacy CRM yet
          payload: { status: newStatus },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Conflict");
    } catch (e: any) {
      import("@/lib/observability/errors").then((mod) =>
        mod.ErrorTracker.captureError(e, { context: "LeadsPage dragEnd" }),
      );
      // Revert on error
      load();
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-white dark:bg-[#141618] rounded-sm shadow-sm border border-asas-silver/20 overflow-hidden text-asas-charcoal dark:text-asas-sand">
      {/* Header */}
      <div className="bg-asas-sand/30 dark:bg-black/10 border-b border-asas-silver/20 px-6 py-5 shrink-0 z-10 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-2">
          <div>
            <h1 className="text-xl font-bold text-asas-charcoal dark:text-asas-sand flex items-center gap-3 tracking-tight font-display uppercase">
              <Users className="h-5 w-5 text-asas-gold" /> Pipeline
              d'Acquisition
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-asas-silver mt-2">
              {total} entités actives détectées
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            {/* Filters */}
            <div className="flex items-center gap-2">
              <MultiSelect
                label="Source"
                options={sourceOptions}
                selected={selectedSources}
                onChange={setSelectedSources}
              />
              <MultiSelect
                label="Agent"
                options={agentOptions}
                selected={selectedAgents}
                onChange={setSelectedAgents}
              />
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-asas-silver" />
              <input
                type="text"
                placeholder="Scanner matricule ou identifiant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-transparent text-sm font-medium border border-asas-silver/40 rounded-sm focus:outline-none focus:border-asas-gold focus:ring-1 focus:ring-asas-gold text-asas-charcoal dark:text-asas-sand transition-all placeholder:text-asas-silver"
              />
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 shrink-0 bg-asas-charcoal hover:bg-black dark:bg-asas-sand dark:hover:bg-white text-asas-sand dark:text-asas-charcoal rounded-sm text-xs font-bold transition-all border border-transparent"
            >
              <Plus className="h-4 w-4" strokeWidth={2} /> Ajouter Entité
            </button>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-transparent">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex h-full gap-4 p-6 min-w-max items-start">
            {loading
              ? [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-[340px] bg-white dark:bg-[#141618] rounded-sm border border-asas-silver/20 animate-pulse h-[80vh]"
                  />
                ))
              : activeColumns.map((col) => {
                  const colLeads = byStatus(col.key);
                  return (
                    <div
                      key={col.key}
                      className="w-[340px] flex flex-col bg-white dark:bg-[#141618] rounded-sm border border-asas-silver/20 overflow-hidden max-h-full"
                    >
                      {/* Column header */}
                      <div className="px-5 py-4 border-b border-asas-silver/10 bg-white dark:bg-[#141618] flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <div
                            className={clsx(
                              "h-2.5 w-2.5 rounded-full inline-block",
                              col.dot,
                            )}
                          />
                          <span className="text-sm font-bold text-asas-charcoal dark:text-asas-sand tracking-wide uppercase font-display">
                            {col.label}
                          </span>
                        </div>
                        <span
                          className={clsx(
                            "text-[10px] font-bold px-2 py-0.5 rounded-sm border tracking-widest",
                            col.color,
                          )}
                        >
                          {colLeads.length}
                        </span>
                      </div>

                      {/* Droppable Area */}
                      <Droppable droppableId={col.key}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={clsx(
                              "flex-1 overflow-y-auto p-4 space-y-4 transition-colors min-h-[150px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-asas-silver/20",
                              snapshot.isDraggingOver
                                ? "bg-asas-sand/50 dark:bg-black/10"
                                : "",
                            )}
                          >
                            {colLeads.length === 0 &&
                            !snapshot.isDraggingOver ? (
                              <div className="flex flex-col items-center justify-center p-8 mt-4 border border-dashed border-asas-silver/20 rounded-sm text-asas-silver bg-black/5 dark:bg-white/5">
                                <Users className="h-6 w-6 mb-3 opacity-30" />
                                <span className="text-[10px] uppercase tracking-widest font-bold">
                                  Zone Vide
                                </span>
                              </div>
                            ) : (
                              colLeads.map((lead, index) => (
                                <LeadCard
                                  key={lead.id}
                                  lead={lead}
                                  index={index}
                                  onSelect={setSelectedLeadId}
                                  onWhatsApp={setWhatsAppLead}
                                  onStatusChange={onStatusChange}
                                  onConvert={handleConvert}
                                />
                              ))
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}

            {/* End of Kanban */}
          </div>
        </DragDropContext>
      </div>

      <LeadDetailModal
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />
      {isCreateModalOpen && (
        <LeadCreateModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            load();
          }}
        />
      )}
      <WhatsAppDrawer
        isOpen={!!whatsAppLead}
        onClose={() => setWhatsAppLead(null)}
        clientName={
          (whatsAppLead as any)?.clients?.full_name || "Client Inconnu"
        }
        clientPhone={(whatsAppLead as any)?.clients?.phone || ""}
        contextType="lead"
        propertyName={(whatsAppLead as any)?.projects?.name}
      />
    </div>
  );
}
