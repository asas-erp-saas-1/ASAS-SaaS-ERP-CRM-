import { useState } from 'react'
import { motion } from 'motion/react'
import { clsx } from 'clsx'
import { X, Calendar as CalendarIcon, Clock, Link as LinkIcon, Loader2 } from 'lucide-react'
import { getAccessToken } from '@/lib/google-auth'

export function CreateEventModal({ onClose, onSuccess, selectedDate }: { onClose: () => void, onSuccess: () => void, selectedDate: Date }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(selectedDate.toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error('Non authentiqué avec Google')
      }

      const startDateTime = new Date(`${date}T${startTime}:00`).toISOString()
      const endDateTime = new Date(`${date}T${endTime}:00`).toISOString()

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: title,
          description: description,
          start: {
            dateTime: startDateTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: endDateTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        })
      })

      if (!res.ok) {
        throw new Error('Erreur lors de la création de l\'événement Google')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#1a1c1e] border border-gray-200 dark:border-white/10 rounded-[8px] shadow-2xl w-full max-w-[450px] overflow-hidden flex flex-col font-sans"
      >
        <div className="p-1 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-black/10">
          <div className="flex items-center gap-2 pl-3">
            <CalendarIcon className="w-4 h-4 text-[#4285F4]" />
            <h2 className="text-[14px] font-medium text-gray-700 dark:text-gray-200">
              Nouvel Événement Google
            </h2>
          </div>
          <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors hover:bg-black/5 dark:hover:bg-white/5 rounded-full mr-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-[4px]">
              {error}
            </div>
          )}

          <div>
            <div className="flex items-center gap-4 border-b border-gray-200 dark:border-white/10 relative">
               <div className="w-8 shrink-0 flex items-center justify-center opacity-0"><CalendarIcon className="w-5 h-5"/></div>
               <input 
                 required
                 aria-label="Ajouter un titre"
                 type="text" 
                 value={title}
                 onChange={e => setTitle(e.target.value)}
                 className="w-full bg-transparent border-none px-0 py-3 text-2xl font-normal text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-none focus:ring-0 leading-tight"
                 placeholder="Ajouter un titre"
                 autoFocus
               />
               <div className={clsx("absolute bottom-0 left-12 right-0 h-0.5 bg-[#1a73e8] transition-transform origin-left scale-x-0", title ? "scale-x-100" : "")}></div>
            </div>
          </div>

          <div className="flex items-start gap-4 mt-2">
            <div className="w-8 pt-2.5 shrink-0 flex items-center justify-center text-gray-400"><Clock className="w-5 h-5" /></div>
            <div className="flex-1 space-y-3">
              <input 
                required
                aria-label="Date"
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-gray-100 dark:bg-white/5 border-none rounded-[4px] px-3 py-1.5 text-[14px] focus:outline-none focus:ring-2 ring-[#4285F4] text-gray-800 dark:text-gray-200 transition-shadow w-fit"
              />
              
              <div className="flex items-center gap-2">
                <input 
                  required
                  aria-label="Heure de début"
                  type="time" 
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="bg-gray-100 dark:bg-white/5 border-none rounded-[4px] px-3 py-1.5 text-[14px] focus:outline-none focus:ring-2 ring-[#1a73e8] text-gray-800 dark:text-gray-200 transition-shadow"
                />
                <span className="text-gray-500 font-medium">-</span>
                <input 
                  required
                  aria-label="Heure de fin"
                  type="time" 
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="bg-gray-100 dark:bg-white/5 border-none rounded-[4px] px-3 py-1.5 text-[14px] focus:outline-none focus:ring-2 ring-[#1a73e8] text-gray-800 dark:text-gray-200 transition-shadow"
                />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 mt-2">
            <div className="w-8 pt-2.5 shrink-0 flex items-center justify-center text-gray-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <textarea 
              aria-label="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-gray-100 dark:bg-white/5 border-none rounded-[4px] px-3 py-2 text-[14px] h-24 focus:outline-none focus:ring-2 ring-[#1a73e8] text-gray-800 dark:text-gray-200 transition-shadow resize-none"
              placeholder="Ajouter une description"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2 text-[14px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-[4px] transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center justify-center min-w-[100px] gap-2 px-5 py-2 bg-[#1a73e8] text-white hover:bg-[#1557b0] font-medium text-[14px] rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
