// src/app/dashboard/tasks/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckSquare, Clock, AlertTriangle, Check, Zap, ListTodo, AlertOctagon, ArrowUp, ArrowRight, ArrowDown, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { clsx } from 'clsx'
import { CreateTaskModal } from './CreateTaskModal'

interface Task {
  id:          string
  title:       string
  description: string | null
  priority:    'low' | 'medium' | 'high' | 'urgent'
  status:      'pending' | 'in_progress' | 'done' | 'cancelled'
  due_date:    string | null
  is_automated: boolean
  deal_id:     string | null
  lead_id:     string | null
  done_at:     string | null
  created_at:  string
}

const PRIORITY_STYLE: Record<string, string> = {
  urgent: 'border-l-4 border-red-500',
  high:   'border-l-4 border-orange-500',
  medium: 'border-l-4 border-asas-gold',
  low:    'border-l-4 border-asas-silver',
}

const PRIORITY_CONFIG: Record<string, { icon: any, color: string, bg: string, border: string, label: string }> = {
  urgent: { icon: AlertOctagon, color: 'text-red-500',       bg: 'bg-red-500/10',    border: 'border-red-500/20',    label: 'Urgente' },
  high:   { icon: ArrowUp,      color: 'text-orange-500',    bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Haute' },
  medium: { icon: ArrowRight,   color: 'text-asas-gold',      bg: 'bg-asas-gold/10',   border: 'border-asas-gold/20',   label: 'Moyenne' },
  low:    { icon: ArrowDown,    color: 'text-asas-silver',      bg: 'bg-asas-silver/10',       border: 'border-asas-silver/20',      label: 'Basse' },
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

function formatDue(dueDate: string | null): string {
  if (!dueDate) return 'Aucune date limite'
  const d    = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff  = Math.floor((d.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0)  return `Retard de ${Math.abs(diff)} j`
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  return `T+${diff}`
}

export default function TasksPage() {
  const [tasks,   setTasks]  = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter] = useState<'all' | 'urgent' | 'today' | 'automated'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/tasks?status=pending&status=in_progress&limit=100')
      if (!res.ok) throw new Error('Failed to load tasks')
      const data = await res.json()
      setTasks(data.data ?? data ?? [])
    } catch (e: any) {
      import('@/lib/observability/errors').then(mod => mod.ErrorTracker.captureError(e, { context: 'Tasks load' }))
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function markDone(id: string) {
    const backup = [...tasks];
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status: 'done' as const, done_at: new Date().toISOString() } : t))
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'done' }) })
      if (!res.ok) throw new Error('Failed to mark task done');
    } catch (e: any) {
      import('@/lib/observability/errors').then(mod => mod.ErrorTracker.captureError(e, { context: 'Tasks markDone' }))
      setTasks(backup); // Revert optimistic UI
    }
  }

  const today   = new Date().toISOString().split('T')[0]!
  const filtered = tasks.filter(t => {
    if (t.status === 'done' || t.status === 'cancelled') return false
    if (filter === 'urgent')    return t.priority === 'urgent'
    if (filter === 'today')     return t.due_date === today || isOverdue(t.due_date)
    if (filter === 'automated') return t.is_automated
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const p = { urgent: 0, high: 1, medium: 2, low: 3 }
    return (p[a.priority] ?? 3) - (p[b.priority] ?? 3)
  })

  const urgentCount = tasks.filter(t => t.priority === 'urgent' && t.status === 'pending').length
  const overdueCount = tasks.filter(t => isOverdue(t.due_date) && t.status !== 'done').length

  return (
    <div className="flex-1 font-sans text-gray-900 dark:text-gray-100 flex flex-col">
      <div className="w-full space-y-8 max-w-4xl mx-auto">
        
        {isModalOpen && (
          <CreateTaskModal 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={load} 
          />
        )}
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-asas-silver/20">
           <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-asas-charcoal dark:text-asas-sand tracking-tight flex items-center gap-3 font-display uppercase">
                 <div className="w-12 h-12 rounded-sm bg-asas-sand/50 dark:bg-white/5 border border-asas-silver/20 flex items-center justify-center">
                    <CheckSquare className="h-6 w-6 text-asas-gold" /> 
                 </div>
                 Opérations
              </h1>
              <p className="text-[9px] uppercase font-bold tracking-widest text-asas-silver mt-2">{tasks.filter(t => t.status === 'pending').length} en file d'attente · <span className="text-red-500">{overdueCount} critiques</span></p>
           </div>
           <div className="flex items-center gap-3">
             {urgentCount > 0 && (
                <div className="hidden sm:flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-sm text-[9px] uppercase tracking-widest font-bold">
                   <AlertTriangle className="h-3 w-3" /> {urgentCount} Urgentes
                </div>
             )}
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 bg-asas-charcoal dark:bg-asas-sand text-asas-sand dark:text-asas-charcoal font-bold text-xs rounded-sm shadow-sm hover:translate-y-[-1px] active:translate-y-[1px] transition-all outline-none"
              >
                <Plus className="w-4 h-4" /> Nouvelle Tâche
              </button>
           </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all',       label: 'Toutes' },
            { key: 'today',     label: "Aujourd'hui / En retard" },
            { key: 'urgent',    label: '🚨 Urgentes' },
            { key: 'automated', label: '⚡ Automatisées' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              className={clsx(
                'px-5 py-2.5 rounded-sm text-[9px] uppercase font-bold tracking-widest transition-all focus:outline-none focus:border-asas-gold border',
                filter === f.key ? 'bg-asas-charcoal text-asas-sand dark:bg-asas-sand dark:text-asas-charcoal border-transparent' : 'bg-white dark:bg-[#141618] text-asas-silver hover:bg-asas-sand/50 dark:hover:bg-black/10 hover:text-asas-charcoal dark:hover:text-asas-sand border-asas-silver/20'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="space-y-4">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-white dark:bg-[#141618] rounded-sm border border-asas-silver/20 animate-pulse" />
            ))
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-asas-silver bg-white dark:bg-[#141618] rounded-sm border border-asas-silver/20 border-dashed shadow-sm">
               <div className="w-20 h-20 bg-asas-sand/50 dark:bg-black/10 rounded-sm flex items-center justify-center mb-6">
                  <ListTodo className="h-8 w-8 text-asas-charcoal dark:text-asas-silver" />
               </div>
              <p className="text-lg font-bold text-asas-charcoal dark:text-asas-sand mb-2 font-display uppercase tracking-widest">Protocoles achevés</p>
              <p className="text-[9px] uppercase tracking-widest mt-1 font-bold">Aucune opération en attente {filter !== 'all' ? `pour le filtre '${filter}'` : ''}.</p>
            </div>
          ) : (
             <AnimatePresence>
            {sorted.map((task, i) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                key={task.id} 
                className={clsx('bg-white dark:bg-[#141618] rounded-sm p-5 flex items-start gap-5 shadow-sm border-y border-r border-asas-silver/20 group hover:border-asas-gold/40 transition-all', PRIORITY_STYLE[task.priority])}
              >
                {/* Checkbox */}
                <button
                  onClick={() => markDone(task.id)}
                  className="mt-0.5 h-6 w-6 rounded-sm border border-asas-silver/40 bg-asas-sand/30 dark:bg-black/10 flex items-center justify-center shrink-0 hover:border-asas-emerald focus:outline-none focus:ring-1 focus:ring-asas-emerald/50 transition-all cursor-pointer"
                >
                  {task.status === 'done' && <Check className="h-4 w-4 text-asas-emerald shadow-sm" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                     <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                           <p className="text-sm font-bold text-asas-charcoal dark:text-asas-sand group-hover:text-asas-gold transition-colors tracking-wide">{task.title}</p>
                           {(() => {
                             const pConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
                             if (!pConf) return null;
                             const Icon = pConf.icon
                             return (
                               <span className={clsx('text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-sm font-bold shrink-0 border flex items-center gap-1.5', pConf.bg, pConf.border, pConf.color)}>
                                 <Icon className="w-3 h-3" />
                                 {pConf.label}
                               </span>
                             )
                           })()}
                           {task.is_automated && (
                              <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm border border-asas-navy/20 bg-asas-navy/10 text-asas-navy dark:text-asas-sand font-bold flex items-center gap-1 shrink-0">
                                 <Zap className="h-3 w-3" /> Auto
                              </span>
                           )}
                        </div>
                        {task.description && (
                           <p className="text-[10px] uppercase font-bold tracking-widest text-asas-silver leading-relaxed max-w-2xl">{task.description}</p>
                        )}
                     </div>

                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-asas-silver/10 pt-4">
                     <p className={clsx('text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5', isOverdue(task.due_date) ? 'text-red-500' : 'text-asas-silver')}>
                        <Clock className="h-3 w-3" />
                        {formatDue(task.due_date)}
                     </p>
                  </div>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}
