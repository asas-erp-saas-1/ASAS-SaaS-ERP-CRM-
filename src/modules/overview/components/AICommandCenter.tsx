'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { BrainCircuit, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react'

export function AICommandCenter() {
  const [priorityQueue, setPriorityQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/automation?view=priority_queue&limit=3')
        if (res.ok) {
           const data = await res.json()
           setPriorityQueue(data)
        }
      } catch (e: any) {
        import('@/lib/observability/errors').then(mod => mod.ErrorTracker.captureError(e, { context: 'AICommandCenter load' }))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const defaultInsights = [
    {
      type: 'opportunity',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      title: 'Opportunité de clôture',
      message: 'Le Moteur IA analyse les données du terrain en temps réel.'
    },
    {
      type: 'risk',
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      title: 'Analyse Prédictive',
      message: 'Surveillance des risques opérationnels en cours... En attente de signaux.'
    },
    {
      type: 'optimization',
      icon: Sparkles,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      title: 'Optimisation Stratégique',
      message: 'Calibrage des prix du marché par rapport à l\'infrastructure courante.'
    }
  ]

  const insights = priorityQueue.length > 0 
    ? priorityQueue.slice(0, 3).map((item, idx) => {
        let typeInfo = defaultInsights[idx] || defaultInsights[0];
        if (!typeInfo) typeInfo = defaultInsights[0]!;
        if (item.priority === 'urgent' || item.priority === 'high') {
           typeInfo = defaultInsights[1]!;
        } else if (item.client_name?.includes('Invest')) {
           typeInfo = defaultInsights[0]!;
        }
        return {
           ...typeInfo,
           title: item.title || typeInfo.title,
           message: item.description || `Analyse du client ${item.client_name} - Priorité ${item.priority}`
        };
      })
    : defaultInsights;

  return (
    <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm p-8 mt-6 text-asas-charcoal dark:text-asas-sand shadow-sm relative overflow-hidden flex flex-col group">
      <div className="absolute top-0 right-0 w-96 h-96 bg-asas-navy/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-asas-navy/10 transition-all duration-700"></div>
      
      <div className="relative z-10">
        <h3 className="text-2xl font-bold mb-1 tracking-tight font-display text-asas-charcoal dark:text-asas-sand flex items-center gap-3 uppercase">
          <div className="p-2 bg-asas-navy/10 text-asas-navy dark:text-asas-sand/80 rounded-sm">
            <BrainCircuit strokeWidth={1.5} className="w-6 h-6" />
          </div>
          Cortex IA : Prédictions <span className="opacity-40 text-asas-silver mx-2 font-sans font-light">|</span> <span className="opacity-40">الذكاء الاصطناعي</span>
        </h3>
        <p className="text-asas-silver/80 text-sm font-medium leading-relaxed mb-8">
          Moteur d'intelligence ASAS v4.0. Traitement en temps réel des activités.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="bg-asas-sand/10 dark:bg-black/20 border border-asas-silver/10 rounded-sm p-5 hover:border-asas-silver/30 transition-all"
            >
               <div className="flex flex-col h-full">
                 <div className="flex items-center gap-3 mb-4">
                   <div className={`w-10 h-10 rounded-sm ${insight.bg} flex items-center justify-center`}>
                     <Icon className={`w-5 h-5 ${insight.color}`} strokeWidth={2} />
                   </div>
                   <h4 className="text-sm font-bold text-asas-charcoal dark:text-asas-sand leading-tight">{insight.title}</h4>
                 </div>
                 <p className="text-sm text-asas-charcoal/70 dark:text-asas-silver mt-auto leading-relaxed">{insight.message}</p>
               </div>
            </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  )
}
