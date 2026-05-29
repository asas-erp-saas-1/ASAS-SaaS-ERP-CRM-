'use client'

import { useState } from 'react'
import { Plus, X, User } from 'lucide-react'

export function ClientCreateModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const payload = {
      full_name: formData.get('full_name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      type: formData.get('type'),
      source: formData.get('source'),
      nationality: formData.get('nationality')
    }

    try {
      const res = await fetch('/api/command-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId: crypto.randomUUID(),
          aggregateId: crypto.randomUUID(),
          type: 'CREATE_CLIENT',
          expectedVersion: 1,
          payload
        })
      })

      if (res.ok) {
        onSuccess()
      } else {
        throw new Error('Create failed')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#141618] w-full max-w-lg rounded-sm shadow-2xl overflow-hidden border border-asas-silver/20 relative flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5 bg-white dark:bg-[#141618]">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-blue-500/10 text-asas-navy dark:text-asas-sand flex items-center justify-center">
                 <User className="h-5 w-5" />
              </div>
              <div>
                 <h2 className="text-xl font-extrabold text-asas-charcoal dark:text-asas-sand">Nouveau Profil Client</h2>
                 <p className="text-[10px] uppercase tracking-widest font-bold text-asas-silver mt-1">Enregistrement dans le CRM</p>
              </div>
           </div>
           <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              <X className="w-4 h-4" />
           </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar p-6">
          <form id="create-client-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-widest">Nom Complet *</label>
              <input type="text" name="full_name" required className="w-full bg-asas-sand/30 dark:bg-[#141618] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-asas-gold focus:border-asas-gold font-bold" placeholder="Ex: Jean Dupont" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-widest">Téléphone</label>
                  <input type="tel" name="phone" className="w-full bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="+213 555 000 000" />
               </div>
               <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-widest">Email</label>
                  <input type="email" name="email" className="w-full bg-gray-50 dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="contact@email.com" />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-widest">Type</label>
                  <select name="type" className="w-full bg-gray-50 dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none">
                     <option value="buyer">Acheteur</option>
                     <option value="seller">Vendeur</option>
                     <option value="investor">Investisseur</option>
                     <option value="tenant">Locataire</option>
                  </select>
               </div>
               <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-widest">Nationalité</label>
                  <input type="text" name="nationality" defaultValue="Algérienne" className="w-full bg-gray-50 dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
               </div>
            </div>

            <div>
               <label className="block text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-widest">Source</label>
               <select name="source" className="w-full bg-gray-50 dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none">
                     <option value="facebook">Facebook Ads</option>
                     <option value="website">Site Web</option>
                     <option value="referral">Recommandation</option>
                     <option value="agency">Passage en Agence</option>
                     <option value="other">Autre</option>
               </select>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-black/5 dark:border-white/5 bg-gray-50 dark:bg-[#050505] flex justify-end gap-3 shrink-0">
           <button onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-xl font-bold text-sm text-asas-charcoal/80 dark:text-asas-silver hover:bg-gray-200 dark:hover:bg-[#1A1A1A] transition-colors disabled:opacity-50">
             Annuler
           </button>
           <button form="create-client-form" type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-asas-navy hover:bg-asas-charcoal dark:hover:bg-black text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50">
             <Plus className="w-4 h-4" /> {loading ? 'Création...' : 'Créer Profil'}
           </button>
        </div>
      </div>
    </div>
  )
}
