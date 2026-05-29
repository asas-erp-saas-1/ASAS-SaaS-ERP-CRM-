// src/app/dashboard/agents/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Users, TrendingUp, TrendingDown, ChevronRight, Award } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { clsx } from 'clsx'
import { AgentDashboard } from '@/modules/agents/components/AgentDashboard'

interface AgentRow {
  agentId:          string
  agentName:        string
  tier:             string
  rank:             number
  rankDelta:        number | null
  performanceScore: number
  closedDeals:      number
  activeDeals:      number
  totalRevenue:     number
  commissionEarned: number
  closingRatePct:   number
  avgDealSize:      number
}

const TIER_CONFIG: Record<string, { color: string; icon: string }> = {
  Elite:   { color: 'text-asas-gold bg-asas-gold/10 border-asas-gold/20', icon: '👑' },
  Gold:    { color: 'text-asas-copper bg-asas-copper/10 border-asas-copper/20', icon: '🥇' },
  Silver:  { color: 'text-asas-silver bg-asas-silver/10 border-asas-silver/20',   icon: '🥈' },
  Bronze:  { color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',icon: '🥉' },
  Starter: { color: 'text-asas-charcoal dark:text-asas-sand bg-asas-sand/10 border-asas-silver/20',    icon: '⭐' },
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  return new Intl.NumberFormat('fr-DZ').format(Math.round(n))
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 h-2 bg-asas-sand/50 dark:bg-black/10 rounded-sm overflow-hidden border border-asas-silver/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={clsx('h-full transition-colors', score >= 75 ? 'bg-asas-emerald' : score >= 50 ? 'bg-asas-gold' : score >= 25 ? 'bg-orange-500' : 'bg-red-500')}
        />
      </div>
      <span className={clsx('text-[9px] font-mono font-bold w-7 text-right', score >= 75 ? 'text-asas-emerald' : score >= 50 ? 'text-asas-gold' : score >= 25 ? 'text-orange-500' : 'text-red-500')}>
        {Math.round(score)}
      </span>
    </div>
  )
}

export default function AgentsPage() {
  const [agents,     setAgents]    = useState<AgentRow[]>([])
  const [loading,    setLoading]   = useState(true)
  const [selectedId, setSelected]  = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch('/api/agents/kpis?view=rankings&limit=50')
        const data = await res.json()
        setAgents(data.rankings ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const selected = agents.find(a => a.agentId === selectedId)

  return (
    <div className="flex flex-1 h-full bg-white dark:bg-[#141618] overflow-hidden font-sans rounded-sm shadow-sm border border-asas-silver/20">
      {/* Left: rankings */}
      <div className={clsx('flex flex-col bg-white dark:bg-[#141618] border-r border-asas-silver/20 overflow-hidden transition-all duration-300 z-10', selectedId ? 'hidden lg:flex lg:w-1/2 xl:w-[45%]' : 'w-full')}>
        {/* Header */}
        <div className="px-8 py-6 border-b border-asas-silver/20 shrink-0 bg-asas-sand/30 dark:bg-black/10">
          <h1 className="text-2xl font-bold text-asas-charcoal dark:text-asas-sand flex items-center gap-3 tracking-tight font-display uppercase">
             <div className="w-10 h-10 rounded-sm bg-asas-navy/10 border border-asas-navy/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-asas-navy dark:text-asas-sand" /> 
             </div>
             Classement des Agents
          </h1>
          <p className="text-[9px] uppercase font-bold tracking-widest text-asas-silver mt-2">{agents.length} agents actifs au total</p>
        </div>

        {/* Rankings table */}
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-[#171717] rounded-sm animate-pulse" />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-asas-silver py-20">
              <div className="w-20 h-20 bg-gray-200 dark:bg-[#171717] rounded-full flex items-center justify-center mb-4">
                 <Users className="h-10 w-10 text-asas-charcoal/80 dark:text-asas-silver" />
              </div>
              <p className="font-extrabold text-asas-charcoal dark:text-asas-sand">Aucun agent trouvé</p>
              <p className="text-sm mt-1">Les données de classement n'ont pas pu être chargées.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-asas-sand/50 dark:bg-black/10 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-[9px] uppercase font-bold tracking-widest text-asas-silver w-16 text-center">#</th>
                  <th className="px-4 py-4 text-[9px] uppercase font-bold tracking-widest text-asas-silver">Agent</th>
                  <th className="px-4 py-4 text-[9px] uppercase font-bold tracking-widest text-asas-silver hidden md:table-cell">Score Performance</th>
                  <th className="px-4 py-4 text-[9px] uppercase font-bold tracking-widest text-asas-silver hidden lg:table-cell text-right">Transactions</th>
                  <th className="px-4 py-4 text-[9px] uppercase font-bold tracking-widest text-asas-silver hidden xl:table-cell text-right">Revenu</th>
                  <th className="px-4 py-4 text-[9px] uppercase font-bold tracking-widest text-asas-silver hidden lg:table-cell text-right">Conversion</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-asas-silver/10 bg-white dark:bg-[#141618]">
                <AnimatePresence>
                {agents.map((agent, i) => {
                  const tierCfg = TIER_CONFIG[agent.tier] ?? TIER_CONFIG['Starter']!
                  const isSelected = selectedId === agent.agentId;
                  return (
                    <motion.tr
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={agent.agentId}
                      onClick={() => setSelected(isSelected ? null : agent.agentId)}
                      className={clsx('cursor-pointer transition-colors group relative', isSelected ? 'bg-asas-sand/30 dark:bg-black/10' : 'hover:bg-asas-sand/10 dark:hover:bg-white/5')}
                    >
                      {/* Active indicator */}
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-asas-gold" />}
                      
                      {/* Rank */}
                      <td className="px-6 py-5 text-center">
                        <div className={clsx(
                          'h-6 w-6 mx-auto rounded-sm flex items-center justify-center text-[10px] font-bold font-mono',
                          agent.rank === 1 ? 'bg-asas-gold text-white' :
                          agent.rank === 2 ? 'bg-asas-silver text-white' :
                          agent.rank === 3 ? 'bg-asas-copper text-white' :
                          'bg-transparent text-asas-silver border border-asas-silver/20'
                        )}>
                          {agent.rank}
                        </div>
                      </td>

                      {/* Name + tier + delta */}
                      <td className="px-4 py-5">
                        <div className="flex flex-col gap-1.5">
                          <p className={clsx("text-sm font-bold", isSelected ? 'text-asas-gold' : 'text-asas-charcoal dark:text-asas-sand')}>{agent.agentName}</p>
                          <div className="flex items-center gap-2">
                            <span className={clsx('text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-bold border', tierCfg.color)}>
                              {tierCfg.icon} {agent.tier}
                            </span>
                            {agent.rankDelta !== null && (
                              <span className={clsx('text-[10px] font-bold flex items-center gap-0.5', agent.rankDelta > 0 ? 'text-asas-emerald' : agent.rankDelta < 0 ? 'text-red-500' : 'text-asas-silver')}>
                                {agent.rankDelta > 0 ? <TrendingUp className="h-3 w-3" /> : agent.rankDelta < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                                {agent.rankDelta > 0 ? `+${agent.rankDelta}` : agent.rankDelta < 0 ? String(agent.rankDelta) : '–'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Score bar */}
                      <td className="px-4 py-5 hidden md:table-cell align-middle">
                        <ScoreBar score={agent.performanceScore} />
                      </td>

                      {/* Closed deals */}
                      <td className="px-4 py-5 text-right hidden lg:table-cell align-middle">
                         <div className="flex flex-col items-end">
                            <span className="text-sm font-bold font-mono text-asas-charcoal dark:text-asas-sand">{agent.closedDeals} conclues</span>
                            <span className="text-[9px] uppercase tracking-widest font-bold text-asas-silver mt-1">{agent.activeDeals} en cours</span>
                         </div>
                      </td>

                      {/* Revenue */}
                      <td className="px-4 py-5 text-right hidden xl:table-cell align-middle">
                        <span className="text-[10px] font-bold font-mono text-asas-emerald bg-asas-emerald/10 border border-asas-emerald/20 px-2 py-1 rounded-sm">
                           {fmt(agent.totalRevenue)} DZD
                        </span>
                      </td>

                      {/* Close rate */}
                      <td className="px-4 py-5 text-right hidden lg:table-cell align-middle">
                        <span className={clsx('text-[10px] font-mono font-bold', agent.closingRatePct >= 40 ? 'text-asas-emerald' : agent.closingRatePct >= 20 ? 'text-asas-gold' : 'text-asas-silver')}>
                          {Math.round(agent.closingRatePct)}%
                        </span>
                      </td>

                      <td className="pr-6 align-middle text-right">
                        <ChevronRight className={clsx("h-4 w-4 transition-transform", isSelected ? 'text-asas-gold translate-x-1' : 'text-asas-silver opacity-0 group-hover:opacity-100')} />
                      </td>
                    </motion.tr>
                  )
                })}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: agent detail */}
      {selectedId && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 overflow-y-auto bg-white dark:bg-[#141618]">
          <div className="lg:hidden bg-asas-sand/50 dark:bg-black/10 border-b border-asas-silver/20 px-4 py-2 sticky top-0 z-20">
            <button onClick={() => setSelected(null)} className="p-2 text-[9px] uppercase tracking-widest font-bold text-asas-gold flex items-center gap-1 hover:text-asas-gold/80 transition-colors">
               <ChevronRight className="h-4 w-4 rotate-180 -ml-1" /> Retour au Classement
            </button>
          </div>
          <div className="p-4 md:p-6 lg:scroll-mt-0">
             {selected && <AgentDashboard agentId={selectedId} agentName={selected.agentName} />}
          </div>
        </motion.div>
      )}
    </div>
  )
}
