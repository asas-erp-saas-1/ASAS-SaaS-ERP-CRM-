'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, Calculator, Building2, Users, Handshake, ChevronRight, X, UserSquare2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { useDebounce } from 'use-debounce'

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery] = useDebounce(query, 300)
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((open) => !open)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    
    const customOpen = () => setIsOpen(true)
    
    document.addEventListener('keydown', down)
    window.addEventListener('asas-omnibar-open', customOpen)
    
    return () => {
      document.removeEventListener('keydown', down)
      window.removeEventListener('asas-omnibar-open', customOpen)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      document.body.style.overflow = 'hidden'
    } else {
      setQuery('')
      setResults([])
      setActiveIndex(0)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  useEffect(() => {
    async function search() {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setResults([])
        return
      }
      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
        const data = await res.json()
        if (data.results) {
          setResults(data.results)
          setActiveIndex(0)
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsLoading(false)
      }
    }
    search()
  }, [debouncedQuery])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(prev => (prev + 1) % results.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(prev => (prev - 1 < 0 ? results.length - 1 : prev - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = results[activeIndex]
        if (selected) {
          router.push(selected.url)
          setIsOpen(false)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, activeIndex, router])

  const getIcon = (type: string) => {
    switch (type) {
      case 'lead': return <Users className="w-5 h-5 text-asas-navy dark:text-asas-sand" />
      case 'client': return <UserSquare2 className="w-5 h-5 text-indigo-500" />
      case 'property': return <Building2 className="w-5 h-5 text-violet-500" />
      case 'deal': return <Handshake className="w-5 h-5 text-emerald-500" />
      default: return <Search className="w-5 h-5 text-asas-silver" />
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[20vh] px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ ease: "easeOut", duration: 0.2 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#141618] rounded-sm shadow-2xl overflow-hidden border border-asas-silver/20"
            >
              <div className="flex items-center gap-3 px-4 py-4 border-b border-asas-silver/20 bg-asas-sand/30 dark:bg-black/10">
                <Search className="w-5 h-5 text-asas-silver" />
                <input 
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Rechercher par nom, téléphone, ou matricule..."
                  className="flex-1 bg-transparent border-none outline-none text-base font-bold text-asas-charcoal dark:text-asas-sand placeholder-asas-silver/60"
                />
                {isLoading && <Loader2 className="w-5 h-5 text-asas-silver animate-spin" />}
                <kbd className="hidden sm:inline-flex px-2 py-1 text-[9px] items-center justify-center font-bold text-asas-silver bg-asas-sand/50 dark:bg-white/5 border border-asas-silver/20 rounded-sm shadow-sm uppercase">ESC</kbd>
                <button onClick={() => setIsOpen(false)} className="sm:hidden p-1 bg-asas-sand/50 dark:bg-white/5 rounded-sm">
                  <X className="w-4 h-4 text-asas-silver" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                {results.length === 0 && query.length >= 2 && !isLoading && (
                  <div className="p-8 text-center text-[10px] uppercase font-bold tracking-widest text-asas-silver">
                    Aucun résultat trouvé pour "{query}"
                  </div>
                )}
                
                {results.length === 0 && query.length < 2 && (
                  <div className="p-4">
                    <p className="text-[9px] font-bold text-asas-silver uppercase tracking-widest pl-2 mb-2">Requêtes Rapides</p>
                    <div className="grid grid-cols-2 gap-2">
                         <button onClick={() => { router.push('/dashboard/leads/new'); setIsOpen(false); }} className="flex flex-col text-left p-3 rounded-sm bg-white dark:bg-[#141618] border border-asas-silver/10 hover:border-asas-gold/40 hover:bg-asas-sand/30 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                           <span className="text-[10px] font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest flex items-center gap-2 group-hover:text-asas-gold transition-colors"><Users className="w-4 h-4"/> Nlle. Requête </span>
                           <span className="text-[9px] text-asas-silver uppercase tracking-widest font-bold mt-1">Créer un prospect</span>
                         </button>
                         <button onClick={() => { router.push('/dashboard/clients'); setIsOpen(false); }} className="flex flex-col text-left p-3 rounded-sm bg-white dark:bg-[#141618] border border-asas-silver/10 hover:border-asas-gold/40 hover:bg-asas-sand/30 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                           <span className="text-[10px] font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest flex items-center gap-2 group-hover:text-asas-gold transition-colors"><UserSquare2 className="w-4 h-4"/> Base Clients</span>
                           <span className="text-[9px] text-asas-silver uppercase tracking-widest font-bold mt-1">Rechercher contact</span>
                         </button>
                    </div>
                  </div>
                )}

                {results.length > 0 && (
                  <div>
                     <p className="text-[9px] font-bold text-asas-silver uppercase tracking-widest pl-2 mb-2 pt-2">Résultats Systèmes</p>
                     {results.map((item, index) => (
                       <button
                         key={`${item.type}-${item.id}`}
                         onClick={() => { router.push(item.url); setIsOpen(false); }}
                         onMouseEnter={() => setActiveIndex(index)}
                         className={clsx(
                           "w-full text-left flex items-center gap-4 p-3 rounded-sm transition-colors select-none cursor-pointer border",
                           activeIndex === index ? "bg-asas-sand/50 dark:bg-white/10 border-asas-gold/50" : "hover:bg-asas-sand/30 dark:hover:bg-white/5 border-transparent hover:border-asas-silver/20"
                         )}
                       >
                         <div className={clsx(
                             "w-10 h-10 rounded-sm flex items-center justify-center shrink-0 border",
                             item.type === 'lead' ? 'bg-asas-navy/10 border-asas-navy/20 dark:text-asas-sand' :
                             item.type === 'client' ? 'bg-asas-copper/10 border-asas-copper/20 text-asas-copper' :
                             item.type === 'property' ? 'bg-asas-silver/10 border-asas-silver/20 text-asas-silver' :
                             'bg-asas-emerald/10 border-asas-emerald/20 text-asas-emerald'
                           )}>
                           {getIcon(item.type)}
                         </div>
                         <div className="flex-1 min-w-0">
                           <h4 className="text-[10px] font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest truncate">{item.title}</h4>
                           <p className="text-[9px] font-bold text-asas-silver uppercase tracking-widest mt-0.5 truncate">{item.subtitle}</p>
                         </div>
                         <div className="shrink-0 pl-2">
                            <ChevronRight className="w-4 h-4 text-asas-silver" />
                         </div>
                       </button>
                     ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
