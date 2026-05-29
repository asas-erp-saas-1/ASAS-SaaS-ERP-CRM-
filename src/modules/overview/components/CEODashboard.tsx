// src/modules/overview/components/CEODashboard.tsx
'use client'
import { useEffect, useState } from 'react'
import { motion, Variants } from 'motion/react'
import { TrendingUp, Users, Target, Activity, AlertCircle, RefreshCcw, Wallet, Briefcase, ArrowRight, ArrowUpRight, BarChart3, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { PerformanceChart } from './PerformanceChart'
import { ManagerExceptions } from './ManagerExceptions'

const AICommandCenter = dynamic(() => import('./AICommandCenter').then(mod => mod.AICommandCenter), {
  ssr: false,
  loading: () => (
    <div className="bg-white dark:bg-[#141618] rounded-sm p-8 mt-6 border border-asas-silver/20 h-64 flex items-center justify-center shadow-sm">
      <RefreshCcw className="w-6 h-6 animate-spin text-asas-silver" />
    </div>
  )
})

export function CEODashboard({ initialMetrics }: { initialMetrics?: any }) {
  const [kpis, setKpis] = useState<any>(initialMetrics || null)
  const [loading, setLoading] = useState(!initialMetrics)

  useEffect(() => {
    if (initialMetrics) return;
    fetch('/api/metrics')
      .then(r => r.json())
      .then(data => {
        setKpis(data)
        setLoading(false)
      })
      .catch((err) => {
        import('@/lib/observability/errors').then(mod => mod.ErrorTracker.captureError(err, { context: 'CEODashboard load' }));
        setLoading(false)
      })
  }, [initialMetrics])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-asas-charcoal/80 dark:text-asas-silver">
        <RefreshCcw className="w-10 h-10 animate-spin mb-6 text-asas-navy dark:text-asas-sand" strokeWidth={1.5} />
        <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Synchronisation OS en cours...</p>
      </div>
    )
  }

  if (!kpis) return null;

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
    <div className="mt-8 pb-12 overflow-hidden">
      {kpis.dataFreshness === 'stale' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-sm p-4 flex items-start gap-3 backdrop-blur-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-800 tracking-tight">Données non synchronisées</h4>
            <p className="text-xs text-amber-700/80 mt-1 font-medium">Le système financier est en cours de rapprochement. Certains chiffres secondaires datent de la dernière heure.</p>
          </div>
        </motion.div>
      )}

      {/* Main KPI Bento Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6"
      >
        {/* Card 1 */}
        <motion.div variants={item} className="bg-white dark:bg-[#141618] border border-asas-silver/20 border-t-2 border-t-asas-gold p-6 shadow-sm flex flex-col justify-between group relative overflow-hidden rounded-sm hover:border-asas-gold/50 transition-colors">
          <div className="flex items-start justify-between mb-8 relative z-10">
            <div className="w-10 h-10 flex items-center justify-center text-asas-gold">
              <Briefcase className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="px-2 py-0.5 bg-asas-emerald/10 text-asas-emerald border border-asas-emerald/20 rounded-sm text-[10px] font-bold tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12%
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-asas-silver mb-1 uppercase tracking-wider">Valeur du Pipeline <span className="opacity-50">| قيمة الأنابيب</span></p>
            <h3 className="text-3xl font-bold text-asas-charcoal dark:text-asas-sand tracking-tight mb-1 font-display">{((kpis.pipelineWeightedValue || 0) / 1000000).toFixed(1)}M <span className="text-sm text-asas-silver font-medium">DZD</span></h3>
            <p className="text-[10px] text-asas-silver font-medium uppercase tracking-wider">Pondéré par probabilité</p>
          </div>
        </motion.div>

        {/* Card 2 */}
        <motion.div variants={item} className="bg-white dark:bg-[#141618] border border-asas-silver/20 border-t-2 border-t-asas-emerald p-6 shadow-sm flex flex-col justify-between group relative overflow-hidden rounded-sm hover:border-asas-emerald/50 transition-colors">
          <div className="flex items-start justify-between mb-8 relative z-10">
            <div className="w-10 h-10 flex items-center justify-center text-asas-emerald">
              <TrendingUp className="w-5 h-5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-asas-silver mb-1 uppercase tracking-wider">Revenus (MTD) <span className="opacity-50">| الإيرادات</span></p>
            <h3 className="text-3xl font-bold text-asas-charcoal dark:text-asas-sand tracking-tight mb-1 font-display">{((kpis.revenueAccrualMTD || 0) / 1000000).toFixed(1)}M <span className="text-sm text-asas-silver font-medium">DZD</span></h3>
            <p className="text-[10px] text-asas-silver font-medium uppercase tracking-wider">Ce mois-ci</p>
          </div>
        </motion.div>

        {/* Card 3 */}
        <motion.div variants={item} className="bg-white dark:bg-[#141618] border border-asas-silver/20 border-t-2 border-t-asas-navy p-6 shadow-sm flex flex-col justify-between group relative overflow-hidden rounded-sm hover:border-asas-navy/50 transition-colors">
          <div className="flex items-start justify-between mb-8 relative z-10">
            <div className="w-10 h-10 flex items-center justify-center text-asas-navy dark:text-asas-sand/80">
              <Target className="w-5 h-5" strokeWidth={1.5} />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-asas-silver mb-1 uppercase tracking-wider">Taux de Conversion <span className="opacity-50">| معدل التحويل</span></p>
            <h3 className="text-3xl font-bold text-asas-charcoal dark:text-asas-sand tracking-tight mb-1 font-display">{kpis.conversionRate || 0}<span className="text-sm text-asas-silver font-medium">%</span></h3>
            <p className="text-[10px] text-asas-silver font-medium uppercase tracking-wider">Moyenne sur 30 jours</p>
          </div>
        </motion.div>

        {/* Card 4 - Dark variant */}
        <motion.div variants={item} className="bg-asas-charcoal border-t-2 border-asas-gold border-x border-b border-asas-silver/20 p-6 shadow-sm flex flex-col justify-between group relative overflow-hidden rounded-sm hover:border-asas-gold/50 transition-colors">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
            <div 
              className="absolute inset-0 pointer-events-none mix-blend-overlay z-0 w-32 h-32"
              style={{ 
                backgroundImage: 'radial-gradient(circle at center, #C7A15A 1px, transparent 1px)', 
                backgroundSize: '10px 10px' 
              }} 
            />
          </div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-8">
              <div className="w-10 h-10 flex items-center justify-center text-asas-gold backdrop-blur-md">
                <Wallet className="w-5 h-5" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-xs font-bold text-asas-silver/80 mb-1 uppercase tracking-wider">Trésorerie <span className="opacity-50">| السيولة النقدية</span></p>
            <h3 className="text-3xl font-bold text-asas-sand tracking-tight mb-1 font-display">{((kpis.cashBalance || 0) / 1000000).toFixed(1)}M <span className="text-sm text-asas-silver font-medium">DZD</span></h3>
            <p className="text-[10px] text-asas-silver/80 font-medium font-mono uppercase">MODE: {kpis.liquidityMode || 'Standard'}</p>
          </div>
        </motion.div>
      </motion.div>

      <motion.div variants={item}>
        <ManagerExceptions />
      </motion.div>

      <motion.div variants={item} className="mt-6 mb-6">
        <PerformanceChart />
      </motion.div>

      {/* Secondary Bento Area */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
      >
        {/* Activity Feed */}
        <div className="md:col-span-2 bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm p-8 shadow-sm relative overflow-hidden group/feed">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h3 className="text-xl font-bold text-asas-charcoal dark:text-asas-sand tracking-tight flex items-center gap-2 font-display uppercase">
              <Activity className="w-5 h-5 text-asas-gold" />
              Pulse Actif <span className="opacity-40">| النبض النشط</span>
            </h3>
            <button className="text-sm font-bold text-asas-navy dark:text-asas-sand/80 hover:text-asas-gold flex items-center gap-1 group">
              Voir tout <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
          
          <div className="flex flex-col gap-3 relative z-10">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="group flex items-center justify-between p-4 bg-asas-sand/20 dark:bg-black/20 border border-asas-silver/10 hover:border-asas-silver/30 rounded-sm transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-sm bg-asas-navy/10 dark:bg-white/5 flex items-center justify-center">
                    {i === 1 ? <ShieldCheck className="w-5 h-5 text-asas-emerald" /> : <Users className="w-5 h-5 text-asas-navy dark:text-asas-sand/80" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-asas-charcoal dark:text-asas-sand">{i === 1 ? 'Transaction conclue: Villa Atlas' : 'Nouveaux leads ajoutés via portail'}</p>
                    <p className="text-[11px] font-medium text-asas-silver mt-0.5 uppercase tracking-wide">Il y a {i + 1 * 2} heures</p>
                  </div>
                </div>
                <span className={`px-3 py-1.5 rounded-sm text-xs font-bold ${
                  i === 1 ? 'bg-asas-emerald/10 text-asas-emerald border border-asas-emerald/20' : 'bg-asas-navy/10 text-asas-navy border border-asas-navy/20 dark:text-asas-sand dark:border-white/20'
                }`}>
                  {i === 1 ? '45M DZD' : '+12 Leads'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Center - Dark Charcoal/Gold */}
        <div className="bg-asas-charcoal rounded-sm p-8 text-asas-sand shadow-sm relative overflow-hidden flex flex-col border border-asas-silver/20 group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-asas-gold/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-asas-gold/10 transition-all duration-700"></div>
          
          <div className="relative z-10 flex-1 flex flex-col">
            <h3 className="text-2xl font-bold mb-3 tracking-tight font-display text-asas-sand uppercase">Hub de Commandement</h3>
            <p className="text-asas-silver/80 text-sm font-medium leading-relaxed mb-8">
              Raccourcis vers vos workflows les plus critiques.
            </p>
            
            <div className="space-y-3 mt-auto">
              <Link href="/dashboard/deals" className="w-full flex items-center justify-between px-5 py-4 bg-white/5 hover:bg-white/10 border border-asas-silver/10 hover:border-asas-gold/30 rounded-sm transition-all text-sm font-bold text-asas-sand group/link">
                <span className="flex items-center gap-3"><Briefcase className="w-4 h-4 text-asas-silver group-hover/link:text-asas-gold transition-colors" /> Gérer transactions</span>
                <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </Link>
              <Link href="/dashboard/metrics" className="w-full flex items-center justify-between px-5 py-4 bg-white/5 hover:bg-white/10 border border-asas-silver/10 hover:border-asas-gold/30 rounded-sm transition-all text-sm font-bold text-asas-sand group/link">
                <span className="flex items-center gap-3"><BarChart3 className="w-4 h-4 text-asas-silver group-hover/link:text-asas-gold transition-colors" /> Analytiques avancés</span>
                <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </Link>
              <Link href="/dashboard/finance" className="w-full flex items-center justify-between px-5 py-4 bg-asas-gold text-asas-charcoal hover:bg-asas-gold/90 border border-transparent rounded-sm transition-all text-sm font-bold group/link mt-2">
                <span className="flex items-center gap-3"><Wallet className="w-4 h-4 group-hover/link:scale-110 transition-transform" /> Rapprochement</span>
                <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* AI Intelligence Layer */}
      <AICommandCenter />
    </div>
  )
}
