// src/app/dashboard/finance/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { DollarSign, TrendingDown, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { motion, Variants } from 'motion/react'
import { clsx } from 'clsx'

interface CashPosition {
  cashBalance:       number
  receivablesTotal:  number
  payablesTotal:     number
  netPosition:       number
  liquidityRatio:    number
  liquidityMode:     string
  survivalDaysLeft:  number | null
}

interface AgingBucket { label: string; amount: { amount: number }; count: number; pct: number }
interface AgingData { totalOutstanding: { amount: number }; buckets: AgingBucket[]; collectionEfficiency: number; overdueCount: number }

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return (n/1_000_000_000).toFixed(1)+'G DZD'
  if (Math.abs(n) >= 1_000_000)     return (n/1_000_000).toFixed(1)+'M DZD'
  return new Intl.NumberFormat('fr-DZ').format(Math.round(n))+' DZD'
}

import { ExpensesSection } from './ExpensesSection'
import { LedgerSection } from './LedgerSection'

export default function FinancePage() {
  const [cash,    setCash]    = useState<CashPosition | null>(null)
  const [aging,   setAging]   = useState<AgingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [cashRes, agingRes] = await Promise.all([
          fetch('/api/ledger?view=cash_position'),
          fetch('/api/ledger?view=aging'),
        ])
        if (cashRes.ok) setCash(await cashRes.json())
        if (agingRes.ok) setAging(await agingRes.json())
      } catch (err: any) {
        import('@/lib/observability/errors').then(mod => mod.ErrorTracker.captureError(err, { context: 'FinancePage load' }))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex-1 space-y-6 max-w-6xl mx-auto w-full">
      <div className="h-24 w-1/3 bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-2xl animate-pulse" />)}
      </div>
      <div className="h-64 bg-white dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 rounded-2xl animate-pulse" />
    </div>
  )

  const modeStyle = (cash?.liquidityMode ? {
    growth:   { banner: null },
    caution:  { banner: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 border' },
    survival: { banner: 'bg-red-500/10 border-red-500/20 text-red-500 border' },
  }[cash.liquidityMode as 'growth' | 'caution' | 'survival'] : null) ?? { banner: null }

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <div className="flex-1 text-gray-900 dark:text-gray-100 flex flex-col">
      <div className="w-full space-y-8 max-w-6xl mx-auto">
        <div className="relative z-10 w-full mb-10 pt-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-asas-charcoal dark:text-asas-sand tracking-tight flex items-center gap-4 font-display uppercase">
             <div className="w-14 h-14 rounded-sm bg-asas-sand/50 dark:bg-black/10 border border-asas-silver/20 flex items-center justify-center shadow-sm relative overflow-hidden group">
                 <div className="absolute inset-0 bg-asas-gold/10 group-hover:bg-asas-gold/20 transition-colors" />
                 <DollarSign className="h-7 w-7 text-asas-gold relative z-10" /> 
             </div>
             Analytique Financière
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-asas-silver mt-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-asas-gold animate-[ping_2s_ease-in-out_infinite]" />
            PRÉVISIONS & TRÉSORERIE SYSTÈME
          </p>
        </div>

        {/* Liquidity warning */}
        {cash && cash.liquidityMode !== 'growth' && modeStyle?.banner && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={clsx('rounded-2xl px-6 py-4 flex items-start gap-4 shadow-[0_0_20px_rgba(0,0,0,0.5)]', modeStyle.banner)}>
            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", cash.liquidityMode === 'survival' ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400')}>
               <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xs uppercase tracking-widest block mb-2">
                {cash.liquidityMode === 'survival' ? '🚨 PROTOCOLE SURVIE ACTIF' : '⚠️ ATTENTION REQUISE'}
              </span>
               <p className="text-sm font-bold opacity-80">
                  {cash.liquidityMode === 'survival'
                  ? `${cash.survivalDaysLeft ?? '?'} jours de trésorerie restants au rythme actuel de dépense.`
                  : 'La trésorerie est en dessous du niveau de confort. Surveillez les encaissements de près.'}
               </p>
            </div>
          </motion.div>
        )}

        {/* Cash position cards */}
        {cash && (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Solde Liquidité', value: cash.cashBalance,      icon: DollarSign, color: cash.cashBalance > 5_000_000 ? 'text-asas-emerald' : 'text-red-500', bg: 'bg-white dark:bg-[#141618]', iconBg: 'bg-asas-emerald/10', iconColor: 'text-asas-emerald' },
              { label: 'Créances Clients',    value: cash.receivablesTotal, icon: Clock,      color: 'text-asas-navy dark:text-asas-sand', bg: 'bg-white dark:bg-[#141618]', iconBg: 'bg-asas-navy/10', iconColor: 'text-asas-navy dark:text-asas-sand/50' },
              { label: 'Dettes & Commissions',    value: cash.payablesTotal,    icon: TrendingDown, color: 'text-asas-copper', bg: 'bg-white dark:bg-[#141618]', iconBg: 'bg-asas-copper/10', iconColor: 'text-asas-copper' },
              { label: 'Position Nette',      value: cash.netPosition,      icon: CheckCircle, color: cash.netPosition >= 0 ? 'text-asas-emerald' : 'text-red-500', bg: 'bg-white dark:bg-[#141618]', iconBg: cash.netPosition >= 0 ? 'bg-asas-emerald/10' : 'bg-red-500/10', iconColor: cash.netPosition >= 0 ? 'text-asas-emerald' : 'text-red-500' },
            ].map(({ label, value, icon: Icon, color, bg, iconBg, iconColor }, i) => (
              <motion.div key={label} variants={item} className={clsx("rounded-sm border border-asas-silver/20 p-6 shadow-sm transition-all relative overflow-hidden group hover:border-asas-gold/40", bg)}>
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Icon className="w-16 h-16 text-asas-silver" />
                </div>
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className={clsx("w-10 h-10 rounded-sm flex items-center justify-center border border-asas-silver/10", iconBg, iconColor)}>
                      <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-asas-silver leading-tight">{label}</p>
                </div>
                <p className={clsx('text-xl md:text-2xl font-bold tracking-tighter relative z-10 font-mono', color)}>{fmt(value)}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Receivables aging */}
        {aging && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-[#141618] rounded-sm border border-asas-silver/20 p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-asas-silver/20 gap-6">
              <div>
                  <h2 className="text-xl font-bold text-asas-charcoal dark:text-asas-sand tracking-tight font-display uppercase">Analyse d'Ancienneté</h2>
                  <p className="text-[9px] uppercase font-bold tracking-widest text-asas-silver mt-2">Détail de l'échéancier des flux entrants en attente de vérification.</p>
              </div>
              <div className="flex items-center gap-6 bg-asas-sand/30 dark:bg-black/10 rounded-sm p-4 shrink-0 border border-asas-silver/20">
                 <div>
                     <p className="text-[9px] uppercase tracking-widest text-asas-silver font-bold mb-1">Défauts critiques</p>
                     <p className="text-xl font-bold text-asas-charcoal dark:text-asas-sand leading-none">{aging.overdueCount}</p>
                 </div>
                 <div className="w-px h-10 bg-asas-silver/20" />
                 <div>
                     <p className="text-[9px] uppercase tracking-widest text-asas-silver font-bold mb-1">Efficience Encaissement</p>
                     <p className="text-xl font-bold text-asas-emerald leading-none">{Math.round(aging.collectionEfficiency * 100)}%</p>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {aging.buckets.map(bucket => (
                <div key={bucket.label} className={clsx('rounded-sm p-5 border relative overflow-hidden', bucket.label === '90+' ? 'border-red-500/20 bg-red-500/5' : bucket.label === '61-90' ? 'border-orange-500/20 bg-orange-500/5' : 'border-asas-silver/20 bg-asas-sand/10 dark:bg-white/5')}>
                  {bucket.label === '90+' && <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />}
                  <p className="text-[9px] uppercase tracking-widest font-bold text-asas-silver mb-2 relative z-10">{bucket.label} jours</p>
                  <p className={clsx('text-xl font-bold tracking-tight relative z-10 font-mono', bucket.label === '90+' ? 'text-red-500' : bucket.label === '61-90' ? 'text-orange-500' : 'text-asas-charcoal dark:text-asas-sand')}>
                    {fmt(bucket.amount.amount)}
                  </p>
                  <div className="flex items-center justify-between mt-3 font-bold relative z-10">
                    <span className="text-[10px] text-asas-silver">{bucket.count} flux</span>
                    <span className="text-[10px] text-asas-silver bg-asas-silver/10 px-2 py-0.5 rounded-sm">{bucket.pct}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div>
              <div className="h-3 bg-asas-sand/50 dark:bg-black/20 border border-asas-silver/10 rounded-sm overflow-hidden flex shadow-inner">
                  {aging.buckets.map(bucket => (
                  <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${bucket.pct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      key={bucket.label}
                      className={clsx('h-full transition-all duration-500', bucket.label === '0-30' ? 'bg-asas-emerald' : bucket.label === '31-60' ? 'bg-asas-gold' : bucket.label === '61-90' ? 'bg-orange-500' : 'bg-red-500')}
                  />
                  ))}
              </div>
              <div className="flex gap-6 mt-5 justify-center md:justify-start">
                  {[{ label:'0-30', c:'bg-asas-emerald'}, {label:'31-60',c:'bg-asas-gold'},{label:'61-90',c:'bg-orange-500'},{label:'90+',c:'bg-red-500'}].map(l => (
                  <span key={l.label} className="flex items-center gap-2 text-[9px] uppercase font-bold tracking-widest text-asas-silver">
                      <span className={clsx('h-2.5 w-2.5 rounded-full', l.c)} />{l.label} jours
                  </span>
                  ))}
              </div>
            </div>
          </motion.div>
        )}

        <LedgerSection />
        <ExpensesSection />
      </div>
    </div>
  )
}
