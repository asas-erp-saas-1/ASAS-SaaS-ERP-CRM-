'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, Users, Building, FileText, AlertTriangle, ArrowRight, CheckCircle2, TrendingUp, Clock, Wallet } from 'lucide-react';
import clsx from 'clsx';

function SectionHeader({ title, subtitle, icon: Icon }: any) {
  return (
    <div className="mb-6 border-b border-asas-charcoal/10 pb-4">
      <h2 className="text-xl font-bold font-display uppercase tracking-widest text-asas-navy flex items-center gap-3">
        <Icon className="w-6 h-6 text-asas-gold" />
        {title}
      </h2>
      <p className="text-xs uppercase font-bold tracking-widest text-asas-silver mt-1">{subtitle}</p>
    </div>
  );
}

export default function OSExecutionDashboard() {
  const [activeModule, setActiveModule] = useState<'crm' | 'finance' | 'chantier'>('crm');

  const modules = [
    { id: 'crm', label: 'Opérations Commerciales', icon: Users },
    { id: 'finance', label: 'Grand Livre & Trésorerie', icon: Wallet },
    { id: 'chantier', label: 'Promotion & Chantiers', icon: Building },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* OS Navigation Rail */}
      <div className="w-full md:w-64 bg-asas-navy text-white flex flex-col shadow-2xl z-10 shrink-0">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-black tracking-tighter text-asas-gold font-display uppercase">ASAS <span className="text-white">OS</span></h1>
          <p className="text-[9px] uppercase tracking-widest text-white/50 mt-1 font-bold">Enterprise Execution Engine / ALGERIA</p>
        </div>
        
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="text-[10px] uppercase font-bold tracking-widest text-white/40 px-2 mt-4 mb-2">Modules Opérationnels</p>
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id as any)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-sm text-xs font-bold uppercase tracking-widest transition-all text-left",
                activeModule === m.id 
                  ? "bg-asas-gold/20 text-asas-gold border border-asas-gold/30" 
                  : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent"
              )}
            >
              <m.icon className="w-4 h-4" /> {m.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-asas-gold flex items-center justify-center text-asas-navy font-bold text-sm">
              AM
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-white">Agent Manager</p>
              <p className="text-[9px] text-white/50 uppercase tracking-widest">Succursale Alger Centre</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Execution Area */}
      <div className="flex-1 overflow-x-hidden bg-[#F4ECDA]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-8 max-w-6xl mx-auto"
          >
            {activeModule === 'crm' && <CRMModule />}
            {activeModule === 'finance' && <FinanceModule />}
            {activeModule === 'chantier' && <ChantierModule />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// CRM EXECUTION MODULE (Phase D)
// ------------------------------------------------------------------
function CRMModule() {
  const executionTasks = [
    { title: "Valider Financement", client: "Amine K.", deal: "Appartement F4 - Résidence Les Pins", SLA: "Dépassement de 4h", status: "critical" },
    { title: "Programmer Visite Notaire", client: "Sarah B.", deal: "Villa Mazafran - Acte", SLA: "Reste 2 jours", status: "warning" },
    { title: "Relance Vente sur Plan", client: "Khaled M.", deal: "Résidence Oran Ouest", SLA: "Reste 4 heures", status: "action" }
  ];

  return (
    <div className="space-y-8">
      <SectionHeader 
        title="CRM & Commercial Operations" 
        subtitle="Orchestration des ventes, SLA et engagements client" 
        icon={Users} 
      />

      <div className="bg-white rounded-sm border border-asas-charcoal/10 shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <span className="px-3 py-1 bg-red-500/10 text-red-600 border border-red-500/20 text-[9px] uppercase font-bold tracking-widest rounded-sm">
            Mode Execution Stricte
          </span>
        </div>
        
        <h3 className="text-sm uppercase font-bold tracking-widest text-asas-charcoal mb-6">File de Tâches Immédiates (SLA)</h3>
        <div className="space-y-4">
          {executionTasks.map((task, i) => (
            <div key={i} className={clsx(
              "p-4 rounded-sm border flex items-center justify-between transition-colors hover:shadow-md bg-white",
              task.status === 'critical' ? "border-red-500/40" : 
              task.status === 'warning' ? "border-amber-500/40" : "border-asas-charcoal/20"
            )}>
              <div className="flex items-center gap-4">
                <div className={clsx(
                  "w-10 h-10 rounded-sm flex items-center justify-center",
                  task.status === 'critical' ? "bg-red-500/10 text-red-600" :
                  task.status === 'warning' ? "bg-amber-500/10 text-amber-600" : "bg-asas-charcoal/5 text-asas-charcoal"
                )}>
                  {task.status === 'critical' ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-asas-navy uppercase tracking-wide">{task.title}</h4>
                  <p className="text-xs text-asas-charcoal/70 mt-0.5">{task.client} — <span className="font-mono">{task.deal}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={clsx(
                  "text-[10px] uppercase font-bold tracking-widest px-2 py-1 bg-gray-100 rounded-sm border",
                  task.status === 'critical' ? "text-red-600 border-red-500/20" : "text-asas-charcoal border-transparent"
                )}>
                  {task.SLA}
                </span>
                <button className="px-5 py-2 bg-asas-navy hover:bg-asas-navy/90 text-white text-[10px] uppercase font-bold tracking-widest rounded-sm flex items-center gap-2 transition-colors">
                  Exécuter <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// FINANCE EXECUTION MODULE (Phase E)
// ------------------------------------------------------------------
function FinanceModule() {
  return (
    <div className="space-y-8">
      <SectionHeader 
        title="Finance & Trésorerie Centralisée" 
        subtitle="Grand Livre Immuable, Encaissements et Gestion du BFR" 
        icon={Wallet} 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Trésorerie Disponible", value: "DZD 45,200,000", change: "+12%" },
          { label: "Créances Clients (Retards)", value: "DZD 8,450,000", change: "-5%", alert: true },
          { label: "Engagements Fournisseurs", value: "DZD 12,100,000", change: "Stable" }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-sm border border-asas-charcoal/10 shadow-sm border-t-2 border-t-asas-gold">
            <p className="text-[10px] uppercase font-bold tracking-widest text-asas-silver mb-2">{kpi.label}</p>
            <h3 className="text-2xl font-mono text-asas-navy font-bold">{kpi.value}</h3>
            <p className={clsx("text-xs font-bold mt-2", kpi.alert ? "text-red-500" : "text-asas-emerald")}>
              {kpi.change} vs mois préc.
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-sm border border-asas-charcoal/10 shadow-sm overflow-hidden">
        <div className="p-4 bg-asas-charcoal/5 border-b border-asas-charcoal/10 flex justify-between items-center">
          <h3 className="text-xs uppercase font-bold tracking-widest text-asas-navy">Extrait du Grand Livre (Immuable)</h3>
          <span className="text-[9px] uppercase font-bold text-asas-silver tracking-widest bg-white px-2 py-1 rounded-sm shadow-sm border border-asas-charcoal/5">
            Double Entrée Stricte Active
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-asas-charcoal/10 text-[9px] uppercase tracking-widest text-asas-silver font-bold">
                <th className="p-4 w-32">Date & ID</th>
                <th className="p-4">Description</th>
                <th className="p-4">Comptes impactés</th>
                <th className="p-4 text-right">Débit (DZD)</th>
                <th className="p-4 text-right">Crédit (DZD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-asas-charcoal/5">
              <tr className="hover:bg-asas-charcoal/5 transition-colors">
                <td className="p-4 font-mono text-xs">27-05-2026<br/><span className="text-asas-silver">TRX-9481</span></td>
                <td className="p-4 text-sm font-bold text-asas-navy">Paiement Partiel Chèque - Vente R12<br/><span className="text-[9px] uppercase text-asas-silver font-bold">Dossier: Amine K.</span></td>
                <td className="p-4 text-xs font-mono text-asas-charcoal/80">
                  <div className="flex flex-col gap-1">
                    <span>512 - Banque BNA</span>
                    <span className="pl-4">411 - Clients (Avances)</span>
                  </div>
                </td>
                <td className="p-4 text-right font-mono text-sm text-asas-charcoal">4,500,000<br/><span className="text-transparent">-</span></td>
                <td className="p-4 text-right font-mono text-sm text-asas-charcoal"><span className="text-transparent">-</span><br/>4,500,000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// CHANTIER / PROMOTION MODULE (Phase F/G)
// ------------------------------------------------------------------
function ChantierModule() {
  return (
    <div className="space-y-8">
      <SectionHeader 
        title="Opérations de Promotion" 
        subtitle="Orchestration Chantiers, Avancements et Déclenchements d'Appels de Fonds" 
        icon={Building} 
      />

      <div className="bg-white rounded-sm border border-asas-charcoal/10 shadow-sm p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4">
          <span className="px-3 py-1 bg-asas-emerald/10 text-asas-emerald border border-asas-emerald/20 text-[9px] uppercase font-bold tracking-widest rounded-sm">
            Phase Active
          </span>
        </div>
        <h3 className="text-lg font-bold text-asas-navy uppercase tracking-widest mb-1">Résidence El-Biar (Phase 2)</h3>
        <p className="text-xs font-bold text-asas-silver uppercase tracking-widest mb-8">Statut Technique : Gros Œuvres • Étage 4</p>
        
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-asas-charcoal mb-2">
              <span>Avancement Chantier Constaté</span>
              <span>45%</span>
            </div>
            <div className="h-4 bg-asas-charcoal/5 rounded-sm overflow-hidden border border-asas-charcoal/10">
              <div className="h-full bg-asas-navy w-[45%]" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-asas-charcoal/10">
            <div className="p-4 border border-asas-charcoal/10 rounded-sm bg-asas-gold/5">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-asas-gold mb-2">Automatisations Financières</h4>
              <p className="text-sm font-bold text-asas-navy mb-4">Déclenchement Appel de Fonds N°3</p>
              <p className="text-xs text-asas-charcoal/70 mb-4">Le jalon "Dalle 4ème étage" ayant été validé par l'ingénieur, l'appel de fonds (15% pour 12 acquéreurs) doit être généré.</p>
              <button className="w-full py-2 bg-asas-navy text-white text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-colors rounded-sm">
                <FileText className="w-3.5 h-3.5" /> Générer 12 Avis de Paiement
              </button>
            </div>
            <div className="p-4 border border-red-500/20 rounded-sm bg-red-500/5">
               <h4 className="text-[10px] uppercase font-bold tracking-widest text-red-600 mb-2">Goulet d'Étranglement (SLA Achat)</h4>
               <p className="text-sm font-bold text-red-600 mb-4">Rupture imminente : Ciment (Silos)</p>
               <p className="text-xs text-red-600/80 mb-4">Commande fournisseur BCR en attente d'approbation financière au niveau du siège.</p>
               <button className="w-full py-2 bg-red-600 text-white text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-2 hover:bg-red-700 transition-colors rounded-sm">
                 <AlertTriangle className="w-3.5 h-3.5" /> Escalader à la Direction
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
