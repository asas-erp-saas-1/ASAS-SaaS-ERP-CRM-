'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { MapPin, KeyRound, Wrench, CheckCircle2, ChevronRight } from 'lucide-react'
import type { Deal } from '@/types/app'
import Link from 'next/link'
import { SAVPanelModal } from './SAVPanelModal'

export function KeySessionCard({ deal, onUpdate }: { deal: Deal, onUpdate: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const clientName = deal.clients?.full_name || 'Client Inconnu'
  const project = deal.properties?.projects?.name || 'Projet Indéfini'
  const ref = deal.properties?.reference_code || '---'

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm p-6 shadow-sm hover:border-asas-gold/40 transition-colors group cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-start justify-between mb-4">
           <div>
             <span className="text-[9px] font-bold uppercase tracking-widest text-asas-gold bg-asas-gold/10 px-2 py-1 rounded-sm mb-2 inline-block border border-asas-gold/20">
               Livraison & SAV
             </span>
             <h3 className="text-sm font-bold text-asas-charcoal dark:text-asas-sand mt-1">{clientName}</h3>
           </div>
           <div className="w-10 h-10 rounded-sm bg-asas-sand/30 dark:bg-black/10 border border-asas-silver/20 flex items-center justify-center group-hover:bg-asas-gold/10 transition-colors">
              <KeyRound className="w-4 h-4 text-asas-silver group-hover:text-asas-gold transition-colors" />
           </div>
        </div>

        <div className="space-y-2 mb-6">
           <p className="text-[10px] font-bold text-asas-silver uppercase tracking-widest flex items-center gap-2">
             <MapPin className="w-3 h-3" /> {project}
           </p>
           <p className="text-[10px] uppercase font-bold text-asas-silver flex items-center gap-2">
             <Wrench className="w-3 h-3" /> Lot: <span className="font-mono">{ref}</span>
           </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-asas-silver/20">
           <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold text-orange-500">
             <span className="w-1.5 h-1.5 rounded-sm bg-orange-500 animate-pulse" /> Réserves en attente
           </div>
           <ChevronRight className="w-4 h-4 text-asas-silver group-hover:text-asas-gold group-hover:translate-x-1 transition-all" />
        </div>
      </motion.div>

      {isModalOpen && (
        <SAVPanelModal deal={deal} onClose={() => setIsModalOpen(false)} onUpdate={onUpdate} />
      )}
    </>
  )
}
