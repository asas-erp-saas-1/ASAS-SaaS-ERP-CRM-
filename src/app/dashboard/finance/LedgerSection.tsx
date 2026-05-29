'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { FileText, Search, Plus, Filter, ArrowRight } from 'lucide-react'
import { clsx } from 'clsx'

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(n)
}

export function LedgerSection() {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ledger?view=journal')
      .then(res => res.json())
      .then(data => {
        setEntries(data.entries || [])
        setLoading(false)
      })
      .catch(console.error)
  }, [])

  return (
    <div className="bg-white dark:bg-[#141618] rounded-sm border border-asas-silver/20 shadow-sm mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-asas-silver/20 gap-4 bg-asas-sand/20 dark:bg-black/10">
        <div>
          <h2 className="text-xl font-bold text-asas-charcoal dark:text-asas-sand tracking-tight uppercase font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-asas-navy dark:text-asas-sand/80" /> The General Ledger
          </h2>
          <p className="text-[9px] uppercase tracking-widest font-bold text-asas-silver mt-1">Grand Livre • Écritures Journalisées (Immutables)</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 border border-asas-silver/20 hover:bg-asas-sand/50 dark:hover:bg-white/5 rounded-sm transition-colors text-asas-silver">
            <Filter className="w-4 h-4" />
          </button>
          <button className="px-4 py-2 bg-asas-navy text-white text-[10px] uppercase tracking-widest font-bold rounded-sm shadow-sm hover:bg-asas-charcoal transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouvelle Écriture
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="animate-pulse space-y-4">
             <div className="h-10 bg-gray-100 dark:bg-white/5 rounded-sm" />
             <div className="h-10 bg-gray-100 dark:bg-white/5 rounded-sm" />
             <div className="h-10 bg-gray-100 dark:bg-white/5 rounded-sm" />
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-asas-silver bg-asas-sand/10 dark:bg-white/5 border border-dashed border-asas-silver/20 rounded-sm">
             <FileText className="w-8 h-8 mb-3 opacity-50" />
             <p className="text-[10px] uppercase font-bold tracking-widest">Le grand livre est vide</p>
             <p className="text-xs mt-1">Aucune écriture comptable n'a été trouvée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="border-b border-asas-silver/20">
                     <th className="py-3 px-4 text-[9px] uppercase tracking-widest font-bold text-asas-silver">Date & Réf</th>
                     <th className="py-3 px-4 text-[9px] uppercase tracking-widest font-bold text-asas-silver">Description</th>
                     <th className="py-3 px-4 text-[9px] uppercase tracking-widest font-bold text-asas-silver">Compte</th>
                     <th className="py-3 px-4 text-[9px] uppercase tracking-widest font-bold text-asas-silver text-right">Débit</th>
                     <th className="py-3 px-4 text-[9px] uppercase tracking-widest font-bold text-asas-silver text-right">Crédit</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-asas-silver/10">
                   {entries.map((req, i) => (
                      <tr key={i} className="hover:bg-asas-sand/20 dark:hover:bg-white/5 transition-colors group">
                        <td className="py-3 px-4 whitespace-nowrap">
                           <p className="text-xs font-bold text-asas-charcoal dark:text-asas-sand">{new Date(req.entry_date || req.created_at).toLocaleDateString('fr-DZ')}</p>
                           <p className="text-[9px] font-mono font-bold text-asas-silver uppercase">{req.reference || `JNL-${req.id.slice(0,6)}`}</p>
                        </td>
                        <td className="py-3 px-4">
                           <p className="text-sm text-asas-charcoal dark:text-asas-sand">{req.description}</p>
                           <p className="text-[9px] uppercase tracking-widest font-bold text-asas-silver mt-0.5 border border-asas-silver/20 bg-asas-sand/50 dark:bg-white/5 w-fit px-1.5 py-0.5 rounded-sm">{req.journal_type || 'Général'}</p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                           <div className="space-y-1">
                             {req.lines?.map((line: any, idx: number) => (
                               <p key={idx} className="text-[10px] font-mono text-asas-charcoal dark:text-asas-sand flex items-center gap-1.5">
                                 {line.transaction_type === 'credit' && <span className="w-3"></span>}
                                 {line.account?.code || line.account_id?.slice(0,5)} - {line.account?.name || 'Compte'}
                               </p>
                             ))}
                           </div>
                        </td>
                        <td className="py-3 px-4 text-right align-top">
                           <div className="space-y-1">
                             {req.lines?.map((line: any, idx: number) => (
                               <p key={idx} className={clsx("text-xs font-mono font-bold", line.transaction_type === 'debit' ? 'text-asas-charcoal dark:text-asas-sand' : 'opacity-0')}>
                                 {line.transaction_type === 'debit' ? fmt(line.amount) : '-'}
                               </p>
                             ))}
                           </div>
                        </td>
                        <td className="py-3 px-4 text-right align-top">
                           <div className="space-y-1">
                             {req.lines?.map((line: any, idx: number) => (
                               <p key={idx} className={clsx("text-xs font-mono font-bold", line.transaction_type === 'credit' ? 'text-asas-charcoal dark:text-asas-sand' : 'opacity-0')}>
                                 {line.transaction_type === 'credit' ? fmt(line.amount) : '-'}
                               </p>
                             ))}
                           </div>
                        </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  )
}
