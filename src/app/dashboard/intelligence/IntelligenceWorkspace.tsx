'use client'

import { useEffect, useState, useCallback } from 'react';
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, LineChart, Line
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, Sliders, AlertTriangle, AlertCircle, Wrench, 
  RefreshCw, CheckCircle2, Award, Zap, Building, ChevronRight, Scale, ShieldAlert, FileText, Send 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

export default function IntelligenceWorkspace() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Interactive Simulation Variables
  const [bankDelay, setBankDelay] = useState(30);
  const [stressActive, setStressActive] = useState(false);
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [showingAlertResolve, setShowingAlertResolve] = useState<string | null>(null);
  const [savingSnapshot, setSavingSnapshot] = useState(false);

  const fetchState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/intelligence?bankDelayDays=${bankDelay}&stressScenario=${stressActive}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load intelligence parameters: ", e);
    } finally {
      setLoading(false);
    }
  }, [bankDelay, stressActive]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Submit Snapshot Run
  const handleCaptureSnapshot = async () => {
    setSavingSnapshot(true);
    try {
      const res = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_simulation_snapshot' })
      });
      if (res.ok) {
        alert("Snapshot archivé dans le grand livre double entrée !");
        await fetchState();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSnapshot(false);
    }
  };

  // Resolve Critical Operational Alert
  const handleResolveAlert = async (id: string) => {
    if (!resolutionText.trim()) return;
    setResolvingAlertId(id);
    try {
      const res = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_alert',
          alertId: id,
          actionTaken: resolutionText
        })
      });
      if (res.ok) {
        setResolutionText('');
        setShowingAlertResolve(null);
        await fetchState();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResolvingAlertId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-asas-silver animate-pulse">
        <RefreshCw className="h-8 w-8 text-asas-gold animate-spin mb-4" />
        <p className="text-[10px] uppercase font-bold tracking-widest font-mono">Indexation des métriques décisionnelles...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const { 
    kpis = [], branchScores = [], chantierRisks = [], delinquency = [], alerts = [], treasuryForecast = [] 
  } = metrics;

  // Derive top level KPIs for the dashboard indicators
  const cashBurn = kpis.find((k: any) => k.key === 'cash_burn_rate_dzd')?.value || 1800000;
  const reserveDays = kpis.find((k: any) => k.key === 'liquidity_reserve_days')?.value || 37;
  const defaultRatio = kpis.find((k: any) => k.key === 'overdue_installment_ratio')?.value || 0.18;

  const activeAlertCount = alerts.filter((a: any) => !a.is_resolved).length;

  return (
    <div className="flex-1 flex flex-col space-y-8 bg-transparent">
      
      {/* Simulation Controls Panel */}
      <div className="bg-[#141618] border border-asas-gold/20 p-6 rounded-sm shadow-2xl relative overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay"
          style={{ 
            backgroundImage: 'radial-gradient(circle at center, #C7A15A 1.5px, transparent 1.5px)', 
            backgroundSize: '24px 24px' 
          }} 
        />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[8px] uppercase tracking-widest bg-asas-gold/10 text-asas-gold px-2 py-0.5 rounded-sm border border-asas-gold/20 font-bold flex items-center gap-1">
                <Sliders className="h-3 w-3" /> Paramètres Globaux
              </span>
              <span className="text-[8px] uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-sm font-bold">
                 Algerian Financing Instabilities
              </span>
            </div>
            <h2 className="text-xl font-bold font-display tracking-tight text-white uppercase">
              Simulateur de Stress de Trésorerie
            </h2>
            <p className="text-[10px] text-asas-silver uppercase font-bold tracking-widest mt-1">
              Piloter les variables macro-économiques et calculer les goulots d'étranglement de crédit
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
            {/* Slider 1: Bank processing delay impact */}
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold text-asas-sand">
                <span>Délai Déblocage Crédit CNEP</span>
                <span className="text-asas-gold font-mono">{bankDelay} Jours</span>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={bankDelay}
                onChange={(e) => setBankDelay(Number(e.target.value))}
                className="w-full accent-asas-gold cursor-pointer bg-white/10 h-1.5 rounded-lg"
              />
              <span className="text-[8px] uppercase font-semibold text-asas-silver/65">Impacte la libération des tranches (VEFA)</span>
            </div>

            {/* Checkbox 2: Inflation inflation stress trigger */}
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-white/5 border border-asas-silver/10 hover:border-asas-gold/40 rounded-sm select-none transition-all">
              <input
                type="checkbox"
                checked={stressActive}
                onChange={(e) => setStressActive(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 text-asas-gold accent-asas-gold focus:ring-0"
              />
              <div className="text-left">
                <p className="text-[9px] uppercase font-extrabold tracking-widest text-asas-sand">Choc Inflationniste</p>
                <p className="text-[8px] text-asas-silver uppercase mt-0.5">Hausse 25% Matériaux · Squeeze Inflows</p>
              </div>
            </label>

            {/* Snapshot Trigger */}
            <button
              onClick={handleCaptureSnapshot}
              disabled={savingSnapshot}
              className="px-5 py-3.5 bg-white text-asas-charcoal font-bold text-[10px] uppercase tracking-widest hover:bg-asas-gold hover:text-white transition-all rounded-sm cursor-pointer shadow-md flex items-center gap-2"
            >
              <FileText className="h-4 w-4" /> Sauvegarder Snapshot
            </button>
          </div>
        </div>
      </div>

      {/* Main Executive KPI cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 p-5 rounded-sm shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-asas-silver font-bold block mb-1">Masse Mensuelle Sorties d'Argent (Burn Rate)</span>
            <span className="text-xl font-bold font-mono text-asas-charcoal dark:text-white">
              {(cashBurn).toLocaleString('fr-DZ')} DZD
            </span>
          </div>
          <div className="p-3 rounded-sm bg-red-500/5 border border-red-500/10 text-red-500">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 p-5 rounded-sm shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-asas-silver font-bold block mb-1">Sécurité Autonomie (Réserve Consolidée)</span>
            <span className={clsx(
              'text-xl font-bold font-mono',
              reserveDays < 45 ? 'text-red-500' : 'text-asas-emerald'
            )}>
              {reserveDays} Jours
            </span>
          </div>
          <div className={clsx(
            'p-3 rounded-sm border',
            reserveDays < 45 ? 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse' : 'bg-asas-emerald/5 border-asas-emerald/10 text-asas-emerald'
          )}>
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 p-5 rounded-sm shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-asas-silver font-bold block mb-1">Ratio Retours de Créance Overdue (Installments)</span>
            <span className="text-xl font-bold font-mono text-asas-charcoal dark:text-white">
              {(defaultRatio * 100).toFixed(1)}%
            </span>
          </div>
          <div className="p-3 rounded-sm bg-asas-gold/5 border border-asas-gold/10 text-asas-gold">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Primary Graphs & Forecasting workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Scenario Curve Viz */}
        <div className="lg:col-span-2 bg-white dark:bg-[#141618] border border-asas-silver/20 p-6 rounded-sm shadow-sm flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-asas-silver/10 pb-4">
            <div>
              <h3 className="text-sm uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand font-display flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-asas-gold" /> Courbe Prévisionnelle Trésorerie ($P(10)$ vs $P(90)$ margins)
              </h3>
              <p className="text-[10px] text-asas-silver font-bold uppercase mt-1">
                Projection à 6 mois modélisant les retards bancaires et le squeeze financier
              </p>
            </div>
            {stressActive && (
              <span className="text-[9px] uppercase font-extrabold tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-1 rounded-sm animate-pulse">
                Stress Test Is Active
              </span>
            )}
          </div>

          <div className="h-72 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={treasuryForecast} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C7A15A" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#C7A15A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3139" opacity={0.15} />
                <XAxis dataKey="monthName" stroke="#A3A3A3" />
                <YAxis stroke="#A3A3A3" tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: any) => [`${(Number(value)).toLocaleString('fr-DZ')} DZD`, '']}
                  contentStyle={{ backgroundColor: '#141618', borderColor: 'rgba(199, 161, 90, 0.2)', borderRadius: '4px' }}
                />
                <Legend />
                <Area type="monotone" name="Worst Case - P10" dataKey="p10_balance" stroke="#EF4444" fill="none" strokeDasharray="5 5" />
                <Area type="monotone" name="Expected Outlook" dataKey="expected_balance" stroke="#C7A15A" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2} />
                <Area type="monotone" name="Best Case - P90" dataKey="p90_balance" stroke="#10B981" fill="none" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-asas-silver/10 pt-4">
            <div className="p-3 bg-asas-sand/15 dark:bg-black/10 rounded-sm">
              <span className="text-[8px] uppercase tracking-widest text-asas-silver font-bold block">Inflow Perdu suite aux goulots de crédit</span>
              <p className="text-sm font-bold font-mono text-red-500/90 mt-1">
                -{treasuryForecast.reduce((acc: number, f: any) => acc + (f.delayed_impact || 0), 0).toLocaleString('fr-DZ')} DZD
              </p>
            </div>
            <div className="p-3 bg-asas-sand/15 dark:bg-black/10 rounded-sm">
              <span className="text-[8px] uppercase tracking-widest text-asas-silver font-bold block">Balance Projetée Terme (Expected)</span>
              <p className="text-sm font-bold font-mono text-white mt-1">
                {(treasuryForecast[5]?.expected_balance || 0).toLocaleString('fr-DZ')} DZD
              </p>
            </div>
          </div>
        </div>

        {/* Sub-System Activity Feed (Executive Alerts) */}
        <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 p-6 rounded-sm shadow-sm flex flex-col space-y-4">
          <div>
            <h3 className="text-sm uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand font-display flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-asas-gold animate-bounce" /> Vigie & Alertes Exécutives ({activeAlertCount})
            </h3>
            <p className="text-[10px] text-asas-silver font-bold uppercase mt-1">
              Violations structurelles nécessitant d'immédiates dérogations manuelles
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[350px]">
            {alerts.map((item: any) => (
              <div key={item.id} className={clsx(
                'p-3.5 border rounded-sm flex flex-col space-y-2 transition-all',
                item.is_resolved 
                  ? 'bg-asas-emerald/5 border-asas-emerald/10 text-asas-emerald' 
                  : item.severity === 'critical' 
                    ? 'bg-red-500/5 border-red-500/20 text-red-500 border-l-4 border-l-red-500 animate-pulse' 
                    : 'bg-asas-gold/5 border-asas-gold/20 text-asas-gold border-l-4 border-l-asas-gold'
              )}>
                <div className="flex items-center justify-between">
                  <span className={clsx(
                    'text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-extrabold border',
                    item.is_resolved 
                      ? 'bg-asas-emerald/15 border-asas-emerald/30 text-asas-emerald' 
                      : 'bg-white/5 border-asas-silver/20 text-white'
                  )}>
                    {item.namespace}
                  </span>
                  <span className="text-[8px] font-mono text-asas-silver">{new Date(item.created_at).toLocaleTimeString()}</span>
                </div>
                
                <h4 className="text-xs font-bold font-display uppercase tracking-tight text-white">{item.title}</h4>
                <p className="text-[9px] uppercase font-semibold text-asas-silver leading-normal">{item.message}</p>

                {item.is_resolved ? (
                  <div className="bg-asas-emerald/10 p-2 rounded-sm border border-asas-emerald/20 mt-1">
                    <p className="text-[8px] font-mono text-asas-emerald flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Actions entreprises: {item.action_taken}
                    </p>
                  </div>
                ) : (
                  <div>
                    {showingAlertResolve === item.id ? (
                      <div className="flex flex-col gap-2 mt-2">
                        <textarea
                          placeholder="Saisir la décision opérationnelle d'arbitrage (ex: Injection de capital, bypass d'EDD notarié...)"
                          value={resolutionText}
                          onChange={(e) => setResolutionText(e.target.value)}
                          className="bg-white dark:bg-[#202325] text-[10px] p-2 border border-asas-silver/20 outline-none w-full text-white font-medium"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolveAlert(item.id)}
                            disabled={resolvingAlertId === item.id}
                            className="bg-asas-gold text-white font-bold text-[8px] uppercase tracking-widest px-3 py-1.5 rounded-sm hover:opacity-95 cursor-pointer"
                          >
                            Viser & Valider
                          </button>
                          <button
                            onClick={() => {
                              setShowingAlertResolve(null);
                              setResolutionText('');
                            }}
                            className="bg-white/5 border border-white/10 text-asas-silver font-bold text-[8px] uppercase tracking-widest px-3 py-1.5 rounded-sm cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowingAlertResolve(item.id)}
                        className="mt-2 text-left text-[8px] uppercase tracking-widest font-extrabold text-[#C7A15A] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                         Entreprendre arbitrage maintenant <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Client Default Risk Scorecard & Construction Profitability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Client Default Risk Rating Scorecard (delinquency profiles) */}
        <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 p-6 rounded-sm shadow-sm space-y-4">
          <div>
            <h3 className="text-sm uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand font-display flex items-center gap-2">
              <Scale className="h-4.5 w-4.5 text-asas-gold" /> Vigie des Risques de Non-Remboursement Overdue (VEFA)
            </h3>
            <p className="text-[10px] text-asas-silver font-bold uppercase mt-1">
              Modélise la probabilité d'un client de rater la signature d'appel de fonds ou le visa crédit banque CNEP sous 90j
            </p>
          </div>

          <div className="space-y-3.5">
            {delinquency.map((item: any) => (
              <div key={item.id} className="p-4 bg-asas-sand/15 dark:bg-[#202325] border border-asas-silver/10 rounded-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'text-[8px] uppercase tracking-widest px-2.5 py-0.5 rounded-sm font-extrabold border',
                        item.risk_tier === 'critical' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-asas-gold/10 border-asas-gold/20 text-asas-gold'
                      )}>
                        {item.risk_tier} risk
                      </span>
                      <span className="text-[10px] font-bold text-asas-charcoal dark:text-white uppercase">{item.buyer_name}</span>
                    </div>
                    <p className="text-[9px] uppercase font-bold text-asas-silver mt-2">{item.project} · Unité {item.unit}</p>
                    <div className="mt-2.5 space-y-1">
                      {item.factors?.map((f: string, i: number) => (
                        <p key={i} className="text-[9px] uppercase font-bold text-asas-silver/80 flex items-center gap-1.5">
                          · {f}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="text-left sm:text-right flex items-end sm:items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase tracking-widest text-asas-silver font-bold">Probabilité</span>
                      <span className="text-lg font-bold font-mono text-white">{(item.probability * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <button
                        onClick={() => alert(`Rappel d'urgence WhatsApp envoyé vers l'acheteur ${item.buyer_name} (Simulation API)`)}
                        className="px-3.5 py-2.5 bg-asas-gold hover:bg-white border border-asas-gold/20 text-white hover:text-asas-charcoal font-bold text-[9px] uppercase tracking-widest rounded-sm cursor-pointer transition-colors"
                      >
                        Envoi Relance WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Construction Profitability Margin Erosion Tracker */}
        <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 p-6 rounded-sm shadow-sm space-y-4">
          <div>
            <h3 className="text-sm uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand font-display flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-asas-gold" /> Vigie d'Érosion Marges Programmes Immobiliers 
            </h3>
            <p className="text-[10px] text-asas-silver font-bold uppercase mt-1">
              Mise en perspective des dérives matérielles, retards chantiers et impact direct sur la rentabilité brute
            </p>
          </div>

          <div className="space-y-3.5">
            {chantierRisks.map((item: any, i: number) => (
              <div key={i} className="p-4 bg-asas-sand/15 dark:bg-[#202325] border border-asas-silver/10 rounded-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-asas-silver/10">
                  <div>
                    <h4 className="text-xs font-bold text-asas-charcoal dark:text-white uppercase">{item.project_name}</h4>
                    <p className="text-[9px] uppercase font-bold text-asas-silver mt-1">Retard cumulé : <span className="text-red-500">{item.delay_days} Jours</span></p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[8px] uppercase tracking-widest text-asas-silver font-bold block">Dérive de marge prévisionnelle</span>
                    <span className="text-xs font-mono font-bold text-red-500">
                      -{item.estimated_margin_erosion.toLocaleString('fr-DZ')} DZD
                    </span>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-[8px] uppercase tracking-widest text-asas-silver font-bold block mb-1">Goulots du chantier critiques</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {item.blockages?.length > 0 ? item.blockages.map((b: string, idx: number) => (
                      <span key={idx} className="text-[8px] uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-sm font-bold animate-pulse">
                        {b}
                      </span>
                    )) : (
                      <span className="text-[8px] uppercase tracking-widest bg-asas-emerald/10 text-asas-emerald border border-asas-emerald/20 px-2 py-0.5 rounded-sm font-bold">
                        Aucun blocage logistique identifié
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Network Comparative matrix: Branch performance comparison grid */}
      <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 p-6 rounded-sm shadow-sm space-y-4">
        <div>
          <h3 className="text-sm uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand font-display flex items-center gap-2">
            <Building className="h-4.5 w-4.5 text-asas-gold" /> Matrice Comparative d'Efficacité du Réseau d'Agences (Bi-Annuel)
          </h3>
          <p className="text-[10px] text-asas-silver font-bold uppercase mt-1">
            Évaluation quantitative des vitesses de transaction, conformité aux SLAs de rappel et efficacité d'encaissement local
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-asas-silver/20 text-asas-silver text-[9px] uppercase tracking-widest font-extrabold bg-asas-sand/20 dark:bg-black/25">
                <th className="p-3.5">Rang</th>
                <th className="p-3.5">Branch administrative</th>
                <th className="p-3.5">Vélocité Commerciale</th>
                <th className="p-3.5">Efficacité Encaissement</th>
                <th className="p-3.5">Validation SLAs</th>
                <th className="p-3.5">Index Capital</th>
                <th className="p-3.5">Statut de Performance</th>
              </tr>
            </thead>
            <tbody className="font-medium text-asas-charcoal dark:text-white uppercase font-sans">
              {branchScores.map((item: any) => (
                <tr key={item.branch_id} className="border-b border-asas-silver/10 hover:bg-white/5 transition-all text-[11px]">
                  <td className="p-3.5 font-bold font-mono text-asas-gold">#{item.rank}</td>
                  <td className="p-3.5 font-bold">{item.name}</td>
                  <td className="p-3.5 font-mono">{(item.sales_velocity * 100).toFixed(0)}%</td>
                  <td className="p-3.5 font-mono">{(item.collection_velocity * 100).toFixed(0)}%</td>
                  <td className="p-3.5 font-mono">{(item.sla_compliance * 100).toFixed(0)}%</td>
                  <td className="p-3.5 font-mono">{(item.capital_efficiency * 100).toFixed(0)}%</td>
                  <td className="p-3.5">
                    <span className={clsx(
                      'text-[8px] uppercase tracking-widest font-extrabold px-2.5 py-1 rounded-sm border',
                      item.rank === 1 ? 'bg-asas-emerald/10 border-asas-emerald/20 text-asas-emerald' : 'bg-asas-gold/10 border-asas-gold/20 text-asas-sand'
                    )}>
                      {item.rank === 1 ? 'Leader de Réseau' : 'Observation active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
