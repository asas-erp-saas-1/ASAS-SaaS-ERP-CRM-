'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Mic, Camera, Save, MapPin } from 'lucide-react'

interface PropertyCreateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function PropertyCreateModal({ onClose, onSuccess }: PropertyCreateModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    type: 'f3',
    price: '',
    location: '',
  })
  const [isRecording, setIsRecording] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Create project/location dummy if not exists - simplificado
      const projRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.location || 'Nouveau Bien', city: formData.location })
      })
      let projectId = ''
      if (projRes.ok) {
        const pd = await projRes.json()
        projectId = pd.data?.id
      }
      
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId, // Would normally select an existing
          type: formData.type,
          list_price: Number(formData.price) || 0,
          status: 'available',
        })
      })

      if (!res.ok) throw new Error('Echec')
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const simulateVoiceNote = () => {
    setIsRecording(!isRecording)
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false)
        setFormData({ type: 'f4', price: '45000000', location: 'Cheraga' })
      }, 3000)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-[#141618] rounded-[2rem] shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-asas-silver/20 bg-white dark:bg-[#141618]">
          <h2 className="text-sm font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest flex items-center gap-2">
            Acquisition Fluide (1-Minute)
          </h2>
          <button onClick={onClose} className="p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors text-asas-silver">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-4 mb-8">
             <button 
                type="button"
                onClick={simulateVoiceNote} 
                className={`flex-1 overflow-hidden relative p-8 rounded-sm flex flex-col items-center justify-center gap-3 transition-all ${isRecording ? 'bg-red-500/10 border border-red-500 shadow-sm' : 'bg-asas-sand/30 dark:bg-[#141618] hover:bg-asas-sand/50 dark:hover:bg-white/5 border border-asas-silver/20'}`}
             >
                {isRecording && <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500 text-white' : 'bg-white dark:bg-white/5 text-asas-silver border border-asas-silver/20'}`}>
                   <Mic className={`w-6 h-6 ${isRecording ? 'animate-bounce' : ''}`} />
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand">{isRecording ? 'Écoute...' : 'Note Vocale (IA)'}</p>
                  <p className="text-[9px] font-medium text-asas-silver mt-1">Ex: "F4 à Cheraga..."</p>
                </div>
             </button>
             
             <button type="button" className="flex-1 p-8 rounded-sm border border-asas-silver/20 flex flex-col items-center justify-center gap-3 bg-asas-sand/30 dark:bg-[#141618] hover:bg-asas-sand/50 dark:hover:bg-white/5 transition-all">
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white dark:bg-white/5 text-asas-silver border border-asas-silver/20">
                   <Camera className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand">Photos Express</p>
                  <p className="text-[9px] font-medium text-asas-silver mt-1 border border-transparent">Saisie Automatique</p>
                </div>
             </button>
          </div>

          <form id="prop-form" onSubmit={handleSubmit} className="space-y-4">
             {error && <div className="p-4 bg-red-500/10 text-red-500 text-sm font-bold rounded-sm border border-red-500/20">{error}</div>}

             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-asas-silver uppercase tracking-widest mb-1.5">Gabarit</label>
                   <select 
                     className="w-full px-4 py-3 bg-asas-sand/30 dark:bg-[#111111] border border-asas-silver/20 rounded-sm text-sm font-medium text-asas-charcoal dark:text-white focus:outline-none focus:ring-1 focus:ring-asas-gold focus:border-asas-gold"
                     value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                   >
                     <option value="f2">F2</option>
                     <option value="f3">F3</option>
                     <option value="f4">F4</option>
                     <option value="villa">Villa</option>
                     <option value="land">Terrain</option>
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-asas-silver uppercase tracking-widest mb-1.5">Prix (DZD)</label>
                   <input 
                     type="number" required placeholder="45000000"
                     className="w-full px-4 py-3 bg-asas-sand/30 dark:bg-[#111111] border border-asas-silver/20 rounded-sm text-sm font-mono font-bold text-asas-charcoal dark:text-white focus:outline-none focus:ring-1 focus:ring-asas-gold focus:border-asas-gold"
                     value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
                   />
                </div>
             </div>
             
             <div>
                <label className="block text-xs font-bold text-asas-silver uppercase tracking-widest mb-1.5">Secteur Géo</label>
                <div className="relative">
                   <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-asas-silver" />
                   <input 
                     type="text" required placeholder="Ex: HYDRA, CHERAGA"
                     className="w-full pl-10 pr-4 py-3 bg-asas-sand/30 dark:bg-[#111111] border border-asas-silver/20 rounded-sm text-sm font-medium text-asas-charcoal dark:text-white focus:outline-none focus:ring-1 focus:ring-asas-gold focus:border-asas-gold"
                     value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                   />
                </div>
             </div>
          </form>
        </div>

        <div className="border-t border-asas-silver/20 p-6 bg-asas-sand/30 dark:bg-[#0A0A0A] flex justify-end gap-3 rounded-b-[2rem]">
          <button
            type="button" onClick={onClose}
            className="px-6 py-3 rounded-sm border border-asas-silver/20 text-[10px] uppercase tracking-widest font-bold text-asas-charcoal dark:text-asas-silver bg-white dark:bg-[#141618] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Annuler
          </button>
          <button
            form="prop-form" type="submit" disabled={loading}
            className="px-8 py-3 rounded-sm text-[10px] uppercase tracking-widest font-bold text-asas-sand bg-asas-navy hover:bg-asas-charcoal dark:hover:bg-black disabled:opacity-50 transition-colors shadow-sm active:scale-95 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {loading ? 'Création...' : 'Publier Actif'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
