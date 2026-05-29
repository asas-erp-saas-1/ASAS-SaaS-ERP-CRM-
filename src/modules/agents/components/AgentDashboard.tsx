// src/modules/agents/components/AgentDashboard.tsx
'use client'
import { useEffect, useState } from 'react'
import { clsx } from 'clsx'

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  return new Intl.NumberFormat('fr-DZ').format(Math.round(n))
}

export function AgentDashboard({ agentId, agentName }: { agentId: string, agentName: string }) {
  const [data, setData] = useState<any>(null)
  const [agreements, setAgreements] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadProfile = () => {
    fetch(`/api/agents/kpis?view=snapshot&agentId=${agentId}`)
      .then(r => r.json()).then(setData)
  }

  const loadAgreements = () => {
    fetch(`/api/agents/commissions?agentId=${agentId}`)
      .then(r => r.json()).then(d => setAgreements(d.unpaid || []))
  }

  useEffect(() => {
    loadProfile()
  }, [agentId])

  const openSettleModal = () => {
    loadAgreements()
    setShowModal(true)
  }

  const settle = async (agreementId: string, amount: number) => {
    setLoading(true)
    try {
      const res = await fetch('/api/command-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId: crypto.randomUUID(),
          aggregateId: agreementId,
          type: 'SETTLE_COMMISSION',
          expectedVersion: 1,
          payload: { agreementId, amount, agentId }
        })
      })
      if (!res.ok) throw new Error('Echec')
      loadProfile()
      loadAgreements()
    } catch (e) {
      alert('Erreur technique')
    } finally {
      setLoading(false)
    }
  }

  if (!data) return <div className="p-6 md:p-8 text-asas-silver text-xs font-bold uppercase tracking-widest animate-pulse">Décryptage du profil...</div>

  return (
    <div className="p-6 md:p-8 bg-white dark:bg-[#141618] border-y lg:border border-asas-silver/20 lg:rounded-sm lg:m-6 shadow-sm relative">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-wide font-display">{agentName} <span className="text-asas-silver ml-2 text-sm font-sans tracking-widest">I-Performance</span></h2>
        <span className="px-3 py-1 bg-asas-sand/50 dark:bg-black/10 rounded-sm text-[9px] font-bold uppercase tracking-widest text-asas-silver border border-asas-silver/20">
           Rang #{data.rank} • {data.tier}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-asas-sand/30 dark:bg-[#141618] border border-asas-silver/20 rounded-sm shadow-sm relative overflow-hidden group hover:border-asas-gold/40 transition-all">
          <div className="absolute inset-0 bg-asas-gold/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-[9px] uppercase font-bold tracking-widest text-asas-silver mb-2 relative z-10">Pipeline Liquidé</p>
          <p className="text-3xl font-bold font-mono text-asas-charcoal dark:text-asas-sand mt-1 relative z-10">{data.closedDeals} <span className="text-[9px] text-asas-silver font-bold uppercase tracking-widest font-sans">Protocoles</span></p>
        </div>
        
        <div className="p-6 bg-asas-gold/10 border border-asas-gold/20 rounded-sm shadow-sm relative overflow-hidden">
          <p className="text-[9px] uppercase font-bold tracking-widest text-asas-gold mb-2">Conversion Réussie</p>
          <p className="text-3xl font-bold font-mono text-asas-gold mt-1">{Math.round(data.closingRatePct)}%</p>
        </div>

        <div className="p-6 bg-asas-emerald/10 border border-asas-emerald/20 rounded-sm shadow-sm relative overflow-hidden">
          <p className="text-[9px] uppercase font-bold tracking-widest text-asas-emerald mb-2">Revenu Généré (Total)</p>
          <p className="text-3xl font-bold font-mono text-asas-emerald mt-1">{fmt(data.totalRevenue)} <span className="text-sm font-sans">DZD</span></p>
        </div>

        <div className="p-6 bg-orange-500/10 border border-orange-500/20 rounded-sm shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-[9px] uppercase font-bold tracking-widest text-orange-500 mb-2">Commissions à Payer</p>
            <p className="text-3xl font-bold font-mono text-orange-500 mt-1">{fmt(data.commissionOutstanding)} <span className="text-sm font-sans">DZD</span></p>
            {data.commissionEarned > 0 && (
              <p className="text-[9px] text-orange-500/70 mt-2 font-bold uppercase tracking-widest">Déjà versé : {fmt(data.commissionEarned)} DZD</p>
            )}
          </div>
          {data.commissionOutstanding > 0 && (
            <button onClick={openSettleModal} className="mt-4 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white text-[10px] uppercase tracking-widest font-bold rounded-sm shadow-sm transition-colors w-full cursor-pointer">
              Régler Commission
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm shadow-sm w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b border-asas-silver/20">
              <h3 className="text-lg font-bold text-asas-charcoal dark:text-asas-sand font-display uppercase tracking-widest">Détail des Commissions (En Attente)</h3>
              <p className="text-[9px] text-asas-silver font-bold uppercase tracking-widest mt-1">Solder les accords pour {agentName}</p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {agreements.length === 0 ? (
                <p className="text-asas-silver text-[9px] font-bold uppercase tracking-widest">Aucune commission en attente.</p>
              ) : (
                <div className="space-y-4">
                  {agreements.map((a) => (
                    <div key={a.agreement_id} className="p-5 border border-asas-silver/20 rounded-sm bg-asas-sand/30 dark:bg-black/10 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest">Transaction #{a.deal_id.slice(0,6)}</p>
                        <p className="text-[9px] uppercase tracking-widest font-bold text-asas-silver mt-1">Reste à payer : <span className="font-mono text-asas-charcoal dark:text-asas-sand">{a.outstanding_balance.toLocaleString()} DZD</span></p>
                      </div>
                      <button 
                        disabled={loading}
                        onClick={() => settle(a.agreement_id, a.outstanding_balance)}
                        className="px-4 py-2.5 bg-asas-charcoal dark:bg-asas-sand text-asas-sand dark:text-asas-charcoal hover:bg-asas-charcoal/80 dark:hover:bg-asas-sand/80 text-[9px] uppercase tracking-widest font-bold rounded-sm disabled:opacity-50 cursor-pointer"
                      >
                        Valider Pmt
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-asas-silver/20 bg-asas-sand/50 dark:bg-black/10 flex justify-end">
              <button disabled={loading} onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-white dark:bg-[#141618] border border-asas-silver/20 hover:bg-asas-sand/50 dark:hover:bg-black/10 text-asas-charcoal dark:text-asas-sand text-[9px] uppercase tracking-widest font-bold rounded-sm transition-colors cursor-pointer">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

