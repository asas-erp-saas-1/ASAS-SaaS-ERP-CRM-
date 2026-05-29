'use client'

import { useEffect, useState, useCallback } from 'react';
import { 
  Zap, CheckSquare, Clock, AlertTriangle, Play, RefreshCw, Send, CheckCircle, 
  XCircle, Lock, ShieldAlert, Wrench, Activity, FileSignature, History, 
  UserCheck, Database, Award, HelpCircle, PhoneCall, Check, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

export default function OrchestratorWorkspace() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workflows' | 'slas' | 'approvals' | 'automation' | 'recovery' | 'timeline'>('workflows');
  const [actingRole, setActingRole] = useState<'branch_manager' | 'engineer' | 'accountant' | 'owner'>('branch_manager');
  const [submittingApprovals, setSubmittingApprovals] = useState<Record<string, boolean>>({});
  const [eventTriggering, setEventTriggering] = useState(false);
  const [healingRunning, setHealingRunning] = useState<Record<string, boolean>>({});
  
  // Form input states
  const [newDepParent, setNewDepParent] = useState('');
  const [newDepChild, setNewDepChild] = useState('');
  const [depAdding, setDepAdding] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/automation');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load automation engine state: ", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Simulate Event Trigger
  const handleTriggerEvent = async (eventType: string, title?: string, desc?: string, category?: string) => {
    setEventTriggering(true);
    try {
      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger_event',
          eventType,
          title,
          desc,
          category,
          payload: { timestamp: new Date().toISOString(), triggerCode: `SIM-${Math.random().toString(36).substring(7).toUpperCase()}` }
        })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEventTriggering(false);
    }
  };

  // Submit Approval Signature Action
  const handleApprovalDecision = async (requestId: string, stepId: string, status: 'approved' | 'rejected', comment: string) => {
    setSubmittingApprovals(prev => ({ ...prev, [stepId]: true }));
    try {
      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_approval_decision',
          requestId,
          stepId,
          status,
          comment
        })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingApprovals(prev => ({ ...prev, [stepId]: false }));
    }
  };

  // Trigger Self-Healing Recovery
  const handleSelfHealing = async (jobId: string) => {
    setHealingRunning(prev => ({ ...prev, [jobId]: true }));
    try {
      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate_recovery',
          jobId
        })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHealingRunning(prev => ({ ...prev, [jobId]: false }));
    }
  };

  // Create Task Dependency Finish-to-Start connection
  const handleCreateDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepParent || !newDepChild || newDepParent === newDepChild) return;
    setDepAdding(true);
    try {
      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_dependency',
          taskId: newDepChild,
          dependsOnTaskId: newDepParent,
          dependencyType: 'finish_to_start'
        })
      });
      if (res.ok) {
        setNewDepParent('');
        setNewDepChild('');
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDepAdding(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-asas-silver animate-pulse">
        <RefreshCw className="h-8 w-8 text-asas-gold animate-spin mb-4" />
        <p className="text-[10px] uppercase font-bold tracking-widest font-mono">Connexion au moteur d'orchestration...</p>
      </div>
    );
  }

  const { layers } = data || { layers: {} };
  const { 
    tasks = [], dependencies = [], sla_policies = [], sla_violations = [], 
    automation_rules = [], automation_executions = [], approval_requests = [], 
    approval_steps = [], escalations = [], schedules = [], notifications = [], 
    recovery_jobs = [], timeline = [] 
  } = layers;

  // Render Layout
  return (
    <div className="flex-1 flex flex-col space-y-8 bg-transparent">
      {/* Banner */}
      <div className="bg-asas-charcoal border-b border-asas-silver/20 px-6 py-6 pb-8 relative group rounded-sm shadow-xl overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
          style={{ 
            backgroundImage: 'radial-gradient(circle at center, #C7A15A 1.5px, transparent 1.5px)', 
            backgroundSize: '24px 24px' 
          }} 
        />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] uppercase tracking-widest bg-asas-gold/10 text-asas-gold px-2.5 py-1 rounded-sm border border-asas-gold/20 font-bold flex items-center gap-1.5">
                <Activity className="h-3 w-3 animate-pulse" /> Layer 1-10 Orchestrator
              </span>
              <span className="text-[9px] uppercase tracking-widest bg-[#141618] text-asas-sand border border-asas-silver/10 px-2 py-1 rounded-sm font-bold">
                 Algerian Operational Reality Enabled
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white uppercase">
              Chef d'Orchestre <span className="text-asas-silver/40 font-light mx-2">|</span> Autopilote Événementiel
            </h1>
            <p className="text-[10px] sm:text-xs text-asas-silver uppercase font-bold tracking-widest mt-1.5 leading-relaxed">
              Moteur opérationnel, enforcement SLA, ordonnanceur comptable et workflows d'auto-remédiation
            </p>
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-asas-gold/20 text-asas-gold font-bold text-[10px] uppercase tracking-widest hover:bg-asas-gold/10 active:scale-95 transition-all rounded-sm cursor-pointer shadow-inner"
          >
            <RefreshCw className="h-4 w-4" /> Recalibrer les moteurs
          </button>
        </div>
      </div>

      {/* Interactive Simulation Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column sidebar for Event Bus Simulation Control Panel */}
        <div className="lg:col-span-1 bg-white dark:bg-[#141618] border border-asas-silver/20 p-5 rounded-sm flex flex-col space-y-6 shadow-sm">
          <div>
            <h2 className="text-xs uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand border-b border-asas-silver/10 pb-3 flex items-center gap-2 font-display">
              <Database className="h-4 w-4 text-asas-gold" /> Bus d'Événements
            </h2>
            <p className="text-[10px] text-asas-silver font-bold uppercase tracking-wider mt-2">
              Injecter un événement physique métier pour simuler le déclenchement en chaîne
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {/* Simulation Scenarios */}
            <h3 className="text-[9px] font-bold text-asas-silver uppercase tracking-widest">Scénarios Algériens Types</h3>
            
            <button
              onClick={() => handleTriggerEvent(
                'milestone.validated', 
                'Jalon Coulage Dalle Validé', 
                'Dalle Bloc A coulée et inspectée. Déclenche appel de fonds client & commande ciment pour le Bloc B.',
                'milestone'
              )}
              disabled={eventTriggering}
              className="w-full text-left p-3.5 bg-asas-sand/50 dark:bg-black/20 hover:bg-asas-gold/5 border border-asas-silver/10 hover:border-asas-gold/40 rounded-sm text-xs font-medium text-asas-charcoal dark:text-asas-sand hover:translate-x-1 transition-all flex items-start gap-2.5 group cursor-pointer"
            >
              <Zap className="h-4.5 w-4.5 text-asas-gold shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider text-[9px] text-asas-gold group-hover:text-asas-copper transition-colors">Coulage Dalle Validé</p>
                <p className="text-[9px] text-asas-silver/80 font-bold uppercase mt-1">Génère appel de fonds client · Débloque ciment</p>
              </div>
            </button>

            <button
              onClick={() => handleTriggerEvent(
                'deal_payment.overdue', 
                'Appel de fonds dépassé de 5j', 
                'Versement de tranche CNEP en attente pour le client Meftah. Déclenche alerte WhatsApp automatique et relance.',
                'financial'
              )}
              disabled={eventTriggering}
              className="w-full text-left p-3.5 bg-asas-sand/50 dark:bg-black/20 hover:bg-asas-gold/5 border border-asas-silver/10 hover:border-asas-gold/40 rounded-sm text-xs font-medium text-asas-charcoal dark:text-asas-sand hover:translate-x-1 transition-all flex items-start gap-2.5 group cursor-pointer"
            >
              <Clock className="h-4.5 w-4.5 text-asas-gold shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider text-[9px] text-asas-gold group-hover:text-asas-copper transition-colors">Retard Versement Tranche</p>
                <p className="text-[9px] text-asas-silver/80 font-bold uppercase mt-1">Vérifie l'échéance · Prépare alerte de recouvrement</p>
              </div>
            </button>

            <button
              onClick={() => handleTriggerEvent(
                'notary.edd_approved', 
                'État descriptif certifié par Notaire', 
                "Signature définitive de l'État descriptif de division à Blida. Débloque le pipeline du dossier crédit banque.",
                'approval'
              )}
              disabled={eventTriggering}
              className="w-full text-left p-3.5 bg-asas-sand/50 dark:bg-black/20 hover:bg-asas-gold/5 border border-asas-silver/10 hover:border-asas-gold/40 rounded-sm text-xs font-medium text-asas-charcoal dark:text-asas-sand hover:translate-x-1 transition-all flex items-start gap-2.5 group cursor-pointer"
            >
              <FileSignature className="h-4.5 w-4.5 text-asas-gold shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider text-[9px] text-asas-gold group-hover:text-asas-copper transition-colors">EDD Notarié Approuvé</p>
                <p className="text-[9px] text-asas-silver/80 font-bold uppercase mt-1">Signé Maître Bouaza Blida · Débloque dossier crédit</p>
              </div>
            </button>
          </div>

          {/* Active Acting Roles for Approvals */}
          <div className="border-t border-asas-silver/10 pt-5">
            <h3 className="text-[9px] font-bold text-asas-silver uppercase tracking-widest mb-3">Rôle Acteur Courant (Simulation)</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'branch_manager', label: 'Dir. Agence' },
                { key: 'engineer', label: 'Ingénieur' },
                { key: 'accountant', label: 'Comptable' },
                { key: 'owner', label: 'CEO ASAS' }
              ].map(role => (
                <button
                  key={role.key}
                  onClick={() => setActingRole(role.key as any)}
                  className={clsx(
                    'p-2 text-[9px] uppercase font-bold tracking-widest rounded-sm border transition-all text-center cursor-pointer',
                    actingRole === role.key 
                      ? 'bg-asas-gold border-transparent text-white shadow-md' 
                      : 'bg-asas-sand/35 dark:bg-black/10 text-asas-silver border-asas-silver/10 hover:text-asas-charcoal dark:hover:text-white'
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>
            <p className="text-[8px] uppercase tracking-widest text-asas-silver mt-2 text-center font-bold">
               Pour tester les approbations selon la hiérarchie.
            </p>
          </div>
        </div>

        {/* Right column: Tabbed detailed workspaces */}
        <div className="lg:col-span-3 flex flex-col space-y-6">
          {/* Tab Navigation selectors */}
          <div className="flex gap-2 border-b border-asas-silver/20 pb-px flex-wrap overflow-x-auto">
            {[
              { id: 'workflows', label: 'Tâches & Graphes', count: tasks.length },
              { id: 'slas', label: 'SLA & Vigies', count: sla_violations.length },
              { id: 'approvals', label: 'Approbations & Signatures', count: approval_requests.length },
              { id: 'automation', label: 'Automates & Routines', count: automation_rules.length },
              { id: 'recovery', label: 'Auto-Guérison (V1)', count: recovery_jobs.length },
              { id: 'timeline', label: 'Fil d\'Exécution', count: timeline.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  'px-4 py-3 border-b-2 text-[9px] uppercase font-bold tracking-widest transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:border-asas-gold flex items-center gap-1.5',
                  activeTab === tab.id 
                    ? 'border-asas-gold text-asas-charcoal dark:text-asas-sand' 
                    : 'border-transparent text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand'
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={clsx(
                    'text-[8px] font-extrabold px-1.5 py-0.5 rounded-full min-w-4 text-center block leading-none',
                    activeTab === tab.id ? 'bg-asas-gold text-white' : 'bg-asas-sand dark:bg-[#202325] text-asas-silver'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* TAB CONTENT: WORKFLOWS & DEPENDENCIES */}
            {activeTab === 'workflows' && (
              <motion.div
                key="workflows"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-[#141618] border border-asas-silver/20 p-6 rounded-sm space-y-6 shadow-sm flex flex-col"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-asas-silver/10 pb-4">
                  <div>
                    <h3 className="text-sm uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand font-display flex items-center gap-2">
                      <Lock className="h-4 w-4 text-asas-gold" /> Graphe d'ordonnancement (Layer 1)
                    </h3>
                    <p className="text-[10px] text-asas-silver font-bold uppercase mt-1">
                      Enforcement déterministe Finish-to-Start : Les tâches subsidiaires restent bloquées tant que les antécédents ne sont pas cochés.
                    </p>
                  </div>
                </div>

                {/* Create dependency form */}
                <form onSubmit={handleCreateDependency} className="bg-asas-sand/20 dark:bg-black/10 border border-asas-silver/10 p-4 rounded-sm grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] uppercase tracking-widest text-asas-silver font-bold">Si cette tâche finit :</label>
                    <select
                      value={newDepParent}
                      onChange={e => setNewDepParent(e.target.value)}
                      className="bg-white dark:bg-[#202325] text-xs font-semibold px-3 py-2 border border-asas-silver/20 rounded-sm outline-none w-full"
                    >
                      <option value="">Sélectionner l'antécédent</option>
                      {tasks.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] uppercase tracking-widest text-asas-silver font-bold">Débloquer cette tâche :</label>
                    <select
                      value={newDepChild}
                      onChange={e => setNewDepChild(e.target.value)}
                      className="bg-white dark:bg-[#202325] text-xs font-semibold px-3 py-2 border border-asas-silver/20 rounded-sm outline-none w-full"
                    >
                      <option value="">Sélectionner le sous-dépendant</option>
                      {tasks.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={depAdding || !newDepParent || !newDepChild}
                    className="h-9 px-4 py-2 bg-asas-charcoal dark:bg-asas-sand text-asas-sand dark:text-asas-charcoal font-bold text-[10px] uppercase tracking-widest rounded-sm hover:translate-y-[-1px] transition-all cursor-pointer"
                  >
                    Lier les tâches (DEP)
                  </button>
                </form>

                {/* List Active Dependencies */}
                {dependencies.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-bold text-asas-silver uppercase tracking-widest">Liens d'ordonnancement physiques</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {dependencies.map((dep: any) => (
                        <div key={dep.id} className="p-3 bg-white dark:bg-[#202325] border border-asas-silver/20 rounded-sm flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <span className="text-[8px] uppercase tracking-widest bg-asas-gold/10 text-asas-gold border border-asas-gold/20 px-1.5 py-0.5 rounded-sm font-bold">Finish-to-Start</span>
                            <p className="text-[10px] font-bold text-asas-silver mt-1.5 uppercase truncate"><span className="text-asas-charcoal dark:text-asas-sand">{dep.parent_title || 'Tâche Antécédente'}</span></p>
                            <div className="w-px h-3 bg-asas-silver/30 my-0.5 ml-2"></div>
                            <p className="text-[10px] font-bold text-asas-sand uppercase truncate"><span className="text-red-500">🔒 Bloque :</span> {dep.child_title || 'Tâche Subséquente'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Simulated list of Tasks locking */}
                <div className="space-y-3 pt-4 border-t border-asas-silver/10">
                  <h4 className="text-[9px] font-bold text-asas-silver uppercase tracking-widest">Statut de Verrouillage des opérations chantiers</h4>
                  <div className="space-y-2">
                    {tasks.map((t: any) => {
                      const isBlocked = dependencies.some((d: any) => d.task_id === t.id);
                      return (
                        <div key={t.id} className="p-4 bg-asas-sand/15 dark:bg-black/10 border border-asas-silver/10 rounded-sm flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold text-asas-charcoal dark:text-white flex items-center gap-2">
                              {t.title}
                              {isBlocked && (
                                <span className="text-[8px] uppercase tracking-widest bg-red-500/15 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-sm font-bold flex items-center gap-1">
                                  <Lock className="h-2.5 w-2.5" /> Verrouillé par antécédent
                                </span>
                              )}
                            </p>
                            <p className="text-[9px] uppercase tracking-widest font-bold text-asas-silver mt-2">Priorité: {t.priority} · Échéance: {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'ASAP'}</p>
                          </div>
                          <div>
                            {isBlocked ? (
                              <button disabled className="px-3 py-1 bg-red-500/5 text-red-500/50 text-[9px] font-bold uppercase tracking-wider rounded-sm border border-red-500/10">
                                Bloqué
                              </button>
                            ) : (
                              <button disabled className="px-3 py-1 bg-asas-emerald/20 text-asas-emerald text-[9px] font-bold uppercase tracking-wider rounded-sm border border-asas-emerald/30">
                                Prêt
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB CONTENT: SLA POLICIES & VIOLATIONS */}
            {activeTab === 'slas' && (
              <motion.div
                key="slas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-[#141618] border border-asas-silver/20 p-6 rounded-sm space-y-6 shadow-sm flex flex-col"
              >
                <div>
                  <h3 className="text-sm uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand font-display flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-asas-gold" /> Vigie & SLAs Exécutifs (Layer 2)
                  </h3>
                  <p className="text-[10px] text-asas-silver font-bold uppercase mt-1">
                    Délais impératifs de traitement opérationnels (Enforcement de rappel commerical sous 4h ou appel virement de banque Algérie).
                  </p>
                </div>

                {/* Policies List */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {sla_policies.map((p: any) => (
                    <div key={p.id} className="p-4 bg-white dark:bg-[#202325] border border-asas-silver/20 rounded-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] uppercase tracking-widest bg-asas-gold/10 text-asas-gold border border-asas-gold/20 px-2.5 py-0.5 rounded-sm font-extrabold">{p.target_entity} policy</span>
                        <span className="h-2 w-2 rounded-full bg-asas-emerald"></span>
                      </div>
                      <p className="text-xs font-bold text-asas-charcoal dark:text-white mt-3">{p.name}</p>
                      <p className="text-[9px] uppercase font-bold tracking-widest text-asas-silver mt-2">Délai Max : {p.max_duration_hours}h · Alerte à : {p.warning_threshold_hours}h</p>
                    </div>
                  ))}
                </div>

                {/* Active Violations List */}
                <div className="space-y-3 pt-4 border-t border-asas-silver/10">
                  <h4 className="text-[9px] font-bold text-asas-silver uppercase tracking-widest">Infractions Active / Vigie de non-conformité</h4>
                  <div className="space-y-3">
                    {sla_violations.map((v: any) => (
                      <div key={v.id} className={clsx(
                        'p-4 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border',
                        v.status === 'resolved' ? 'bg-asas-emerald/5 border-asas-emerald/20 text-asas-emerald' : 'bg-red-500/5 border-red-500/20 text-red-500 animate-pulse'
                      )}>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={clsx(
                              'text-[8px] uppercase tracking-widest border px-2 py-0.5 rounded-sm font-extrabold',
                              v.status === 'resolved' ? 'bg-asas-emerald/10 border-asas-emerald/30' : 'bg-red-500/10 border-red-500/30'
                            )}>
                              {v.status}
                            </span>
                            <span className="text-[9px] uppercase tracking-widest text-asas-silver font-bold">{v.policy_name}</span>
                          </div>
                          <p className="text-xs font-bold mt-2 text-asas-charcoal dark:text-white">{v.entity_name || 'Élément Sous Jalon'}</p>
                          <p className="text-[10px] text-asas-silver uppercase tracking-wider font-bold mt-1 leading-relaxed">{v.notes}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-widest font-bold text-asas-silver mb-1.5">Échéance de traitement</p>
                          <p className="text-xs font-mono font-bold text-asas-charcoal dark:text-asas-sand">{new Date(v.deadline).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB CONTENT: APPROVAL WORKFLOWS */}
            {activeTab === 'approvals' && (
              <motion.div
                key="approvals"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-[#141618] border border-asas-silver/20 p-6 rounded-sm space-y-6 shadow-sm flex flex-col"
              >
                <div>
                  <h3 className="text-sm uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand font-display flex items-center gap-2">
                    <FileSignature className="h-4 w-4 text-asas-gold" /> Ordonnancement des Approbations (Layer 4)
                  </h3>
                  <p className="text-[10px] text-asas-silver font-bold uppercase mt-1">
                    Gouvernance d'approbations de bons de commandes matériel ou dérogations financières chantiers.
                  </p>
                </div>

                <div className="space-y-6">
                  {approval_requests.map((req: any) => {
                    const steps = approval_steps.filter((s: any) => s.request_id === req.id);
                    return (
                      <div key={req.id} className="p-5 bg-asas-sand/20 dark:bg-black/20 border border-asas-silver/10 rounded-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-asas-silver/10">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={clsx(
                                'text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-extrabold border',
                                req.status === 'approved' ? 'bg-asas-emerald/10 border-asas-emerald/30 text-asas-emerald' : 'bg-asas-gold/10 border-asas-gold/30 text-asas-gold'
                              )}>
                                {req.status}
                              </span>
                              <span className="text-[10px] uppercase tracking-widest text-asas-silver font-bold">{req.entity_type}</span>
                            </div>
                            <h4 className="text-sm font-bold text-asas-charcoal dark:text-white mt-1">{req.title}</h4>
                            <p className="text-[9px] uppercase tracking-widest text-asas-silver mt-1.5 font-bold">Initié par: {req.created_by_name || 'Collaborateur'}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-asas-gold">{req.price || 'Paiement Unifié'}</span>
                          </div>
                        </div>

                        {/* Steps for this Request */}
                        <div className="pt-4 space-y-4">
                          <h5 className="text-[8px] uppercase tracking-widest text-asas-silver font-bold mb-2">Visas requisitionnés</h5>
                          {steps.map((st: any) => {
                            const isCurrentStep = req.status === 'pending' && st.status === 'pending';
                            const keyString = st.id;
                            const isCompleting = submittingApprovals[keyString] || false;
                            
                            return (
                              <div key={st.id} className={clsx(
                                'p-4 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-all',
                                isCurrentStep ? 'bg-white dark:bg-[#1C1E20] border-asas-gold/40 shadow-md' : 'bg-transparent border-asas-silver/10'
                              )}>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-asas-charcoal dark:text-asas-sand">Étape {st.step_sequence + 1}</span>
                                    <span className="text-[9px] uppercase tracking-widest bg-asas-navy/10 text-asas-navy dark:text-white px-2 py-0.5 rounded-sm font-bold border border-asas-navy/20">{st.role_required}</span>
                                  </div>
                                  <p className="text-xs font-bold text-asas-charcoal dark:text-white mt-2">Assigné: {st.assigned_to_name}</p>
                                  {st.comment && (
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-asas-silver mt-1 leading-relaxed">❝ {st.comment} ❞</p>
                                  )}
                                  {st.signed_checksum && (
                                    <p className="text-[8px] font-mono text-asas-gold mt-2 flex items-center gap-1 leading-none">
                                      <FileSignature className="h-3 w-3" /> Clé signature : {st.signed_checksum}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {st.status !== 'pending' ? (
                                    <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-asas-emerald font-extrabold bg-asas-emerald/10 border border-asas-emerald/20 px-3 py-1.5 rounded-sm">
                                      <Check className="h-3 w-3" /> {st.status}
                                    </div>
                                  ) : isCurrentStep ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleApprovalDecision(req.id, st.id, 'approved', 'Matériel requis pour le gros œuvre validé.')}
                                        disabled={isCompleting}
                                        className="h-9 px-4 py-2 bg-asas-emerald hover:bg-asas-emerald/95 text-white font-bold text-[9px] uppercase tracking-widest rounded-sm flex items-center gap-1.5 cursor-pointer"
                                      >
                                        Viser & Signer
                                      </button>
                                      <button
                                        onClick={() => handleApprovalDecision(req.id, st.id, 'rejected', 'Dérogation ou commande rejetée pour manque de justificatif.')}
                                        disabled={isCompleting}
                                        className="h-9 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-[9px] uppercase tracking-widest rounded-sm cursor-pointer"
                                      >
                                        Rejeter
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[8px] uppercase tracking-widest text-asas-silver font-bold">En attente</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* TAB CONTENT: AUTOMATIONS */}
            {activeTab === 'automation' && (
              <motion.div
                key="automation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-[#141618] border border-asas-silver/20 p-6 rounded-sm space-y-6 shadow-sm flex flex-col"
              >
                <div>
                  <h3 className="text-sm uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand font-display flex items-center gap-2">
                    <Zap className="h-4 w-4 text-asas-gold" /> Automates exécutables (Layer 3)
                  </h3>
                  <p className="text-[10px] text-asas-silver font-bold uppercase mt-1">
                    Détection d'infraction, génération automatisée suite à jalon validé ou notifications en file d'attente.
                  </p>
                </div>

                {/* Automation Rules */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-bold text-asas-silver uppercase tracking-widest">Règles actives configurées</h4>
                    {automation_rules.map((rule: any) => (
                      <div key={rule.id} className="p-4 bg-white dark:bg-[#202325] border border-asas-silver/20 rounded-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] uppercase tracking-widest bg-asas-gold/15 text-asas-gold px-2.5 py-0.5 rounded-sm font-extrabold border border-asas-gold/20">Active rule</span>
                          <span className="text-[8px] font-mono text-asas-silver">{rule.trigger_event}</span>
                        </div>
                        <p className="text-xs font-bold text-asas-charcoal dark:text-white mt-3">{rule.name}</p>
                        <p className="text-[9px] uppercase font-bold tracking-widest text-asas-silver mt-2">Action: {rule.action_type} · Filtre: {rule.condition_expression}</p>
                      </div>
                    ))}
                  </div>

                  {/* Executions log */}
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-bold text-asas-silver uppercase tracking-widest">Registre de Déclenchement Automatisé</h4>
                    <div className="space-y-3">
                      {automation_executions.map((e: any) => (
                        <div key={e.id} className="p-4 bg-asas-sand/15 dark:bg-black/25 border border-asas-silver/10 rounded-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] uppercase tracking-widest text-asas-emerald font-bold border border-asas-emerald/20 bg-asas-emerald/5 px-2 py-0.5 rounded-sm">Success</span>
                            <span className="text-[8px] text-asas-silver font-mono">{new Date(e.completed_at).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-xs font-bold text-asas-charcoal dark:text-white mt-2.5">{e.rule_name}</p>
                          <p className="text-[9px] uppercase tracking-widest text-asas-silver/80 mt-1 font-bold leading-relaxed">{e.execution_log}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB CONTENT: RECOVERY SELF HEALING */}
            {activeTab === 'recovery' && (
              <motion.div
                key="recovery"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-[#141618] border border-asas-silver/20 p-6 rounded-sm space-y-6 shadow-sm flex flex-col"
              >
                <div>
                  <h3 className="text-sm uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand font-display flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-asas-gold" /> Moteur d'Auto-Guérison (V1) (Layer 8)
                  </h3>
                  <p className="text-[10px] text-asas-silver font-bold uppercase mt-1">
                    Correction déterministe automatique des goulots logistiques ou approbations restées bloquées sans conducteur.
                  </p>
                </div>

                {/* Recovery incident lists */}
                <div className="space-y-4">
                  {recovery_jobs.map((job: any) => {
                    const isHEALING = healingRunning[job.id] || false;
                    return (
                      <div key={job.id} className="p-5 bg-white dark:bg-[#202325] border border-asas-silver/20 rounded-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-asas-silver/10">
                          <div>
                            <span className={clsx(
                              'text-[8px] uppercase tracking-widest px-2.5 py-0.5 border rounded-sm font-extrabold',
                              job.status === 'recovered' ? 'bg-asas-emerald/10 border-asas-emerald/30 text-asas-emerald' : 'bg-red-500/10 border-red-500/30 text-red-500 animate-pulse'
                            )}>
                              {job.status}
                            </span>
                            <h4 className="text-xs font-bold text-asas-charcoal dark:text-white mt-2">Incident: {job.incident_type}</h4>
                            <p className="text-[10px] uppercase font-bold tracking-wider text-asas-silver mt-1">{job.incident_description}</p>
                          </div>
                          <div>
                            {job.status !== 'recovered' && (
                              <button
                                onClick={() => handleSelfHealing(job.id)}
                                disabled={isHEALING}
                                className="h-9 px-4 py-2 bg-asas-gold hover:bg-asas-gold/95 text-white font-bold text-[9px] uppercase tracking-widest rounded-sm flex items-center gap-1.5 cursor-pointer animate-pulse"
                              >
                                {isHEALING ? 'Correction en cours...' : 'Forcer Auto-Guérison'}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="pt-4 flex flex-col gap-2">
                          <p className="text-[9px] uppercase tracking-widest text-asas-silver font-bold">Stratégie déployée : <span className="text-asas-charcoal dark:text-white">{job.remediation_strategy}</span></p>
                          <div className="bg-asas-sand/30 dark:bg-black/25 border border-asas-silver/10 p-3 rounded-sm">
                            <pre className="text-[9px] font-mono text-asas-charcoal dark:text-asas-sand whitespace-pre-wrap leading-relaxed">
                              {job.output_logs}
                            </pre>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* TAB CONTENT: TIMELINE */}
            {activeTab === 'timeline' && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-[#141618] border border-asas-silver/20 p-6 rounded-sm space-y-6 shadow-sm flex flex-col"
              >
                <div>
                  <h3 className="text-sm uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand font-display flex items-center gap-2">
                    <History className="h-4 w-4 text-asas-gold" /> Fil d'Exécution Unifié (Layer 10)
                  </h3>
                  <p className="text-[10px] text-asas-silver font-bold uppercase mt-1">
                    Historique chronologique auditable et impayés d'échéances consolidé du système d'exploitation de programmes.
                  </p>
                </div>

                {/* Timeline display */}
                <div className="relative border-l border-asas-silver/20 pl-6 ml-2 space-y-6">
                  {timeline.map((item: any) => (
                    <div key={item.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-asas-gold border border-white dark:border-[#141618] shadow"></span>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[8px] uppercase tracking-widest bg-asas-sand dark:bg-[#202325] text-asas-silver border border-asas-silver/10 px-2.5 py-0.5 rounded-sm font-bold">{item.event_category}</span>
                          <span className="text-[8px] font-mono text-asas-silver">{new Date(item.created_at).toLocaleTimeString()}</span>
                        </div>
                        <h4 className="text-xs font-bold text-asas-charcoal dark:text-white mt-1.5">{item.title}</h4>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-asas-silver/80 mt-1 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
