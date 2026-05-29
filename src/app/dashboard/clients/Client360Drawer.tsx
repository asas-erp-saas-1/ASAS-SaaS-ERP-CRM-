'use client'

import React, { useEffect, useState } from 'react'
import { Phone, Mail, Clock, Calendar, CheckSquare, Target, User, Navigation, Building2, MessageCircle } from 'lucide-react'
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
import { kernel } from '@/lib/kernel/core'

interface Client360DrawerProps {
  clientId: string | null
  onClose: () => void
}

export function Client360Drawer({ clientId, onClose }: Client360DrawerProps) {
  const [client, setClient] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clientId) {
      setClient(null)
      return
    }

    let mounted = true
    async function loadData() {
      setLoading(true)
      try {
        const [cRes, lRes, dRes] = await Promise.all([
          fetch(`/api/clients?q=${clientId}`), 
          fetch(`/api/leads`), 
          fetch(`/api/deals`) 
        ]);
        
        if (mounted) {
          const clientData = await cRes.json()
          if (clientData.data && clientData.data.length > 0) {
             const exactClient = clientData.data.find((c: any) => c.id === clientId)
             setClient(exactClient || clientData.data[0])
          }

          const leadsData = await lRes.json()
          setLeads((leadsData.data || []).filter((l: any) => l.client_id === clientId))

          const dealsData = await dRes.json()
          setDeals((dealsData.data || []).filter((d: any) => d.client_id === clientId))
          
          // Activity endpoint doesn't strictly take client_id yet, but we will fake it or pull from leads
        }
      } catch (err) {
        console.error("Failed to load client 360", err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    
    loadData()
    return () => { mounted = false }
  }, [clientId])

  const typeLabel = (t: string) => {
     switch(t) {
        case 'buyer': return 'Acheteur'
        case 'seller': return 'Vendeur'
        case 'investor': return 'Investisseur'
        default: return 'Locataire'
     }
  }

  return (
    <ActionPanel open={!!clientId} onOpenChange={(open) => { if (!open) onClose() }}>
      <ActionPanelContent className="flex flex-col p-0">
        <ActionPanelHeader className="px-6 pt-6 pb-4 bg-white/5">
          <ActionPanelTitle className="flex items-center gap-2 text-lg">
             <User className="h-5 w-5 text-asas-gold" />
             Vue 360 Client
          </ActionPanelTitle>
          <ActionPanelDescription>
             Historique Complet & Opérations
          </ActionPanelDescription>
        </ActionPanelHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin custom-scrollbar space-y-6">
          {loading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-24 bg-white/5 rounded-sm border border-asas-silver/10" />
              <div className="h-64 bg-white/5 rounded-sm border border-asas-silver/10" />
            </div>
          ) : !client ? (
            <div className="text-center py-20 text-asas-silver">
               Identité introuvable.
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Profile Card */}
              <div className="bg-white/5 border border-asas-silver/10 rounded-sm p-5">
                 <h3 className="text-lg font-bold text-asas-sand mb-4 flex items-center justify-between">
                   {client.full_name}
                   <Badge variant="outline">{typeLabel(client.type)}</Badge>
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-xs text-asas-sand">
                      <div className="w-8 h-8 rounded-sm bg-asas-emerald/10 flex items-center justify-center shrink-0">
                         <Phone className="w-4 h-4 text-asas-emerald" />
                      </div>
                      <span className="font-mono">{client.phone || 'Non spécifié'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-asas-sand">
                      <div className="w-8 h-8 rounded-sm bg-blue-500/10 flex items-center justify-center shrink-0">
                         <Mail className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="truncate">{client.email || 'Non spécifié'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-asas-sand">
                      <div className="w-8 h-8 rounded-sm bg-asas-navy/20 flex items-center justify-center shrink-0">
                         <span className="font-bold text-asas-navy dark:text-asas-sand">#</span>
                      </div>
                      <span>Source: <strong>{client.source || 'Direct'}</strong></span>
                    </div>

                    {client.nationality && (
                       <div className="flex items-center gap-3 text-xs text-asas-sand">
                         <div className="w-8 h-8 rounded-sm bg-asas-silver/10 flex items-center justify-center shrink-0">
                            <Navigation className="w-4 h-4 text-asas-silver" />
                         </div>
                         <strong className="uppercase">{client.nationality}</strong>
                       </div>
                    )}
                 </div>
              </div>

              {/* Deals / Reservations */}
              {deals.length > 0 && (
                <div className="bg-white/5 border border-asas-gold/20 rounded-sm p-5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 opacity-5 mix-blend-overlay">
                     <Building2 className="w-32 h-32 text-asas-gold" />
                   </div>
                   <h4 className="text-[10px] uppercase tracking-widest text-asas-gold font-bold mb-4 flex items-center gap-2 relative z-10">
                     <Target className="w-4 h-4" /> Transactions Actives
                   </h4>
                   <div className="space-y-3 relative z-10">
                     {deals.map(d => (
                        <div key={d.id} className="bg-black/20 border border-asas-gold/20 p-3 rounded-sm flex items-center justify-between">
                           <div>
                              <p className="text-xs font-bold text-asas-sand">Deal #{d.id.substring(0,8)}</p>
                              <p className="text-[10px] text-asas-silver font-mono mt-1">{(d.amount / 1000000).toFixed(1)}M DZD</p>
                           </div>
                           <Badge className="bg-asas-gold/10 text-asas-gold border-asas-gold/20">{d.status}</Badge>
                        </div>
                     ))}
                   </div>
                </div>
              )}

              {/* Leads Pipeline */}
              {leads.length > 0 && (
                <div className="bg-white/5 border border-asas-silver/10 rounded-sm p-5">
                   <h4 className="text-[10px] uppercase tracking-widest text-asas-silver font-bold mb-4 flex items-center gap-2">
                     <Target className="w-4 h-4" /> Pipeline Acquisition
                   </h4>
                   <div className="space-y-3">
                     {leads.map(l => (
                        <div key={l.id} className="bg-black/20 border border-asas-silver/10 p-3 rounded-sm flex items-center justify-between">
                           <div>
                              <p className="text-xs text-asas-sand">Intérêt pour {l.projects?.name || 'Programme inconnu'}</p>
                              <p className="text-[9px] text-asas-silver font-mono mt-1">Modifié: {new Date(l.updated_at).toLocaleDateString()}</p>
                           </div>
                           <Badge variant="outline">{l.status}</Badge>
                        </div>
                     ))}
                   </div>
                </div>
              )}

              {leads.length === 0 && deals.length === 0 && (
                 <div className="bg-white/5 border border-dashed border-asas-silver/20 rounded-sm p-8 text-center text-asas-silver text-xs">
                    Aucune transaction ou lead actif pour ce client.
                 </div>
              )}

            </div>
          )}
        </div>

        <ActionPanelFooter className="px-6 pb-6 pt-4 bg-white/5">
           <Button variant="outline" onClick={onClose}>Fermer</Button>
           {client && (
             <Button onClick={() => window.open(`https://wa.me/${client.phone?.replace(/\+/g, '') || ''}`, '_blank')} className="gap-2 bg-[#25D366] text-white hover:bg-[#25D366]/90">
               <MessageCircle className="w-4 h-4" /> Message WhatsApp
             </Button>
           )}
        </ActionPanelFooter>
      </ActionPanelContent>
    </ActionPanel>
  )
}
