'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Wrench, CheckCircle2, MessageCircle, FileText, Plus, Loader2 } from 'lucide-react'
import type { Deal, Task } from '@/types/app'
import { ErrorTracker } from '@/lib/observability/errors'
import { jsPDF } from 'jspdf'
import { WhatsAppDrawer } from '@/components/WhatsAppDrawer'

export function SAVPanelModal({ deal, onClose, onUpdate }: { deal: Deal, onClose: () => void, onUpdate: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false)

  const loadTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?deal_id=${deal.id}`)
      if (res.ok) {
        const data = await res.json()
        // Filter tasks that are SAV related. Let's just show all tasks for a closed deal here 
        // as they are typically SAV tasks.
        setTasks(data.data || [])
      }
    } catch (err) {
      ErrorTracker.captureError(err, { context: 'Load SAV tasks' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    setIsAdding(true)
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[SAV] ${newTaskTitle}`,
          deal_id: deal.id,
          priority: 'high',
          status: 'pending'
        })
      })
      setNewTaskTitle('')
      loadTasks()
    } finally {
      setIsAdding(false)
    }
  }

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done'
    // Optimistic update
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: newStatus })
      })
    } catch (error) {
       loadTasks() // Revert
    }
  }

  const generatePV = () => {
    const doc = new jsPDF()
    const clientName = deal.clients?.full_name || 'Client Inconnu'
    const propertyRef = deal.properties?.reference_code || 'N/A'
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("PROCES-VERBAL DE REMISE DES CLES", 105, 20, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.text(`Date : ${new Date().toLocaleDateString()}`, 20, 40)
    doc.text(`Acquéreur : ${clientName}`, 20, 50)
    doc.text(`Référence Lot : ${propertyRef}`, 20, 60)

    doc.setFont("helvetica", "bold")
    doc.text("RESERVES SOUMISES PAR L'ACQUEREUR :", 20, 80)
    
    doc.setFont("helvetica", "normal")
    let y = 90
    const savTasks = tasks.filter(t => t.title.includes('[SAV]'))
    
    if (savTasks.length === 0) {
       doc.text("Aucune réserve signalée. Réception sans réserve.", 25, y)
    } else {
       savTasks.forEach((t, i) => {
          doc.text(`${i + 1}. ${t.title.replace('[SAV] ', '')} - Statut: ${t.status === 'done' ? 'Levée' : 'En attente'}`, 25, y)
          y += 10
       })
    }

    y += 30
    doc.setFont("helvetica", "bold")
    doc.text("Signatures :", 20, y)
    doc.text("Le Promoteur", 40, y + 15)
    doc.text("L'Acquéreur", 130, y + 15)

    doc.save(`PV_Livraison_${propertyRef}.pdf`)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl bg-white dark:bg-[#141618] rounded-sm shadow-2xl border border-asas-silver/20 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-asas-silver/20 flex items-center justify-between bg-asas-sand/50 dark:bg-black/10 shrink-0">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-asas-gold bg-asas-gold/10 px-2 py-1 rounded-sm mb-2 inline-block border border-asas-gold/20">
              Gestion SAV
            </span>
            <h2 className="text-xl font-bold text-asas-charcoal dark:text-asas-sand flex items-center gap-2 font-display uppercase tracking-widest">
              Lot {deal.properties?.reference_code}
            </h2>
            <p className="text-[9px] font-bold text-asas-silver mt-1 uppercase tracking-widest">Acquéreur: {deal.clients?.full_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand transition-colors bg-white dark:bg-[#141618] border border-asas-silver/20 hover:bg-asas-sand/50 dark:hover:bg-black/10 rounded-sm cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
           
           {/* Actions */}
           <div className="flex items-center gap-3">
             <button onClick={generatePV} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-asas-charcoal dark:bg-asas-sand text-asas-sand dark:text-asas-charcoal hover:bg-asas-charcoal/80 dark:hover:bg-asas-sand/80 border border-transparent rounded-sm font-bold text-[9px] uppercase tracking-widest transition-colors active:scale-95 cursor-pointer">
                <FileText className="w-4 h-4" /> PV Livr. (PDF)
             </button>
             <button onClick={() => setIsWhatsAppOpen(true)} className="flex items-center justify-center px-4 py-3 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-sm font-bold text-[9px] uppercase tracking-widest transition-colors active:scale-95 cursor-pointer" title="Contacter sur WhatsApp">
                <MessageCircle className="w-4 h-4" /> WhatsApp
             </button>
           </div>

           {/* Réserves / Snags List */}
           <div>
              <h3 className="text-sm font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest flex items-center gap-2 mb-4 font-display">
                 <Wrench className="w-4 h-4 text-asas-gold" /> Réserves & Interventions
              </h3>

              <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
                <input 
                  type="text"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="Ex: Peinture écaillée au salon..."
                  className="flex-1 bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm px-4 py-3 text-[10px] uppercase font-bold tracking-widest focus:outline-none focus:border-asas-gold"
                />
                <button disabled={!newTaskTitle.trim() || isAdding} type="submit" className="w-12 shrink-0 bg-asas-gold hover:bg-asas-gold/80 disabled:opacity-50 text-white rounded-sm flex items-center justify-center transition-colors cursor-pointer">
                  {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </form>

              {loading ? (
                <div className="py-10 text-center flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-asas-silver" /></div>
              ) : tasks.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-asas-silver/20 rounded-sm">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-asas-silver">Aucune réserve signalée.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div key={task.id} className={`flex items-start gap-4 p-4 rounded-sm border transition-colors ${task.status === 'done' ? 'bg-asas-emerald/10 border-asas-emerald/20' : 'bg-white dark:bg-[#141618] border-asas-silver/20'}`}>
                       <button onClick={() => toggleTaskStatus(task)} className="mt-0.5 shrink-0 cursor-pointer">
                         {task.status === 'done' ? (
                           <CheckCircle2 className="w-4 h-4 text-asas-emerald" />
                         ) : (
                           <div className="w-4 h-4 rounded-sm border border-asas-silver/40" />
                         )}
                       </button>
                       <div className="min-w-0">
                         <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${task.status === 'done' ? 'text-asas-silver line-through' : 'text-asas-charcoal dark:text-asas-sand'}`}>
                           {task.title.replace('[SAV] ', '')}
                         </p>
                         <p className="text-[9px] font-bold text-asas-silver mt-1 uppercase tracking-widest">
                           {task.status === 'done' ? 'Levée' : 'Signalée'}
                         </p>
                       </div>
                    </div>
                  ))}
                </div>
              )}
           </div>

        </div>
      </motion.div>

      <WhatsAppDrawer 
        isOpen={isWhatsAppOpen} 
        onClose={() => setIsWhatsAppOpen(false)}
        clientName={deal.clients?.full_name || 'Client Inconnu'}
        clientPhone={deal.clients?.phone || ''}
        contextType="sav"
        propertyName={(deal.properties?.projects?.name || deal.properties?.reference_code) || ''}
      />
    </div>
  )
}
