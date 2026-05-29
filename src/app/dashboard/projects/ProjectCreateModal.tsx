'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { X, Building2, MapPin, Loader2 } from 'lucide-react'

export function ProjectCreateModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    status: 'active',
    launch_date: '',
    completion_date: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erreur lors de la création')
      }
      onSuccess()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-white dark:bg-[#141618] rounded-[2rem] shadow-2xl border border-black/10 dark:border-white/10 p-8 flex flex-col max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors bg-asas-sand/50 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full">
          <X className="w-4 h-4" />
        </button>
        
        <div className="w-12 h-12 bg-blue-500/10 rounded-sm flex items-center justify-center mb-6">
          <Building2 className="w-6 h-6 text-asas-navy dark:text-asas-sand" />
        </div>
        
        <h2 className="text-2xl font-black text-asas-charcoal dark:text-asas-sand mb-2 leading-tight">Nouveau Programme Immobilier</h2>
        <p className="text-sm text-asas-silver font-medium mb-8">
          Structurez votre opération (Vente sur plan, lots, échéanciers).
        </p>

        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold rounded-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nom du Programme</label>
              <input required type="text"
                className="w-full px-4 py-3 bg-white dark:bg-[#141618] border border-black/10 dark:border-white/10 rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-asas-gold focus:border-asas-gold"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Résidence Les Jasmins" 
              />
           </div>

           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Ville / Emplacement</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text"
                  className="w-full pl-10 pr-4 py-3 bg-asas-sand/30 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}
                  placeholder="Ex: Cheraga, Alger" 
                />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Lancement Commercial</label>
                  <input type="date"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={formData.launch_date} onChange={e => setFormData({...formData, launch_date: e.target.value})}
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Date de Livraison</label>
                  <input type="date"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={formData.completion_date} onChange={e => setFormData({...formData, completion_date: e.target.value})}
                  />
               </div>
           </div>

           <div className="pt-4 mt-8 border-t border-asas-silver/20">
              <button disabled={loading} type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-asas-navy hover:bg-asas-charcoal dark:hover:bg-black text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50">
                 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer le Programme"}
              </button>
           </div>
        </form>
      </motion.div>
    </div>
  )
}
