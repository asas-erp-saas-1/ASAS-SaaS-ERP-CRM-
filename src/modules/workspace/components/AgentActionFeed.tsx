'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Phone, MessageCircle, Mail, MapPin, CheckCircle2, AlertTriangle, Clock, Building, Plus, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'

export function AgentActionFeed({ actions = [] }: { actions?: any[] }) {
  const [items, setItems] = useState(actions.length > 0 ? actions : [])
  const [phoneInput, setPhoneInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleComplete = async (id: string) => {
    setItems(items.filter(item => item.id !== id))
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'done', done_at: new Date().toISOString() })
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/\+/g, '')}`, '_blank')
  }

  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneInput.trim()) return
    
    setIsSubmitting(true)
    try {
      // 1. Create client
      const resClient = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: 'Contact Rapide',
          phone: phoneInput.trim(),
          type: 'buyer',
        })
      });
      if (!resClient.ok) throw new Error('Echec client')
      const client = await resClient.json()

      // 2. Create lead
      const resLead = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.data.id,
          source: 'phone',
        })
      });
      if (!resLead.ok) throw new Error('Echec lead')
      
      setPhoneInput('')
      const lead = await resLead.json()
      // Directly route to new lead to complete details
      router.push(`/dashboard/leads?new=${lead.data?.id}`)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      
      {/* Quick Mobile Capture */}
      <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-asas-gold"></div>
        <p className="text-[10px] uppercase font-bold tracking-widest text-asas-silver mb-3">Capture Rapide (Terrain)</p>
        <form onSubmit={handleQuickCapture} className="flex flex-col sm:flex-row gap-3">
           <div className="relative flex-1">
             <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-asas-silver" />
             <input 
               type="tel"
               placeholder="Numéro de téléphone..."
               value={phoneInput}
               onChange={e => setPhoneInput(e.target.value)}
               disabled={isSubmitting}
               className="w-full pl-10 pr-4 py-3 bg-asas-sand/50 dark:bg-black/10 border border-asas-silver/30 rounded-sm text-sm font-mono focus:outline-none focus:border-asas-gold text-asas-charcoal dark:text-asas-sand transition-colors"
             />
           </div>
           <button 
             type="submit"
             disabled={isSubmitting || !phoneInput.trim()}
             className="flex items-center justify-center gap-2 px-6 py-3 bg-asas-navy text-asas-sand hover:bg-asas-charcoal dark:hover:bg-black rounded-sm text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
           >
             {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 text-asas-gold" />}
             INJECTER
           </button>
        </form>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest font-display">
            Flux d'Exécution <span className="opacity-40 text-asas-silver mx-1 font-sans">|</span> <span className="opacity-50">مهام التنفيذ</span>
            <span className="ml-2 text-asas-gold">({items.length})</span>
          </h2>
        </div>
      </div>
      
      <AnimatePresence>
        {items.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center bg-white dark:bg-[#141618] rounded-sm border border-asas-silver/20">
            <CheckCircle2 className="w-12 h-12 mx-auto text-asas-emerald mb-4 opacity-50" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-asas-silver">Toutes les actions sont terminées. Excellent travail.</p>
          </motion.div>
        )}
        
        {items.map((item, idx) => (
          <motion.div 
            key={item.id} 
            layout 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, x: -100 }}
            className="group relative bg-white dark:bg-[#141618] border border-asas-silver/20 p-5 rounded-sm shadow-sm hover:border-asas-gold/30 transition-all flex flex-col gap-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3">
                <div className={clsx("w-10 h-10 rounded-sm flex items-center justify-center shrink-0 border", 
                  item.type === 'urgent' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                  item.type === 'whatsapp' ? 'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20' :
                  item.type === 'match' ? 'bg-asas-navy/10 text-asas-navy dark:text-asas-sand border-asas-navy/20' :
                  item.type === 'viewing' ? 'bg-asas-copper/10 text-asas-copper border-asas-copper/20' :
                  'bg-asas-gold/10 text-asas-gold border-asas-gold/20'
                )}>
                  {item.type === 'urgent' && <AlertTriangle className="w-5 h-5" />}
                  {item.type === 'whatsapp' && <MessageCircle className="w-5 h-5" />}
                  {item.type === 'viewing' && <MapPin className="w-5 h-5" />}
                  {item.type === 'match' && <Building className="w-5 h-5" />}
                  {item.type !== 'urgent' && item.type !== 'whatsapp' && item.type !== 'viewing' && item.type !== 'match' && <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-[12px] font-bold uppercase tracking-widest text-asas-charcoal dark:text-asas-sand leading-tight">{item.task}</h3>
                  <p className="text-sm font-medium text-asas-silver mt-1">{item.leadName}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={clsx("text-[9px] font-bold px-2 py-1.5 rounded-sm tracking-widest uppercase border", 
                  item.type === 'urgent' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-black/5 dark:bg-white/5 text-asas-silver border-asas-silver/20'
                )}>
                  {item.time}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 pt-3 border-t border-asas-silver/10 mt-2">
              <button 
                onClick={() => handleWhatsApp(item.phone)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/20 text-[#25D366] rounded-sm text-[10px] uppercase font-bold tracking-widest transition-colors active:scale-95"
              >
                <MessageCircle className="w-4 h-4" /> Message
              </button>
              <button 
                onClick={() => window.open(`tel:${item.phone}`)}
                className="flex-[0.5] flex items-center justify-center gap-2 py-3 bg-black/5 border border-asas-silver/20 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-asas-charcoal dark:text-asas-sand rounded-sm transition-colors active:scale-95"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleComplete(item.id)}
                className="flex-1 px-4 py-3 bg-asas-charcoal hover:bg-black dark:bg-asas-sand dark:hover:bg-white text-asas-sand dark:text-asas-charcoal rounded-sm text-[10px] uppercase font-bold tracking-widest shadow-sm transition-all active:scale-95 whitespace-nowrap border border-transparent"
              >
                Terminer
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

