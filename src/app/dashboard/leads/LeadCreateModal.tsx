// src/app/dashboard/leads/LeadCreateModal.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Save, User, MapPin } from 'lucide-react'

interface LeadCreateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function LeadCreateModal({ onClose, onSuccess }: LeadCreateModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    clientName: '',
    phone: '',
    source: 'other',
    budgetMin: '',
    budgetMax: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. We first create the client
      const resClient = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.clientName,
          phone: formData.phone,
          type: 'buyer',
        })
      });
      if (!resClient.ok) throw new Error('Echec de la création du client');
      const client = await resClient.json();

      // 2. We create the lead associated with the client
      const resLead = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.data.id,
          source: formData.source,
          budget_min: formData.budgetMin ? parseInt(formData.budgetMin) : null,
          budget_max: formData.budgetMax ? parseInt(formData.budgetMax) : null,
        })
      });

      if (!resLead.ok) throw new Error('Echec de la création du lead');
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
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
        className="relative w-full max-w-lg bg-white dark:bg-[#141618] rounded-sm shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-black/10 dark:border-white/10 overflow-hidden flex flex-col max-h-full"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-asas-silver/20 bg-white dark:bg-[#141618]">
          <h2 className="text-sm font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest flex items-center gap-2">
            <User className="w-4 h-4 text-asas-navy dark:text-asas-sand" /> Nouvelle Entité (Lead)
          </h2>
          <button onClick={onClose} className="p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors text-asas-silver">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium rounded-sm">
              {error}
            </div>
          )}

          <form id="lead-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Informations Profil</label>
              <div className="space-y-4">
                <input
                  type="text"
                  required
                  placeholder="Nom complet du prospect"
                  className="w-full px-4 py-3 bg-asas-sand/30 dark:bg-[#141618] border border-black/10 dark:border-white/10 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:border-asas-gold focus:ring-1 focus:ring-asas-gold focus:border-asas-gold transition-all placeholder:text-gray-500"
                  value={formData.clientName}
                  onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                />
                <input
                  type="tel"
                  placeholder="Téléphone (WhatsApp)"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-500 font-mono tracking-wide"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Acquisition</label>
              <select
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                value={formData.source}
                onChange={e => setFormData({ ...formData, source: e.target.value })}
              >
                <option value="facebook">Campagne Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="whatsapp">Contact WhatsApp</option>
                <option value="referral">Recommandation</option>
                <option value="website">Site Web</option>
                <option value="phone">Appel Entrant</option>
                <option value="walk_in">Visite Spontanée</option>
                <option value="other">Autre / Inconnu</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Projection Financière (DZD)</label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Budget Min"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-500 placeholder:font-normal font-mono"
                  value={formData.budgetMin}
                  onChange={e => setFormData({ ...formData, budgetMin: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Budget Max"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-500 placeholder:font-normal font-mono"
                  value={formData.budgetMax}
                  onChange={e => setFormData({ ...formData, budgetMax: e.target.value })}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="border-t border-black/5 dark:border-white/5 p-6 bg-gray-50 dark:bg-[#0A0A0A] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-sm font-bold text-asas-charcoal/80 dark:text-asas-silver bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            Annuler
          </button>
          <button
            form="lead-form"
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-asas-navy hover:bg-asas-charcoal dark:hover:bg-black disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Création...' : 'Créer & Capturer'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
