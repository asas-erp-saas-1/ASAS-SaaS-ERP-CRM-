'use client'

import { useState } from 'react'
import { Database, Zap, CheckCircle, RefreshCcw } from 'lucide-react'
import { clsx } from 'clsx'

export function SystemValidationWidget() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSeed = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/system/seed', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
      } else {
        throw new Error(data.error || 'Failed to seed data')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm p-8 shadow-sm relative overflow-hidden group mb-8 hover:border-asas-gold/40 transition-colors">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <Database className="w-24 h-24 text-asas-navy dark:text-asas-sand" />
      </div>
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-sm font-bold text-asas-charcoal dark:text-asas-sand flex items-center gap-2 font-display mb-2 uppercase tracking-widest">
            <div className="w-8 h-8 rounded-sm bg-asas-navy/10 border border-asas-navy/20 flex items-center justify-center text-asas-navy dark:text-asas-sand">
              <Zap className="h-4 w-4" />
            </div>
            Validation Staging (Pre-Release)
          </h2>
          <p className="text-[10px] font-bold text-asas-silver max-w-xl">
            Générez un ensemble complet de données opérationnelles (Promoteurs, Projets, Biens, Clients, Leads) pour valider l'architecture et les pipelines. Recommandé uniquement pour l'environnement de staging.
          </p>
          
          {error && <p className="mt-4 text-[9px] font-bold text-red-500 bg-red-500/10 px-3 py-2 rounded-sm inline-block border border-red-500/20 uppercase tracking-widest">{error}</p>}
          {success && <p className="mt-4 text-[9px] font-bold text-asas-emerald bg-asas-emerald/10 px-3 py-2 rounded-sm inline-flex items-center gap-2 border border-asas-emerald/20 uppercase tracking-widest"><CheckCircle className="w-3 h-3"/> Environnement provisionné avec succès !</p>}
        </div>
        
        <div className="shrink-0">
          <button
            onClick={handleSeed}
            disabled={loading || success}
            className={clsx(
              "flex items-center gap-2 px-6 py-4 rounded-sm text-[9px] uppercase tracking-widest font-bold shadow-sm transition-all w-full md:w-auto justify-center cursor-pointer",
              success 
                ? "bg-asas-emerald/10 text-asas-emerald border border-asas-emerald/20"
                : "bg-white dark:bg-[#141618] border border-asas-silver/20 hover:bg-asas-sand/50 dark:hover:bg-black/10 text-asas-charcoal dark:text-asas-sand hover:text-asas-gold"
            )}
          >
            {loading ? (
              <><RefreshCcw className="w-4 h-4 animate-spin" /> Provisionnement...</>
            ) : success ? (
              <><CheckCircle className="w-4 h-4" /> Terminé</>
            ) : (
              <><Database className="w-4 h-4" /> Injecter Données de Test</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
