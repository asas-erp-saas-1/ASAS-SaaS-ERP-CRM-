'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { X, Calendar as CalendarIcon, FilePenLine, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'

export function SchedulePaymentModal({ dealId, onClose, onSuccess }: { dealId: string, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const numAmount = Number(amount)
      if (isNaN(numAmount) || numAmount <= 0) throw new Error('Montant invalide')
      if (!dueDate) throw new Error('Date d\'échéance requise')

      const { v4: uuidv4 } = await import('uuid');
      const res = await fetch('/api/command-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId: uuidv4(),
          aggregateId: dealId,
          type: 'SCHEDULE_PAYMENT',
          expectedVersion: 1, 
          payload: { dealId, amount: numAmount, due_date: dueDate, notes }
        })
      })
      
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erreur technique')
      }
      
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
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
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white dark:bg-[#141618] rounded-[2rem] shadow-2xl border border-black/10 dark:border-white/10 p-6 flex flex-col"
      >
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-2 text-asas-silver hover:text-gray-900 dark:hover:text-white transition-colors bg-asas-sand/50 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full">
          <X className="w-4 h-4" />
        </button>
        
        <div className="w-12 h-12 bg-blue-500/10 rounded-sm flex items-center justify-center mb-4 text-asas-navy dark:text-asas-sand border border-blue-500/20">
          <CalendarIcon className="w-6 h-6" />
        </div>
        
        <h2 className="text-xl font-bold text-asas-charcoal dark:text-asas-sand mb-2 leading-tight">Programmer une Échéance</h2>
        <p className="text-sm text-gray-500 font-medium mb-6">
          Ajoutez un appel de fonds ou une tranche à l'échéancier de cette transaction. Le paiement apparaîtra en attente (Pending).
        </p>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold rounded-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Montant DZD</label>
             <input 
               type="number" required placeholder="Ex: 1500000"
               className="w-full px-4 py-3 bg-white dark:bg-[#141618] border border-black/10 dark:border-white/10 rounded-xl text-lg font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-asas-gold focus:border-asas-gold"
               value={amount} onChange={e => setAmount(e.target.value)}
             />
          </div>

          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Date d'Échéance (Limit deadline)</label>
             <input 
               type="date" required 
               className="w-full px-4 py-3 bg-asas-sand/30 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
               value={dueDate} onChange={e => setDueDate(e.target.value)}
             />
          </div>

          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Intitulé / Notes</label>
             <input 
               type="text" required placeholder="Ex: Tranche 2 - Coulage Dalle"
               className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-xl font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
               value={notes} onChange={e => setNotes(e.target.value)}
             />
          </div>

          <button
            type="submit"
            disabled={loading || !amount || !dueDate || !notes}
            className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold text-white bg-asas-navy hover:bg-asas-charcoal dark:hover:bg-black disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            {loading ? 'Création...' : <><CheckCircle2 className="w-5 h-5" /> Valider l'Échéance</>}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
