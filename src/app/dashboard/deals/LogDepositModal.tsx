'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { X, Camera, DollarSign, CloudUpload, ShieldCheck } from 'lucide-react'
import { clsx } from 'clsx'

export function LogDepositModal({ dealId, onClose, onSuccess }: { dealId: string, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hasPhoto, setHasPhoto] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (!hasPhoto) throw new Error('Vous devez prendre une photo du reçu ou des espèces en garantie.')
      
      const numAmount = Number(amount)
      if (isNaN(numAmount) || numAmount <= 0) throw new Error('Montant invalide')

      const { v4: uuidv4 } = await import('uuid');
      const res = await fetch('/api/command-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId: uuidv4(),
          aggregateId: dealId,
          type: 'LOG_DEPOSIT',
          expectedVersion: 1, // Payment appends don't typically break version, 
          payload: { amount: numAmount, method: 'cash_avance', notes: 'Avance consignée via mobile, attente de vérification Manager' }
        })
      })
      
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erreur')
      }
      
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const simulatePhoto = () => {
    // Simulate opening camera / file picker
    setLoading(true)
    setTimeout(() => {
      setHasPhoto(true)
      setLoading(false)
    }, 1500)
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
        
        <div className="w-12 h-12 bg-emerald-500/10 rounded-sm flex items-center justify-center mb-4 text-emerald-500 border border-emerald-500/20">
          <DollarSign className="w-6 h-6" />
        </div>
        
        <h2 className="text-xl font-bold text-asas-charcoal dark:text-asas-sand mb-2 leading-tight">Consigner une Avance (Arrhes)</h2>
        <p className="text-sm text-gray-500 font-medium mb-6">
          Saisissez le montant en DZD et attachez une preuve photographique (Reçu manuscrit ou espèces). Le manager recevra une alerte immédiate.
        </p>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold rounded-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Montant DZD</label>
             <input 
               type="number" required placeholder="Ex: 500000"
               className="w-full px-4 py-3 bg-white dark:bg-[#141618] border border-black/10 dark:border-white/10 rounded-xl text-lg font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
               value={amount} onChange={e => setAmount(e.target.value)}
             />
          </div>

          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Preuve / Reçu</label>
             <button
               type="button"
               disabled={loading || hasPhoto}
               onClick={simulatePhoto}
               className={clsx(
                 "w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
                 hasPhoto 
                   ? "bg-emerald-500/5 py-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                   : "border-black/10 dark:border-white/10 bg-asas-sand/30 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500"
               )}
             >
               {hasPhoto ? (
                 <>
                   <ShieldCheck className="w-10 h-10 text-emerald-500" />
                   <span className="text-sm font-bold">Image Sécurisée Attachée</span>
                 </>
               ) : (
                 <>
                   <Camera className={clsx("w-8 h-8", loading && "animate-pulse")} />
                   <span className="text-sm font-bold">{loading ? "Ouverture Caméra..." : "Prendre une photo"}</span>
                 </>
               )}
             </button>
          </div>

          <button
            type="submit"
            disabled={loading || !hasPhoto || !amount}
            className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <CloudUpload className="w-5 h-5" /> Soumettre au Manager
          </button>
        </form>
      </motion.div>
    </div>
  )
}
