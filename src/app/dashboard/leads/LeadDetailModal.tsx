'use client'

import React, { useEffect, useState } from 'react'
import { X, Phone, MessageCircle, Clock, Calendar, Mail, FileText, User, Navigation } from 'lucide-react'
import type { Lead, Activity } from '@/types/app'
import { CreateTaskModal } from '@/app/dashboard/tasks/CreateTaskModal'
import {
  ActionPanel,
  ActionPanelContent,
  ActionPanelHeader,
  ActionPanelFooter,
  ActionPanelTitle,
  ActionPanelDescription,
} from '@/components/patterns/ActionPanel'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface LeadDetailModalProps {
  leadId: string | null
  onClose: () => void
}

export function LeadDetailModal({ leadId, onClose }: LeadDetailModalProps) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  useEffect(() => {
    if (!leadId) {
      setLead(null)
      return
    }
    let mounted = true
    
    async function loadData() {
      setLoading(true)
      try {
        const [leadRes, actRes] = await Promise.all([
          fetch(`/api/leads/${leadId}`),
          fetch(`/api/activities?lead_id=${leadId}`)
        ])
        
        if (leadRes.ok && mounted) {
          const data = await leadRes.json()
          setLead(data)
        }
        
        if (actRes.ok && mounted) {
          const actData = await actRes.json()
          setActivities(actData.data || [])
        }
      } catch (err) {
        console.error("Failed to load lead details", err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    
    loadData()
    return () => { mounted = false }
  }, [leadId])

  return (
    <ActionPanel open={!!leadId} onOpenChange={(open) => { if (!open) onClose() }}>
      <ActionPanelContent className="flex flex-col p-0">
        <ActionPanelHeader className="px-6 pt-6 pb-4 bg-white/5">
          <ActionPanelTitle className="flex items-center gap-2 text-lg">
             <User className="h-5 w-5 text-asas-gold" />
             Détails du Prospect
          </ActionPanelTitle>
          <ActionPanelDescription>
             Informations et historique d'interactions
          </ActionPanelDescription>
        </ActionPanelHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin custom-scrollbar space-y-6">
          {loading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-24 bg-white/5 rounded-sm border border-asas-silver/10" />
              <div className="h-64 bg-white/5 rounded-sm border border-asas-silver/10" />
            </div>
          ) : !lead ? (
            <div className="text-center py-20 text-asas-silver">
               Le prospect n'a pas pu être chargé.
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Profile Card */}
              <div className="bg-white/5 border border-asas-silver/10 rounded-sm p-5">
                 <h3 className="text-lg font-bold text-asas-sand mb-4 flex items-center justify-between">
                   {(lead as any).clients?.full_name ?? 'Client Inconnu'}
                   <Badge variant="outline">{lead.status}</Badge>
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-xs text-asas-sand">
                      <div className="w-8 h-8 rounded-sm bg-asas-emerald/10 flex items-center justify-center shrink-0">
                         <Phone className="w-4 h-4 text-asas-emerald" />
                      </div>
                      <span className="font-mono">{(lead as any).clients?.phone || 'Non spécifié'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-asas-sand">
                      <div className="w-8 h-8 rounded-sm bg-blue-500/10 flex items-center justify-center shrink-0">
                         <Mail className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="truncate">{(lead as any).clients?.email || 'Non spécifié'}</span>
                    </div>

                    {(lead.budget_min || lead.budget_max) && (
                       <div className="flex items-center gap-3 text-xs text-asas-sand">
                         <div className="w-8 h-8 rounded-sm bg-purple-500/10 flex items-center justify-center shrink-0">
                            <span className="font-bold text-purple-400">DZ</span>
                         </div>
                         <strong className="font-mono">
                           {lead.budget_min || '?'} → {lead.budget_max || '?'}
                         </strong>
                       </div>
                    )}

                    {lead.source && (
                       <div className="flex items-center gap-3 text-xs text-asas-sand">
                         <div className="w-8 h-8 rounded-sm bg-asas-navy/20 flex items-center justify-center shrink-0">
                            <span className="font-bold text-asas-navy dark:text-asas-sand">#</span>
                         </div>
                         <span>Source: <strong>{lead.source}</strong></span>
                       </div>
                    )}

                    {(lead as any).profiles && (
                       <div className="flex items-center gap-3 text-xs text-asas-sand">
                         <div className="w-8 h-8 rounded-sm bg-pink-500/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-pink-400" />
                         </div>
                         <span>Assigné à: <strong className="uppercase">{(lead as any).profiles.full_name || 'Agent'}</strong></span>
                       </div>
                    )}
                 </div>
              </div>

              {/* Notes */}
              {lead.notes && (
                <div className="bg-white/5 border border-asas-silver/10 rounded-sm p-5">
                  <h4 className="text-[10px] uppercase tracking-widest text-asas-silver font-bold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Notes Additionnelles
                  </h4>
                  <p className="text-xs text-asas-sand leading-relaxed whitespace-pre-wrap">
                    {lead.notes}
                  </p>
                </div>
              )}

              {/* Tracking / Activities */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] uppercase tracking-widest text-asas-silver font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Activités & Historique
                  </h4>
                </div>

                <div className="mb-6 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      id="new-note-input"
                      className="flex-1 bg-white/5 border border-asas-silver/20 rounded-sm px-4 py-2 text-xs text-asas-sand focus:outline-none focus:ring-1 focus:ring-asas-gold focus:border-asas-gold"
                      placeholder="Ajouter une note rapide..."
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim() && !loading) {
                          const val = e.currentTarget.value.trim();
                          e.currentTarget.value = '';
                          try {
                            const res = await fetch('/api/activities', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ lead_id: leadId, type: 'note', description: val })
                            });
                            if (res.ok) {
                              const newAct = await res.json();
                              setActivities(prev => [newAct.data, ...prev]);
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                    />
                    <Button 
                      onClick={async () => {
                        const input = document.getElementById('new-note-input') as HTMLInputElement;
                        if (!input || !input.value.trim() || loading) return;
                        const val = input.value.trim();
                        input.value = '';
                        try {
                          const res = await fetch('/api/activities', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ lead_id: leadId, type: 'note', description: val })
                          });
                          if (res.ok) {
                            const newAct = await res.json();
                            setActivities(prev => [newAct.data, ...prev]);
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    >
                      Ajouter
                    </Button>
                  </div>
                  
                  {/* Smart Chips for Instant Logging */}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[9px] font-bold text-asas-silver uppercase tracking-widest mr-2">Action:</span>
                    {[
                      { label: "Pas de réponse", val: "Pas de réponse", icon: "📞" },
                      { label: "Visite site", val: "Confirmé visite", icon: "🤝" }
                    ].map(chip => (
                      <button
                        key={chip.label}
                        onClick={async () => {
                          if (loading) return;
                          try {
                            const res = await fetch('/api/activities', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ lead_id: leadId, type: 'note', description: `${chip.icon} ${chip.val}` })
                            });
                            if (res.ok) {
                              const newAct = await res.json();
                              setActivities(prev => [newAct.data, ...prev]);
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-2 py-1 bg-white/5 border border-asas-silver/20 rounded-sm text-[10px] font-bold text-asas-sand hover:bg-white/10 hover:border-asas-silver/40 transition-all flex items-center gap-1 active:scale-95"
                      >
                        <span className="opacity-70">{chip.icon}</span> {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((act) => (
                      <div key={act.id} className="relative pl-6 pb-2">
                        {/* Timeline line */}
                        <div className="absolute top-2 left-[11px] bottom-[-16px] w-[2px] bg-asas-silver/10" />
                        
                        {/* Timeline dot */}
                        <div className="absolute top-2 left-2 w-2 h-2 rounded-full border border-asas-gold bg-asas-charcoal" />
                        
                        <div className="bg-white/5 border border-asas-silver/10 rounded-sm p-4 hover:border-asas-silver/30 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-asas-gold uppercase tracking-widest">{act.type}</span>
                            <span className="text-[9px] text-asas-silver font-mono">
                              {new Date(act.created_at).toLocaleString('fr-FR', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-asas-sand">
                            {act.description}
                          </p>
                          {(act as any).profiles?.full_name && (
                            <p className="text-[9px] text-asas-silver mt-2 uppercase tracking-widest font-bold">
                              Par {(act as any).profiles.full_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/5 border border-dashed border-asas-silver/20 rounded-sm p-8 text-center">
                    <p className="text-xs text-asas-silver font-medium uppercase tracking-widest">Aucune activité enregistrée</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        <ActionPanelFooter className="px-6 pb-6 pt-4 bg-white/5">
           <Button variant="outline" onClick={onClose}>Fermer</Button>
           {lead && (
             <>
               <Button onClick={() => setIsTaskModalOpen(true)} variant="secondary" className="gap-2">
                 <Calendar className="w-4 h-4" /> Créer Tâche
               </Button>
               <Button onClick={() => window.open(`https://wa.me/${(lead as any).clients?.phone?.replace(/\+/g, '') || ''}`, '_blank')} className="gap-2 bg-[#25D366] text-white hover:bg-[#25D366]/90">
                 <MessageCircle className="w-4 h-4" /> WhatsApp
               </Button>
             </>
           )}
        </ActionPanelFooter>
      </ActionPanelContent>

      {isTaskModalOpen && (
        <CreateTaskModal
          leadId={leadId}
          onClose={() => setIsTaskModalOpen(false)}
          onSuccess={() => setIsTaskModalOpen(false)}
        />
      )}
    </ActionPanel>
  )
}
