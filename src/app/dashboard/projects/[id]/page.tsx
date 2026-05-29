'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Building2, ArrowLeft, Home, BadgePercent, CheckCircle2, ShieldCheck, FileCheck, Layers, Map } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { clsx } from 'clsx'
import type { Property } from '@/types/app'
import { ConstructionEngine } from '../ConstructionEngine'

export default function ProjectDetail() {
  const params = useParams()
  const id = params?.id as string
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [workspaceTab, setWorkspaceTab] = useState<'commercial' | 'construction'>('commercial')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects?id=${id}`)
      if (res.ok) {
        setProject(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <div className="p-8 text-center text-asas-silver animate-pulse">Chargement du programme...</div>
  if (!project) return <div className="p-8 text-center text-red-500">Programme introuvable</div>

  const properties: Property[] = project.properties || []
  const sold = properties.filter(p => p.status === 'sold')
  const reserved = properties.filter(p => p.status === 'reserved')
  const available = properties.filter(p => p.status === 'available')
  
  const totalValue = properties.reduce((acc, p) => acc + (p.list_price || 0), 0)
  const securedValue = [...sold, ...reserved].reduce((acc, p) => acc + (p.list_price || 0), 0)

  // Group by type
  const byType = properties.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="w-full relative pb-12 max-w-7xl mx-auto">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <Link href="/dashboard/projects" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Programmes
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
        <div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-asas-charcoal dark:text-asas-sand tracking-tight flex items-center gap-4 font-display">
            <div className="w-14 h-14 rounded-sm bg-gradient-to-br from-indigo-600 to-blue-800 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Building2 className="h-7 w-7 text-white" strokeWidth={1.5} />
            </div>
            {project.name}
          </h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest pl-1 mt-3 flex items-center gap-3">
             <span className="w-2 h-2 rounded-full bg-emerald-500" />
             {project.city || 'Localisation non définie'} • {project.status === 'active' ? 'En Commercialisation' : project.status}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
          <Link href={`/dashboard/projects/${id}/canvas`} className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-sm transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 active:translate-y-0 text-center">
             <Map className="w-4 h-4" /> Plan Interactif
          </Link>
          <div className="flex bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-2xl p-4 gap-6">
             <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1">Chiffre d'Affaires Projeté</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{(totalValue / 1_000_000).toFixed(1)}M DZD</p>
             </div>
             <div className="w-px bg-black/5 dark:bg-white/5" />
             <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-500 mb-1">CA Sécurisé</p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{(securedValue / 1_000_000).toFixed(1)}M DZD</p>
             </div>
          </div>
        </div>
      </div>

      {/* Operating Workspace Tab Selection */}
      <div className="flex bg-gray-100 dark:bg-[#121415] p-1.5 rounded-2xl gap-2 w-full max-w-lg mb-8 relative z-10 border border-black/5 dark:border-white/5">
         <button 
           onClick={() => setWorkspaceTab('commercial')} 
           className={clsx(
             "flex-1 py-3 px-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all", 
             workspaceTab === 'commercial' 
               ? "bg-white dark:bg-[#1E2022] text-indigo-600 dark:text-indigo-400 shadow-md border border-black/5 dark:border-white/5" 
               : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
           )}
         >
           Grille Commerciale
         </button>
         <button 
           onClick={() => setWorkspaceTab('construction')} 
           className={clsx(
             "flex-1 py-3 px-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all", 
             workspaceTab === 'construction' 
               ? "bg-white dark:bg-[#1E2022] text-indigo-600 dark:text-indigo-400 shadow-md border border-black/5 dark:border-white/5" 
               : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
           )}
         >
           Suivi Chantier & Production
         </button>
      </div>

      {workspaceTab === 'commercial' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          
          {/* Lots Status Grid */}
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-white dark:bg-[#141618] rounded-[2rem] border border-black/5 dark:border-white/5 shadow-2xl p-8">
               <div className="flex items-center justify-between mb-8">
                 <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                   <Layers className="w-6 h-6 text-indigo-500" /> État des Lots (Grille Comm.)
                 </h2>
                 <div className="flex gap-4">
                   <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/50" /><span className="text-xs font-bold text-gray-500">Vendu</span></div>
                   <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500/50" /><span className="text-xs font-bold text-gray-500">Réservé</span></div>
                   <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-md bg-asas-sand/50 dark:bg-[#141618] border border-black/10 dark:border-white/10" /><span className="text-xs font-bold text-gray-500">Dispo</span></div>
                 </div>
               </div>

               {properties.length === 0 ? (
                 <div className="text-center py-10 text-gray-500 border border-dashed border-gray-300 dark:border-gray-800 rounded-2xl">Aucun lot assigné à ce programme</div>
               ) : (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {properties.map(p => (
                     <Link href={`/dashboard/properties?id=${p.id}`} key={p.id} className={clsx(
                       "p-4 rounded-2xl border transition-all hover:scale-[1.02]",
                       p.status === 'sold' ? "bg-emerald-500/10 border-emerald-500/30" :
                       p.status === 'reserved' ? "bg-amber-500/10 border-amber-500/30" :
                       "bg-white dark:bg-[#0A0A0A] border-black/5 dark:border-white/5 hover:border-indigo-500/30"
                     )}>
                       <div className="flex justify-between items-start mb-2">
                         <span className="text-xs font-bold font-mono text-gray-500">{p.type}</span>
                         <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded">{p.area_sqm}m²</span>
                       </div>
                       <p className={clsx("font-extrabold text-sm", p.status === 'sold' ? 'text-emerald-700 dark:text-emerald-400' : p.status === 'reserved' ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-white')}>
                         {p.reference_code || 'Sans Réf'}
                       </p>
                       <p className="text-xs font-bold font-mono text-gray-500 mt-2">{(p.list_price / 1_000_000).toFixed(2)}M</p>
                     </Link>
                   ))}
                 </div>
               )}
             </div>

             {/* Échéancier VEFA Global */}
             <div className="bg-white dark:bg-[#050505] rounded-[2rem] border border-black/5 dark:border-white/5 shadow-2xl p-8">
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3 mb-6">
                   <BadgePercent className="w-6 h-6 text-asas-navy dark:text-asas-sand" /> Échéancier Global des Appels de Fonds (VEFA)
                </h2>
                <p className="text-sm font-medium text-gray-500 mb-6">Lorsque vous validez une phase de construction, les appels de fonds sont automatiquement générés pour toutes les transactions en cours sur ce projet.</p>
                
                <div className="space-y-4">
                   {project.tranches?.length ? project.tranches.map((tranche: any, i: number) => (
                     <div key={i} className={clsx("flex items-center justify-between p-4 rounded-xl border transition-colors", tranche.done ? "bg-emerald-500/5 border-emerald-500/20" : "bg-asas-sand/30 dark:bg-[#0A0A0A] border-black/5 dark:border-white/5")}>
                        <div className="flex items-center gap-4">
                           <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", tranche.done ? "bg-emerald-500/20 text-emerald-500" : "bg-gray-200 dark:bg-white/5 text-gray-400")}>
                             {tranche.done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i+1}</span>}
                           </div>
                           <div>
                             <p className={clsx("text-sm font-bold", tranche.done ? "text-emerald-700 dark:text-emerald-400" : "text-gray-900 dark:text-white")}>{tranche.label}</p>
                             <p className="text-xs font-bold text-gray-500 mt-0.5">{tranche.pct}% du montant total</p>
                           </div>
                        </div>
                        {!tranche.done && (
                          <button 
                            onClick={async (e) => {
                              e.currentTarget.disabled = true;
                              const originalText = e.currentTarget.innerText;
                              e.currentTarget.innerText = "Déclenchement...";
                              try {
                                const res = await fetch('/api/command-gateway', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    commandId: crypto.randomUUID(),
                                    aggregateId: project.id,
                                    type: 'TRIGGER_PROJECT_TRANCHE',
                                    expectedVersion: 1,
                                    payload: { projectId: project.id, trancheLabel: tranche.label, tranchePct: tranche.pct }
                                  })
                                });
                                if (!res.ok) throw new Error('Failed');
                                
                                // Optimistic visual update (since we don't save tranches to DB yet)
                                const newTranches = [...project.tranches];
                                newTranches[i].done = true;
                                setProject({ ...project, tranches: newTranches });
                                
                                alert('Appels de fonds générés avec succès pour les transactions actives.');
                              } catch (err) {
                                console.error(err);
                                e.currentTarget.disabled = false;
                                e.currentTarget.innerText = originalText;
                                alert('Erreur lors du déclenchement de l\'appel de fonds');
                              }
                            }}
                            className="px-4 py-2 bg-asas-navy hover:bg-asas-charcoal dark:hover:bg-black disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all">
                            Déclencher Appel
                          </button>
                        )}
                     </div>
                   )) : [
                     { label: "Réservation (Signature)", pct: 20, done: true },
                     { label: "Achèvement Fondations", pct: 15, done: true },
                     { label: "Dalle RDC", pct: 10, done: false },
                     { label: "Hors d'eau (Toiture)", pct: 20, done: false },
                     { label: "Menuiseries & Cloisons", pct: 15, done: false },
                     { label: "Remise des Clés", pct: 20, done: false },
                   ].map((tranche, i) => (
                     <div key={i} className={clsx("flex items-center justify-between p-4 rounded-xl border transition-colors", tranche.done ? "bg-emerald-500/5 border-emerald-500/20" : "bg-gray-50 dark:bg-[#0A0A0A] border-black/5 dark:border-white/5")}>
                        <div className="flex items-center gap-4">
                           <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", tranche.done ? "bg-emerald-500/20 text-emerald-500" : "bg-gray-200 dark:bg-[#111111] text-gray-400")}>
                             {tranche.done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i+1}</span>}
                           </div>
                           <div>
                             <p className={clsx("text-sm font-bold", tranche.done ? "text-emerald-700 dark:text-emerald-400" : "text-gray-900 dark:text-white")}>{tranche.label}</p>
                             <p className="text-xs font-bold text-gray-500 mt-0.5">{tranche.pct}% du montant total</p>
                           </div>
                        </div>
                        {!tranche.done && (
                          <button 
                            onClick={async (e) => {
                              e.currentTarget.disabled = true;
                              const originalText = e.currentTarget.innerText;
                              e.currentTarget.innerText = "Déclenchement...";
                              try {
                                const res = await fetch('/api/command-gateway', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    commandId: crypto.randomUUID(),
                                    aggregateId: project.id,
                                    type: 'TRIGGER_PROJECT_TRANCHE',
                                    expectedVersion: 1,
                                    payload: { projectId: project.id, trancheLabel: tranche.label, tranchePct: tranche.pct }
                                  })
                                });
                                if (!res.ok) throw new Error('Failed');
                                
                                // Optimistically update our "fake" tranches by mutating state mock
                                const newProject = { ...project };
                                if (!newProject.tranches) {
                                  newProject.tranches = [
                                    { label: "Réservation (Signature)", pct: 20, done: true },
                                    { label: "Achèvement Fondations", pct: 15, done: true },
                                    { label: "Dalle RDC", pct: 10, done: false },
                                    { label: "Hors d'eau (Toiture)", pct: 20, done: false },
                                    { label: "Menuiseries & Cloisons", pct: 15, done: false },
                                    { label: "Remise des Clés", pct: 20, done: false },
                                  ];
                                }
                                newProject.tranches[i].done = true;
                                setProject(newProject);
                                
                                alert('Appels de fonds générés avec succès pour les transactions actives.');
                              } catch (err) {
                                console.error(err);
                                e.currentTarget.disabled = false;
                                e.currentTarget.innerText = originalText;
                                alert('Erreur lors du déclenchement de l\'appel de fonds');
                              }
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all">
                            Déclencher Appel
                          </button>
                        )}
                     </div>
                   ))}
                </div>
             </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
             <div className="bg-white dark:bg-[#0A0A0A] rounded-sm border border-black/5 dark:border-white/5 p-6 shadow-xl">
               <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6">Mix Produit</h3>
               <div className="space-y-4">
                  {Object.entries(byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <Home className="w-4 h-4 text-indigo-500" />
                         <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{type}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">{count} lots</span>
                    </div>
                  ))}
               </div>
             </div>

             <div className="bg-white dark:bg-[#0A0A0A] rounded-3xl border border-black/5 dark:border-white/5 p-6 shadow-xl">
               <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6 border-b border-black/5 dark:border-white/5 pb-4">Actes & Juridique</h3>
               <button className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-[#111111] hover:bg-indigo-500/5 border border-black/5 dark:border-white/5 hover:border-indigo-500/20 rounded-xl transition-colors mb-3 group">
                  <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-500 transition-colors">Permis de Construire</span>
                  <FileCheck className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
               </button>
               <button className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-[#111111] hover:bg-indigo-500/5 border border-black/5 dark:border-white/5 hover:border-indigo-500/20 rounded-xl transition-colors group">
                  <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-500 transition-colors">Plan de Masse & EDD</span>
                  <ShieldCheck className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
               </button>
             </div>
          </div>

        </div>
      ) : (
        <div className="relative z-10">
          <ConstructionEngine projectId={id} projectCity={project.city || "Alger"} />
        </div>
      )}
    </div>
  )
}
