// src/app/dashboard/deals/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Handshake,
  AlertTriangle,
  Clock,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Phone,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { DealIntelligencePanel } from "@/modules/deals/components/DealIntelligencePanel";
import type { Deal } from "@/types/app";
import { CancelDealModal } from "./CancelDealModal";
import { WhatsAppDrawer } from "@/components/WhatsAppDrawer";

import { DealActionDrawer } from "./DealActionDrawer";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  draft:
    "bg-gray-800 text-asas-charcoal/90 dark:text-asas-sand/90 border-gray-700",
  active: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  negotiation: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  notary: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  closed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const RISK_STYLE: Record<string, string> = {
  low: "bg-gray-600",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const COLUMNS = [
  {
    key: "draft",
    label: "Validation VSP",
    color:
      "bg-asas-silver/10 border-asas-silver/20 text-asas-charcoal dark:text-asas-silver",
    dot: "bg-asas-silver",
  },
  {
    key: "active",
    label: "Appels de Fonds",
    color:
      "bg-asas-navy/10 border-asas-navy/20 text-asas-navy dark:text-asas-sand/80",
    dot: "bg-asas-navy",
  },
  {
    key: "negotiation",
    label: "Négociation",
    color: "bg-asas-copper/10 border-asas-copper/20 text-asas-copper",
    dot: "bg-asas-copper",
  },
  {
    key: "notary",
    label: "Attente Notaire",
    color: "bg-asas-gold/10 border-asas-gold/20 text-asas-gold",
    dot: "bg-asas-gold",
  },
  {
    key: "closed",
    label: "Soldé & Livré",
    color: "bg-asas-emerald/10 border-asas-emerald/20 text-asas-emerald",
    dot: "bg-asas-emerald",
  },
  {
    key: "cancelled",
    label: "Annulé",
    color: "bg-red-500/10 border-red-500/20 text-red-500",
    dot: "bg-red-500",
  },
] as const;

type DealStatus = (typeof COLUMNS)[number]["key"];

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M DZD";
  return new Intl.NumberFormat("fr-DZ").format(n) + " DZD";
}

// ─── Deal Card ─────────────────────────────────────────────────────────────────
function DealCard({
  deal,
  isSelected,
  onSelect,
  onWhatsApp,
  onStatusChange,
  index,
}: {
  deal: Deal;
  isSelected: boolean;
  onSelect: () => void;
  onWhatsApp: (deal: Deal) => void;
  onStatusChange: (id: string, s: string) => void;
  index: number;
}) {
  const agreedPrice = (deal as any).agreed_price || (deal as any).amount || 0;
  const paymentsReceived = (deal as any).total_payments_received || 0;
  const pct =
    agreedPrice > 0 ? Math.round((paymentsReceived / agreedPrice) * 100) : 0;

  const isOverdue =
    deal.next_action_due &&
    new Date(deal.next_action_due) < new Date() &&
    !["closed", "cancelled"].includes(deal.status || "");

  let mandatoryAction = "";
  let mandatoryActionColor = "";

  if (deal.status === "draft") {
      mandatoryAction = "VALIDER CONTRAT VSP";
      mandatoryActionColor = "bg-asas-silver/10 text-asas-charcoal dark:text-asas-silver/70 border-asas-silver/20";
  } else if (deal.status === "active") {
      mandatoryAction = "SURVEILLER VERSEMENTS" + (isOverdue ? " - EN RETARD!" : "");
      mandatoryActionColor = isOverdue ? "bg-red-500/10 text-red-500 border-red-500/30" : "bg-asas-navy/10 text-asas-navy dark:text-asas-sand border-asas-navy/20";
  } else if (deal.status === "negotiation") {
      mandatoryAction = "COMPLÉTER DOSSIER FINANCEMENT";
      mandatoryActionColor = "bg-asas-copper/10 text-asas-copper border-asas-copper/20";
  } else if (deal.status === "notary") {
      mandatoryAction = "OBTENIR SIGNATURE NOTAIRE";
      mandatoryActionColor = "bg-asas-gold/10 text-asas-gold border-asas-gold/30";
  } else if (deal.status === "closed") {
      mandatoryAction = "LIVRAISON EFFECTUÉE";
      mandatoryActionColor = "bg-asas-emerald/10 text-asas-emerald border-asas-emerald/30";
  } else if (deal.status === "cancelled") {
      mandatoryAction = "DOSSIER ARCHIVÉ";
      mandatoryActionColor = "bg-red-500/10 text-red-500 border-red-500/30";
  }

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onSelect}
          className={clsx(
            "bg-white dark:bg-[#141618] rounded-sm border p-4 shadow-sm transition-all cursor-pointer select-none hover:border-asas-gold/40 relative",
            isSelected
              ? "border-asas-gold/50 ring-1 ring-asas-gold/50"
              : "border-asas-silver/20",
            snapshot.isDragging &&
              "shadow-lg shadow-asas-gold/10 ring-1 ring-asas-gold/50 rotate-1 scale-105 z-50 cursor-grabbing bg-asas-sand/50 dark:bg-[#1C1E20]"
          )}
        >
          {/* Execution Requirement Banner */}
          {mandatoryAction && (
              <div className={clsx(
                  "absolute top-0 left-0 right-0 py-0.5 px-2 text-[8px] uppercase tracking-widest font-black text-center border-b",
                  mandatoryActionColor
              )}>
                  {mandatoryAction}
              </div>
          )}

          <div className="flex items-start justify-between gap-2 mb-3 mt-3">
            <div className="flex-1 min-w-0">
              <p
                className={clsx(
                  "font-bold text-sm truncate",
                  isSelected
                    ? "text-asas-charcoal dark:text-asas-sand"
                    : "text-asas-charcoal dark:text-asas-sand/80",
                )}
              >
                {(deal as any).clients?.full_name ?? "Client Inconnu"}
              </p>
              {(deal as any).properties?.projects?.name && (
                <p className="text-xs text-asas-silver mt-1 truncate">
                  {(deal as any).properties.projects.name}
                </p>
              )}
            </div>
            <div
              className={clsx(
                "h-2.5 w-2.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.1)] border border-asas-silver/20 mt-1",
                RISK_STYLE[deal.risk_level || "low"],
              )}
            />
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <span className="text-sm font-bold text-asas-navy dark:text-asas-sand font-mono">
              {fmt(agreedPrice)}
            </span>
            {deal.next_action && (
              <span
                className={clsx(
                  "text-[9px] uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded-sm border w-fit font-bold",
                  isOverdue
                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                    : "bg-black/5 dark:bg-white/5 text-asas-silver border-asas-silver/10",
                )}
              >
                {isOverdue && <AlertTriangle className="h-3 w-3" />}
                <Clock className="h-3 w-3" />
                {deal.next_action}
              </span>
            )}
          </div>

          <div className="flex flex-col w-full">
            <div className="w-full flex justify-between text-[9px] uppercase font-bold tracking-wider mb-1.5">
              <span
                className={
                  pct === 100 ? "text-asas-emerald" : "text-asas-silver"
                }
              >
                Payé
              </span>
              <span className="text-asas-charcoal dark:text-asas-sand font-mono">
                {pct}%
              </span>
            </div>
            <div className="w-full h-1 bg-asas-sand/50 dark:bg-black/20 rounded-full overflow-hidden mb-4">
              <div
                style={{ width: `${pct}%` }}
                className={clsx(
                  "h-full rounded-full transition-all duration-500",
                  pct === 100
                    ? "bg-asas-emerald"
                    : pct > 0
                      ? "bg-asas-gold"
                      : "bg-asas-silver/40",
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-asas-silver/10 mt-2">
              <div
                className="relative isolate"
                onClick={(e) => e.stopPropagation()}
              >
                <select
                  value={deal.status}
                  onChange={(e) => onStatusChange(deal.id, e.target.value)}
                  className="appearance-none block w-[110px] bg-asas-sand/50 dark:bg-[#141618] border border-asas-silver/20 text-asas-charcoal dark:text-asas-sand text-[9px] uppercase tracking-widest font-bold py-2 pl-2 pr-6 rounded-sm focus:outline-none focus:border-asas-gold/50 cursor-pointer text-ellipsis"
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
                  onWhatsApp(deal);
                }}
                className="flex items-center justify-center p-2 border border-asas-silver/20 bg-[#25D366]/5 dark:bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/10 rounded-sm transition-all shadow-sm"
                title="Message WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className="ml-auto flex items-center justify-center min-w-[70px] gap-1.5 text-[9px] uppercase tracking-widest font-bold bg-asas-charcoal dark:bg-asas-sand text-asas-sand dark:text-asas-charcoal px-3 py-2 rounded-sm hover:bg-black dark:hover:bg-white transition-all shadow-sm"
              >
                Ouvrir
              </button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [cancelDealInfo, setCancelDealInfo] = useState<{
    id: string;
    version: number;
  } | null>(null);
  const [whatsAppDeal, setWhatsAppDeal] = useState<Deal | null>(null);

  const LIMIT = 100;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (statusFilter)
        statusFilter
          .split(",")
          .forEach((s) => params.append("status", s.trim()));

      const res = await fetch(`/api/deals?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      let results: Deal[] = data.data ?? [];

      // Client-side search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        results = results.filter(
          (d) =>
            (d as any).clients?.full_name?.toLowerCase().includes(q) ||
            (d as any).properties?.projects?.name?.toLowerCase().includes(q) ||
            d.next_action?.toLowerCase().includes(q),
        );
      }

      setDeals(results);
      setTotal(data.count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function onStatusChange(dealId: string, newStatus: string) {
    if (newStatus === "cancelled") {
      const dealVersion = deals.find((d) => d.id === dealId)?.version || 1;
      setCancelDealInfo({ id: dealId, version: dealVersion });
      return;
    }

    setDeals((current) =>
      current.map((deal) =>
        deal.id === dealId
          ? { ...deal, status: newStatus as any, version: deal.version + 1 }
          : deal,
      ),
    );

    try {
      const { v4: uuidv4 } = await import("uuid");
      const dealVersion = deals.find((d) => d.id === dealId)?.version || 1;

      const res = await fetch("/api/command-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commandId: uuidv4(),
          aggregateId: dealId,
          type: "SET_DEAL_STAGE",
          expectedVersion: dealVersion,
          payload: { stage: newStatus },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Conflict");
    } catch (e: any) {
      import("@/lib/observability/errors").then((mod) =>
        mod.ErrorTracker.captureError(e, {
          context: "DealsPage onStatusChange",
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

    const newStatus = destination.droppableId as DealStatus;
    const dealVersion = deals.find((d) => d.id === draggableId)?.version || 1;

    if (newStatus === "cancelled") {
      setCancelDealInfo({ id: draggableId, version: dealVersion });
      return;
    }

    // Optimistic update
    setDeals((current) =>
      current.map((deal) =>
        deal.id === draggableId
          ? { ...deal, status: newStatus as any, version: deal.version + 1 }
          : deal,
      ),
    );

    try {
      // 1. You could execute an optimistic transition right here if you passed state up.
      const { v4: uuidv4 } = await import("uuid");

      const res = await fetch("/api/command-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commandId: uuidv4(),
          aggregateId: draggableId,
          type: "SET_DEAL_STAGE",
          expectedVersion: dealVersion,
          payload: { stage: newStatus },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Conflict");
    } catch (e: any) {
      import("@/lib/observability/errors").then((mod) =>
        mod.ErrorTracker.captureError(e, { context: "DealsPage dragEnd" }),
      );
      // Revert on error
      load();
    }
  }

  // Group by status
  const byStatus = (status: string) => deals.filter((d) => d.status === status);

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-white dark:bg-[#141618] rounded-sm shadow-sm border border-asas-silver/20 text-asas-charcoal dark:text-asas-sand relative">
      {/* List / Kanban */}
      <div className="flex flex-col bg-white dark:bg-[#141618] overflow-hidden transition-all duration-300 ease-in-out w-full">
        {/* Header */}
        <div className="px-6 py-5 border-b border-asas-silver/20 bg-asas-sand/30 dark:bg-black/10 z-10 shrink-0">
          <div className="flex w-full items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-asas-charcoal dark:text-asas-sand flex items-center gap-2 tracking-tight font-display uppercase">
                Transactions
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-asas-silver font-bold mt-1.5 hidden sm:block">
                {total} actives sur le réseau
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/deals/new")}
              className="flex items-center gap-2 px-4 py-2.5 bg-asas-charcoal hover:bg-black dark:bg-asas-sand dark:hover:bg-white text-asas-sand dark:text-asas-charcoal rounded-sm text-xs font-bold transition-all border border-transparent shrink-0 shadow-sm"
            >
              <Plus className="h-4 w-4" strokeWidth={2} /> Initier Deal
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-asas-silver" />
            <input
              type="text"
              placeholder="Rechercher entité, projet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-transparent text-sm font-medium border border-asas-silver/40 rounded-sm focus:outline-none focus:border-asas-gold focus:ring-1 focus:ring-asas-gold text-asas-charcoal dark:text-asas-sand transition-all placeholder:text-asas-silver"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "En cours", value: "active,negotiation" },
              { label: "Tous", value: "" },
              { label: "Brouillon", value: "draft" },
              { label: "Conclu", value: "closed" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setStatus(f.value);
                  setPage(1);
                }}
                className={clsx(
                  "px-4 py-1.5 rounded-sm text-[9px] uppercase tracking-widest font-bold transition-all border",
                  statusFilter === f.value
                    ? "bg-asas-gold/10 text-asas-gold border-asas-gold/20"
                    : "bg-transparent text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand border-asas-silver/20 hover:border-asas-gold/40",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-transparent">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-4 p-6 min-w-max items-start">
              {loading
                ? [...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-[300px] h-[80vh] bg-white dark:bg-[#141618] animate-pulse rounded-sm border border-asas-silver/20"
                    />
                  ))
                : COLUMNS.map((col) => {
                    const colDeals = byStatus(col.key);
                    return (
                      <div
                        key={col.key}
                        className="w-[320px] flex flex-col bg-white dark:bg-[#141618] rounded-sm border border-asas-silver/20 overflow-hidden max-h-full"
                      >
                        {/* Column header */}
                        <div className="px-5 py-4 border-b border-asas-silver/10 bg-white dark:bg-[#141618] flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-2">
                            <div
                              className={clsx(
                                "h-2 w-2 rounded-full inline-block",
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
                            {colDeals.length}
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
                              {colDeals.length === 0 &&
                              !snapshot.isDraggingOver ? (
                                <div className="flex flex-col items-center justify-center p-8 mt-4 border border-dashed border-asas-silver/20 rounded-sm text-asas-silver bg-black/5 dark:bg-white/5">
                                  <Handshake className="h-6 w-6 mb-3 opacity-30 text-asas-silver" />
                                  <span className="text-[10px] uppercase tracking-widest font-bold">
                                    Zone Vide
                                  </span>
                                </div>
                              ) : (
                                colDeals.map((deal, index) => (
                                  <DealCard
                                    key={deal.id}
                                    deal={deal}
                                    index={index}
                                    isSelected={deal.id === selectedId}
                                    onSelect={() =>
                                      setSelectedId(
                                        deal.id === selectedId ? null : deal.id,
                                      )
                                    }
                                    onWhatsApp={setWhatsAppDeal}
                                    onStatusChange={onStatusChange}
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
            </div>
          </DragDropContext>
        </div>

        {/* Pagination - only show if needed */}
        {total > LIMIT && (
          <div className="px-6 py-4 border-t border-asas-silver/20 bg-white dark:bg-[#141618] flex items-center justify-between shrink-0">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 rounded-lg text-xs font-bold text-asas-charcoal/80 dark:text-asas-silver bg-white dark:bg-[#141618] border border-black/5 dark:border-white/5 disabled:opacity-40 hover:text-asas-charcoal dark:text-asas-sand"
            >
              Précédent
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-asas-silver">
              Page {page} / {Math.ceil(total / LIMIT)}
            </span>
            <button
              disabled={page >= Math.ceil(total / LIMIT)}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 bg-asas-sand/30 dark:bg-[#050505] border border-black/5 dark:border-white/5 disabled:opacity-40 hover:text-gray-900 dark:text-white"
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      {cancelDealInfo && (
        <CancelDealModal
          dealId={cancelDealInfo.id}
          dealVersion={cancelDealInfo.version}
          onClose={() => setCancelDealInfo(null)}
          onSuccess={() => {
            setCancelDealInfo(null);
            load();
          }}
        />
      )}

      <DealActionDrawer
        dealId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      <WhatsAppDrawer
        isOpen={!!whatsAppDeal}
        onClose={() => setWhatsAppDeal(null)}
        clientName={
          (whatsAppDeal as any)?.clients?.full_name || "Client Inconnu"
        }
        clientPhone={(whatsAppDeal as any)?.clients?.phone || ""}
        contextType="deal"
        propertyName={(whatsAppDeal as any)?.properties?.projects?.name}
      />
    </div>
  );
}
