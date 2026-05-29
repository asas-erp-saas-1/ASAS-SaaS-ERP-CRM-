'use client'

import React, { useState, useEffect } from 'react'
import { X, Calendar, Flag, User, Loader2, Link as LinkIcon } from 'lucide-react'
import { createTaskAction } from '@/actions/taskActions'

interface CreateTaskModalProps {
  leadId?: string | null
  dealId?: string | null
  onClose: () => void
  onSuccess?: () => void
}

export function CreateTaskModal({ leadId, dealId, onClose, onSuccess }: CreateTaskModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [leads, setLeads] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    lead_id: leadId || '',
    deal_id: dealId || '',
    assigned_to: '' // Optionally allow assigning to specific agent if we had the list
  })

  useEffect(() => {
    async function loadOptions() {
      try {
        const [leadsRes, dealsRes] = await Promise.all([
          fetch('/api/leads'),
          fetch('/api/deals')
        ])
        if (leadsRes.ok) {
          const leadsData = await leadsRes.json()
          setLeads(leadsData.data || leadsData)
        }
        if (dealsRes.ok) {
          const dealsData = await dealsRes.json()
          setDeals(dealsData.data || dealsData)
        }
      } catch (err) {
        console.error('Failed to load associations:', err)
      } finally {
        setLoadingOptions(false)
      }
    }
    loadOptions()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const result = await createTaskAction({
        title: formData.title,
        description: formData.description,
        priority: formData.priority as any,
        due_date: formData.due_date || null,
        lead_id: formData.lead_id || null,
        deal_id: formData.deal_id || null,
        // Since we don't have assigned_to from a dropdown here easily, we rely on createTaskAction to assign it to the current user or handle it.
      })
      
      if (result?.error) {
        setError(result.error)
      } else {
        onSuccess?.()
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm shadow-sm flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-asas-silver/20 bg-asas-sand/50 dark:bg-black/10">
          <h2 className="text-xl font-bold text-asas-charcoal dark:text-asas-sand font-display uppercase tracking-widest">Nouvelle Tâche</h2>
          <button 
            onClick={onClose}
            className="p-2 text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand hover:bg-asas-sand/50 dark:hover:bg-white/5 rounded-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-sm text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-[9px] uppercase font-bold tracking-widest text-asas-silver mb-2">Titre *</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-3 bg-transparent border border-asas-silver/40 rounded-sm text-asas-charcoal dark:text-asas-sand placeholder-asas-silver focus:outline-none focus:border-asas-gold transition-colors font-mono text-sm"
              placeholder="Ex: Appeler pour relance..."
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase font-bold tracking-widest text-asas-silver mb-2">Description</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 bg-transparent border border-asas-silver/40 rounded-sm text-asas-charcoal dark:text-asas-sand placeholder-asas-silver focus:outline-none focus:border-asas-gold transition-colors font-mono text-sm resize-none"
              placeholder="Détails de la tâche..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] uppercase font-bold tracking-widest text-asas-silver mb-2 flex items-center gap-2">
                <Flag className="w-3 h-3" /> Priorité
              </label>
              <select 
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value})}
                className="w-full px-4 py-3 bg-white dark:bg-[#141618] border border-asas-silver/40 rounded-sm text-asas-charcoal dark:text-asas-sand focus:outline-none focus:border-asas-gold transition-colors font-mono text-sm appearance-none"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[9px] uppercase font-bold tracking-widest text-asas-silver mb-2 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Échéance
              </label>
              <input 
                type="date"
                value={formData.due_date}
                onChange={e => setFormData({...formData, due_date: e.target.value})}
                className="w-full px-4 py-3 bg-transparent border border-asas-silver/40 rounded-sm text-asas-charcoal dark:text-asas-sand focus:outline-none focus:border-asas-gold transition-colors font-mono text-sm [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] uppercase font-bold tracking-widest text-asas-silver mb-2 flex items-center gap-2">
                <LinkIcon className="w-3 h-3" /> Relier au Lead
              </label>
              <select 
                value={formData.lead_id}
                onChange={e => setFormData({...formData, lead_id: e.target.value})}
                disabled={loadingOptions || leads.length === 0}
                className="w-full px-4 py-3 bg-white dark:bg-[#141618] border border-asas-silver/40 rounded-sm text-asas-charcoal dark:text-asas-sand focus:outline-none focus:border-asas-gold transition-colors font-mono text-sm appearance-none disabled:opacity-50"
              >
                <option value="">Aucun lead</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.full_name || l.name || 'Lead Inconnu'}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-[9px] uppercase font-bold tracking-widest text-asas-silver mb-2 flex items-center gap-2">
                <LinkIcon className="w-3 h-3" /> Relier au Deal
              </label>
              <select 
                value={formData.deal_id}
                onChange={e => setFormData({...formData, deal_id: e.target.value})}
                disabled={loadingOptions || deals.length === 0}
                className="w-full px-4 py-3 bg-white dark:bg-[#141618] border border-asas-silver/40 rounded-sm text-asas-charcoal dark:text-asas-sand focus:outline-none focus:border-asas-gold transition-colors font-mono text-sm appearance-none disabled:opacity-50"
              >
                <option value="">Aucun deal</option>
                {deals.map(d => (
                  <option key={d.id} value={d.id}>Deal: {d.clients?.full_name || d.id.slice(0, 8)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-asas-silver/20 flex gap-3 justify-end items-center bg-asas-sand/30 dark:bg-black/10 p-4 -mx-6 -mb-6 mt-2 rounded-b-sm">
            <button 
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-sm border border-asas-silver/20 text-asas-charcoal dark:text-asas-sand text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-sm bg-asas-charcoal dark:bg-asas-sand text-asas-sand dark:text-asas-charcoal text-xs font-bold transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Création...' : 'Créer Tâche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
