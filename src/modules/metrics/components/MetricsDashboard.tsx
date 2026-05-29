'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, Variants } from 'motion/react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Users, Target, Activity, AlertCircle, RefreshCcw, Wallet, Briefcase, ArrowRight, ArrowUpRight, BarChart3, ShieldCheck, PieChart as PieChartIcon, Megaphone, TrendingDown } from 'lucide-react'
import { clsx } from 'clsx'

const COLORS = ['#0D2824', '#C7A15A', '#081D33', '#B87333', '#0F1113', '#A7A9AC'];

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'performance' | 'marketing'>('performance')

  useEffect(() => {
    fetch('/api/metrics')
      .then(r => r.json())
      .then(data => {
        setMetrics(data)
        setLoading(false)
      })
      .catch((err) => {
        setLoading(false)
      })
  }, [])

  if (loading || !metrics) {
      return (
        <div className="flex flex-col items-center justify-center py-32 text-asas-charcoal/80 dark:text-asas-silver">
          <RefreshCcw className="w-10 h-10 animate-spin mb-6 text-asas-navy dark:text-asas-sand" strokeWidth={1.5} />
          <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Chargement des analytiques...</p>
        </div>
      )
  }

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 p-4 rounded-sm shadow-sm">
          <p className="text-asas-charcoal dark:text-asas-sand font-bold text-[10px] uppercase tracking-widest mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-bold font-mono" style={{ color: entry.color }}>
              {entry.name === 'rev' ? (entry.value / 1000000).toFixed(1) + 'M DZD' : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const mm = metrics.marketingMetrics || {
    totalAdSpend: 150000,
    displayAdSpend: 150000,
    cpl: 612,
    cac: 4687,
    adSpendByChannel: [
      { name: 'Facebook Ads', value: 90000 },
      { name: 'Instagram Ads', value: 45000 },
      { name: 'Google Ads', value: 15000 }
    ],
    leadsFromAds: 184,
    isReal: false
  };

  const formattedDZD = (num: number) => {
    return new Intl.NumberFormat('fr-DZ').format(Math.round(num)) + ' DZD';
  };

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Tab Switcher */}
      <div className="flex border-b border-asas-silver/20 mb-8 w-full gap-2 relative z-10 font-sans">
         <button 
           onClick={() => setActiveTab('performance')} 
           className={clsx(
             "px-6 py-4 font-bold text-xs uppercase tracking-widest transition-all cursor-pointer relative focus:outline-none",
             activeTab === 'performance' ? "text-asas-gold border-b-2 border-asas-gold font-extrabold" : "text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand font-medium"
           )}
         >
           Performance Portefeuille
         </button>
         <button 
           onClick={() => setActiveTab('marketing')} 
           className={clsx(
             "px-6 py-4 font-bold text-xs uppercase tracking-widest transition-all cursor-pointer relative focus:outline-none",
             activeTab === 'marketing' ? "text-asas-gold border-b-2 border-asas-gold font-extrabold" : "text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand font-medium"
           )}
         >
           Marketing ROI & Acquisition (CAC)
         </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'performance' ? (
          <motion.div 
            key="performance"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Metric 1 */}
              <motion.div variants={item} className="bg-white dark:bg-[#141618] p-6 rounded-sm border border-asas-silver/20 shadow-sm relative overflow-hidden group hover:border-asas-gold/40 transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Users className="w-24 h-24 text-asas-navy dark:text-asas-sand" />
                </div>
                <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div className="w-12 h-12 rounded-sm bg-asas-navy/10 border border-asas-navy/20 text-asas-navy dark:text-asas-sand flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <h2 className="text-[9px] font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest">Leads Actifs</h2>
                </div>
                <h3 className="text-4xl font-bold tracking-tighter text-asas-charcoal dark:text-asas-sand mb-2 relative z-10 font-mono">{metrics.activeLeads}</h3>
                <p className="text-[9px] uppercase tracking-widest font-bold text-asas-silver relative z-10">En cours de traitement</p>
              </motion.div>

              {/* Metric 2 */}
              <motion.div variants={item} className="bg-white dark:bg-[#141618] p-6 rounded-sm border border-asas-silver/20 shadow-sm relative overflow-hidden group hover:border-asas-gold/40 transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Briefcase className="w-24 h-24 text-asas-emerald" />
                </div>
                <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div className="w-12 h-12 rounded-sm bg-asas-emerald/10 border border-asas-emerald/20 text-asas-emerald flex items-center justify-center">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <h2 className="text-[9px] font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest">Transactions Clôturées</h2>
                </div>
                <div className="flex items-end gap-3 relative z-10">
                  <h3 className="text-4xl font-bold tracking-tighter text-asas-charcoal dark:text-asas-sand mb-2 font-mono">{metrics.dealsClosed}</h3>
                  <span className="text-[10px] font-bold text-asas-emerald bg-asas-emerald/10 px-2 py-1 rounded-sm mb-3">+{metrics.dealsWonPercentage}% réussite</span>
                </div>
                <p className="text-[9px] uppercase tracking-widest font-bold text-asas-silver relative z-10">Valeur Moy. {((metrics.avgDealSize || 0) / 1000000).toFixed(1)}M DZD</p>
              </motion.div>

              {/* Metric 3 */}
              <motion.div variants={item} className="bg-white dark:bg-[#141618] p-6 rounded-sm border border-asas-silver/20 shadow-sm relative overflow-hidden group hover:border-asas-gold/40 transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Target className="w-24 h-24 text-asas-gold" />
                </div>
                <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div className="w-12 h-12 rounded-sm bg-asas-gold/10 border border-asas-gold/20 text-asas-gold flex items-center justify-center">
                    <Target className="h-5 w-5" />
                  </div>
                  <h2 className="text-[9px] font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest">Taux de Conversion</h2>
                </div>
                <h3 className="text-4xl font-bold tracking-tighter text-asas-charcoal dark:text-asas-sand mb-2 relative z-10 font-mono">{metrics.conversionRate}%</h3>
                <p className="text-[9px] uppercase tracking-widest font-bold text-asas-silver relative z-10">Sur l'ensemble des leads qualifiés</p>
              </motion.div>
            </motion.div>

            {/* Charts section */}
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
              {/* Chart 1 */}
              <motion.div variants={item} className="bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm p-8 shadow-sm relative overflow-hidden xl:col-span-1">
                   <div className="flex items-center justify-between mb-8">
                       <h3 className="text-sm font-bold text-asas-charcoal dark:text-asas-sand tracking-widest uppercase font-display">Évolution du CA (MTD)</h3>
                       <span className="px-3 py-1 bg-asas-emerald/10 text-asas-emerald rounded-sm text-[9px] uppercase tracking-widest font-bold">Croissance Stable</span>
                   </div>
                   <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={metrics.revenueByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0D2824" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#0D2824" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(167, 169, 172, 0.2)" vertical={false} />
                              <XAxis dataKey="month" stroke="currentColor" className="text-asas-silver text-[10px]" tickMargin={10} axisLine={false} tickLine={false} />
                              <YAxis stroke="currentColor" className="text-asas-silver text-[10px]" tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} />
                              <Tooltip content={<CustomTooltip />} />
                              <Area type="monotone" dataKey="rev" stroke="#0D2824" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                          </AreaChart>
                      </ResponsiveContainer>
                   </div>
              </motion.div>

              {/* Chart 3 - Lead Sources */}
              <motion.div variants={item} className="bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm p-8 shadow-sm relative overflow-hidden xl:col-span-1">
                   <div className="flex items-center justify-between mb-8">
                       <h3 className="text-sm font-bold text-asas-charcoal dark:text-asas-sand tracking-widest uppercase font-display">Sources des Leads</h3>
                       <span className="px-3 py-1 bg-asas-navy/10 text-asas-navy dark:text-asas-sand rounded-sm text-[9px] uppercase tracking-widest font-bold">Pipeline Actuel</span>
                   </div>
                   <div className="h-72 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={metrics.leadSourceData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  paddingAngle={5}
                                  dataKey="value"
                                  stroke="rgba(0,0,0,0)"
                              >
                                  {metrics.leadSourceData?.map((entry: any, index: number) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                              </Pie>
                              <Tooltip />
                          </PieChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                       {metrics.leadSourceData?.map((entry: any, index: number) => (
                           <div key={`legend-${index}`} className="flex items-center gap-2">
                               <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                               <span className="text-[9px] font-bold text-asas-silver uppercase tracking-widest">{entry.name}</span>
                           </div>
                       ))}
                   </div>
              </motion.div>
              
              {/* Chart 2 */}
              <motion.div variants={item} className="bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm p-8 shadow-sm relative overflow-hidden lg:col-span-2">
                   <div className="flex items-center justify-between mb-8">
                       <h3 className="text-sm font-bold text-asas-charcoal dark:text-asas-sand tracking-widest uppercase font-display">Volume des Ventes</h3>
                       <span className="px-3 py-1 bg-asas-gold/10 text-asas-gold rounded-sm text-[9px] uppercase tracking-widest font-bold">Volume Actif</span>
                   </div>
                   <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={metrics.salesByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(167, 169, 172, 0.2)" vertical={false} />
                              <XAxis dataKey="month" stroke="currentColor" className="text-asas-silver text-[10px]" tickMargin={10} axisLine={false} tickLine={false} />
                              <YAxis stroke="currentColor" className="text-asas-silver text-[10px]" axisLine={false} tickLine={false} />
                              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                              <Bar dataKey="sales" fill="#C7A15A" radius={[2, 2, 0, 0]} barSize={40} />
                          </BarChart>
                      </ResponsiveContainer>
                   </div>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            key="marketing"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6 font-sans text-asas-charcoal dark:text-asas-sand"
          >
            {/* Promo text banner */}
            <div className="bg-asas-sand/30 dark:bg-black/10 border border-asas-silver/20 p-6 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden backdrop-blur-3xl">
              <div className="relative z-10 max-w-2xl">
                <span className="inline-block px-3 py-1 bg-asas-gold/10 text-asas-gold border border-asas-gold/30 text-[9px] font-bold uppercase tracking-widest rounded-sm mb-3">
                   {mm.isReal ? "PROSPECTION RÉELLE ACTIVE" : "SIMULATION ANALYTIQUE ACTIVE"}
                </span>
                <h2 className="text-xl font-bold text-asas-charcoal dark:text-asas-sand font-display uppercase tracking-wider mb-1">Efficacité Publicitaire & ROI</h2>
                <p className="text-xs font-medium text-asas-silver leading-relaxed">
                   Mesurez précisément les investissements de communication (Facebook, Instagram) et calculez les ratios de conversion financiers. Identifiez les canaux qui génèrent le plus de leads qualifiés en évitant la perte de budget publicitaire.
                </p>
              </div>
              <div className="shrink-0 flex items-center bg-asas-gold/10 border border-asas-gold/20 px-4 py-3 rounded-sm gap-2 mt-2 md:mt-0">
                <Target className="w-5 h-5 text-asas-gold animate-bounce" />
                <span className="text-[10px] font-bold text-asas-gold uppercase tracking-widest">Optimiseur ROI</span>
              </div>
            </div>

            {/* Marketing cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Budget Pub Global', value: mm.totalAdSpend > 0 ? mm.totalAdSpend : mm.displayAdSpend, icon: Megaphone, color: 'text-asas-gold', bg: 'bg-white dark:bg-[#141618]', labelExtra: mm.isReal ? 'Inscrit dans les charges' : 'Configuration standard' },
                { label: 'Coût Par Prospect (CPL)', value: mm.cpl, icon: Target, color: 'text-asas-navy dark:text-asas-sand', bg: 'bg-white dark:bg-[#141618]', labelExtra: 'Moyenne calculée' },
                { label: 'Indicateur CAC Moyen', value: mm.cac, icon: Wallet, color: 'text-asas-emerald', bg: 'bg-white dark:bg-[#141618]', labelExtra: 'Acquisition par compromis' },
                { label: 'Leads Issus Pubs', value: mm.leadsFromAds, icon: Users, color: 'text-[#B87333]', bg: 'bg-white dark:bg-[#141618]', labelExtra: 'Volume de prospects' },
              ].map(({ label, value, icon: Icon, color, bg, labelExtra }) => (
                <div key={label} className={clsx("rounded-sm border border-asas-silver/20 p-6 shadow-sm relative overflow-hidden group hover:border-asas-gold/40 transition-colors", bg)}>
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                     <Icon className="w-16 h-16 text-asas-silver" />
                  </div>
                  <div className="flex items-center gap-4 mb-4 relative z-10">
                    <div className="w-10 h-10 rounded-sm bg-asas-sand/50 dark:bg-black/10 flex items-center justify-center border border-asas-silver/10">
                        <Icon className={clsx("h-5 w-5", color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-asas-silver">{label}</p>
                      <p className="text-[8px] text-asas-silver/70 font-semibold truncate leading-none mt-0.5">{labelExtra}</p>
                    </div>
                  </div>
                  <p className="text-xl md:text-2xl font-bold tracking-tighter text-asas-charcoal dark:text-asas-sand font-mono relative z-10">
                    {label.includes('Leads') ? value : formattedDZD(value)}
                  </p>
                </div>
              ))}
            </div>

            {/* Monthly and Channel metrics section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
              <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm p-8 shadow-sm lg:col-span-2 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-asas-charcoal dark:text-asas-sand tracking-widest uppercase font-display mb-4">Moteur de Rentabilité d'Acquisition</h3>
                  <p className="text-xs text-asas-silver leading-relaxed font-medium mb-10">
                     L'analyse compare le volume de prospection global par rapport au budget investi. Une efficacité d'acquisition optimale pour les promoteurs en Algérie doit se situer en dessous de 800 DZD par Lead sur Facebook Ads. Au delà, revoyez le ciblage ou vos visuels.
                  </p>
                </div>
                
                <div className="space-y-6">
                  {/* Progress bars of channel acquisition rate */}
                  {[
                    { channel: 'Facebook / Instagram Ads', rate: 75, value: `${mm.leadsFromAds} Prospect(s)`, color: 'bg-asas-gold' },
                    { channel: 'Site Web / SEO Organique', rate: 18, value: 'Réseaux Naturels', color: 'bg-asas-navy' },
                    { channel: 'Parrainage & Autres canaux', rate: 7, value: 'Bouche-à-oreille', color: 'bg-asas-silver' }
                  ].map((bar) => (
                    <div key={bar.channel} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-asas-silver">
                         <span>{bar.channel}</span>
                         <span className="text-asas-charcoal dark:text-asas-sand">{bar.rate}% ({bar.value})</span>
                      </div>
                      <div className="h-2 w-full bg-asas-silver/20 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${bar.rate}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={clsx("h-full", bar.color)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Repartition block cost */}
              <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm p-8 shadow-sm lg:col-span-1 flex flex-col justify-between">
                <div>
                   <h3 className="text-sm font-bold text-asas-charcoal dark:text-asas-sand tracking-widest uppercase font-display mb-2">Canaux Publicitaires</h3>
                   <p className="text-[9px] uppercase tracking-widest font-bold text-asas-silver mb-8">Part du capital allouée par régie</p>
                </div>

                <div className="h-48 w-full flex items-center justify-center relative">
                   <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                           <Pie
                               cx="50%"
                               cy="50%"
                               data={mm.adSpendByChannel}
                               innerRadius={45}
                               outerRadius={75}
                               paddingAngle={4}
                               dataKey="value"
                               stroke="rgba(0,0,0,0)"
                           >
                               {mm.adSpendByChannel.map((entry: any, index: number) => (
                                   <Cell key={`cell-mkt-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                           </Pie>
                           <Tooltip formatter={(value) => formattedDZD(Number(value))} />
                       </PieChart>
                   </ResponsiveContainer>
                </div>

                <div className="space-y-3 mt-4">
                  {mm.adSpendByChannel.map((entry: any, index: number) => (
                    <div key={entry.name} className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-asas-silver pb-2 border-b border-asas-silver/10 last:border-0 last:pb-0">
                       <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span>{entry.name}</span>
                       </div>
                       <span className="text-asas-charcoal dark:text-asas-sand font-mono">{formattedDZD(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

