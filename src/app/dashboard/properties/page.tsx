// src/app/dashboard/properties/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { Building2, Plus, Search, Filter, CheckCircle, XCircle, Clock, Tag, MessageCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { PropertyCreateModal } from './PropertyCreateModal'

interface Property {
  id: string; reference_code: string | null; type: string; rooms: string | null
  area_sqm: number | null; list_price: number; status: string
  images: string[]; notes: string | null; created_at: string
  projects: { id: string; name: string; city: string | null; developers: { name: string } | null } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  available: { label: 'Disponible', color: 'bg-asas-emerald/10 text-asas-emerald border-asas-emerald/20', icon: CheckCircle },
  reserved:  { label: 'Réservé',    color: 'bg-asas-gold/10 text-asas-gold border-asas-gold/20', icon: Clock },
  sold:      { label: 'Vendu',      color: 'bg-asas-navy/10 text-asas-navy dark:text-asas-sand border-asas-navy/20',    icon: CheckCircle },
  off_market:{ label: 'Retiré',     color: 'bg-asas-copper/10 text-asas-copper border-asas-copper/20',      icon: XCircle },
}

const TYPE_LABELS: Record<string, string> = {
  f2:'F2', f3:'F3', f4:'F4', f5:'F5', villa:'Villa', duplex:'Duplex', studio:'Studio', commercial:'Commerce', land:'Terrain', other:'Autre',
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1)+'M DZD'
  return new Intl.NumberFormat('fr-DZ').format(n)+' DZD'
}

function PropertyCard({ property, onStatusChange }: { property: Property; onStatusChange: (id: string, s: string) => void }) {
  const cfg = STATUS_CONFIG[property.status] ?? STATUS_CONFIG.available!
  const StatusIcon = cfg.icon
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white dark:bg-[#141618] rounded-sm border border-asas-silver/20 overflow-hidden shadow-sm hover:border-asas-gold/30 transition-all group flex flex-col h-full"
    >
      {/* Image placeholder */}
      <div className="h-48 shrink-0 bg-asas-sand/30 dark:bg-black/10 flex items-center justify-center relative overflow-hidden">
        {property.images?.[0] ? (
          <Image src={property.images[0]} alt="Property image" fill className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-80 group-hover:opacity-100" referrerPolicy="no-referrer" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
        ) : (
          <Building2 className="h-12 w-12 text-asas-silver/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300" />
        <span className={clsx('absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-sm border text-[9px] uppercase tracking-widest font-bold shadow-sm backdrop-blur-md', cfg.color)}>
           <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 shadow-[0_0_10px_currentColor]" />
          {cfg.label}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className="text-[9px] font-bold text-asas-silver uppercase tracking-widest">{TYPE_LABELS[property.type] ?? property.type}</span>
            {property.reference_code && <span className="ml-2 text-[9px] font-mono text-asas-charcoal dark:text-asas-sand bg-black/5 dark:bg-white/5 border border-asas-silver/20 px-2 py-0.5 rounded-sm">#{property.reference_code}</span>}
          </div>
          {property.rooms && <span className="text-[9px] bg-asas-navy/10 text-asas-navy dark:text-asas-sand px-2 py-0.5 rounded-sm font-bold border border-asas-navy/20">{property.rooms}</span>}
        </div>

        <p className="font-mono text-xl font-bold tracking-tight text-asas-charcoal dark:text-asas-sand mb-4">{fmt(property.list_price)}</p>

        {property.projects && (
          <p className="text-xs font-bold text-asas-charcoal dark:text-asas-sand truncate flex items-center gap-2 mb-4 bg-asas-sand/50 dark:bg-black/20 p-2 border border-asas-silver/20 rounded-sm">
            <Building2 className="w-4 h-4 text-asas-gold shrink-0" />
            <span className="truncate">{property.projects.name}</span>
            {property.projects.city ? <span className="text-asas-silver shrink-0">· {property.projects.city}</span> : ''}
          </p>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-asas-silver/10 mt-auto">
          <div className="flex items-center gap-4 text-[9px] uppercase tracking-widest font-bold text-asas-silver flex-1">
            <div className="relative isolate" onClick={(e) => e.stopPropagation()}>
              <select
                value={property.status}
                onChange={(e) => onStatusChange(property.id, e.target.value)}
                className="appearance-none block w-full bg-asas-sand/50 dark:bg-[#141618] border border-asas-silver/20 text-asas-charcoal dark:text-asas-sand text-[9px] uppercase tracking-widest font-bold py-2 pl-2 pr-6 rounded-sm focus:outline-none focus:border-asas-gold/50 cursor-pointer"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center px-1 text-asas-silver">
                <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615l-4.695 4.502c-0.268 0.268-0.707 0.268-0.975 0l-4.695-4.502c-0.408-0.418-0.436-1.17 0-1.615z"/></svg>
              </div>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const text = `Découvrez ce bien exceptionnel :\nType: ${TYPE_LABELS[property.type] ?? property.type}\nPièces: ${property.rooms || '-'}\nSuperficie: ${property.area_sqm ? property.area_sqm + 'm²' : '-'}\nPrix: ${fmt(property.list_price)}\nProjet: ${property.projects?.name || 'Indépendant'}\n\nEn savoir plus: ${window.location.origin}/p/${property.id}`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            }}
            className="flex items-center justify-center p-2 rounded-sm bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/20 transition-colors ml-2"
            title="Partager via WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [total,      setTotal]       = useState(0)
  const [loading,    setLoading]     = useState(true)
  const [search,     setSearch]      = useState('')
  const [statusFilter, setStatus]    = useState('')
  const [typeFilter,   setType]      = useState('')
  const [page,       setPage]        = useState(1)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const LIMIT = 24

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter)   params.set('type',   typeFilter)
      if (search)       params.set('q',      search)

      const res  = await fetch(`/api/properties?${params}`)
      if (!res.ok) throw new Error(await res.text() || 'Failed to open properties')
      const data = await res.json()
      setProperties(data.data ?? [])
      setTotal(data.count ?? 0)
    } catch (e: any) {
      import('@/lib/observability/errors').then(mod => mod.ErrorTracker.captureError(e, { context: 'PropertiesPage load' }))
    } finally { setLoading(false) }
  }, [page, statusFilter, typeFilter, search])

  useEffect(() => { load() }, [load])

  const statsByStatus = ['available', 'reserved', 'sold'].reduce((acc, s) => ({
    ...acc, [s]: properties.filter(p => p.status === s).length,
  }), {} as Record<string, number>)

  return (
    <div className="flex-1 text-asas-charcoal dark:text-asas-sand flex flex-col">
      <div className="w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-asas-charcoal dark:text-asas-sand tracking-tight flex items-center gap-3 font-display uppercase">
              <div className="w-14 h-14 rounded-sm bg-asas-sand/50 dark:bg-black/10 border border-asas-silver/20 flex items-center justify-center p-3 shadow-sm">
                 <Building2 className="h-full w-full text-asas-gold" /> 
              </div>
              Gestion des Actifs
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-asas-silver mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-asas-emerald animate-pulse" />
              INVENTAIRE SYNCHRONISÉ
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-5 py-3 shrink-0 bg-white dark:bg-[#141618] border border-asas-silver/20 text-asas-charcoal dark:text-asas-sand rounded-sm text-xs font-bold hover:border-asas-gold/40 transition-all shadow-sm">
              Générer Rapport
            </button>
            <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-5 py-3 object-cover shrink-0 bg-asas-charcoal dark:bg-asas-sand text-asas-sand dark:text-asas-charcoal rounded-sm text-xs font-bold hover:bg-black dark:hover:bg-white shadow-sm transition-all transform hover:scale-[1.02] active:scale-95 border border-transparent">
              <Plus className="h-4 w-4" strokeWidth={2} /> Nouvel Actif
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: 'Unité Disponible', key: 'available', color: 'text-asas-emerald bg-white dark:bg-[#141618] border-asas-silver/20' },
            { label: 'Processus de Réservation',    key: 'reserved',  color: 'text-asas-gold bg-white dark:bg-[#141618] border-asas-silver/20' },
            { label: 'Acquisition Clôturée',  key: 'sold',       color: 'text-asas-navy dark:text-asas-sand bg-white dark:bg-[#141618] border-asas-silver/20' },
          ].map(s => (
            <motion.div initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}} key={s.key} className={clsx('rounded-sm border p-6 relative overflow-hidden shadow-sm', s.color)}>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Building2 className="w-16 h-16" />
              </div>
              <p className="text-3xl sm:text-4xl font-bold tracking-tighter mb-2 relative z-10 font-mono">{statsByStatus[s.key] ?? 0}</p>
              <p className="text-[9px] uppercase font-bold tracking-widest opacity-80 relative z-10 text-asas-charcoal dark:text-asas-sand">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Control Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#141618] p-4 rounded-sm border border-asas-silver/20 shadow-sm">
           <div className="flex items-center gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-asas-silver" />
                <input type="text" placeholder="Scanner matricule X-001..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 text-sm bg-transparent border border-asas-silver/40 rounded-sm focus:outline-none focus:ring-1 focus:ring-asas-gold focus:border-asas-gold text-asas-charcoal dark:text-asas-sand transition-all font-medium placeholder:text-asas-silver" />
             </div>
           </div>

           <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:w-48">
                 <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-asas-silver z-10 pointer-events-none" />
                 <select value={statusFilter} onChange={e => setStatus(e.target.value)}
                    className="w-full pl-11 pr-8 py-2.5 text-sm bg-transparent border border-asas-silver/40 rounded-sm focus:outline-none focus:ring-1 focus:ring-asas-gold text-asas-charcoal dark:text-asas-sand transition-all font-medium appearance-none cursor-pointer">
                    <option value="">Tous les statuts</option>
                    <option value="available">Disponible</option>
                    <option value="reserved">Réservé</option>
                    <option value="sold">Vendu</option>
                </select>
               </div>
               
               <div className="relative flex-1 md:w-48">
                 <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-asas-silver z-10 pointer-events-none" />
                 <select value={typeFilter} onChange={e => setType(e.target.value)}
                    className="w-full pl-11 pr-8 py-2.5 text-sm bg-transparent border border-asas-silver/40 rounded-sm focus:outline-none focus:ring-1 focus:ring-asas-gold text-asas-charcoal dark:text-asas-sand transition-all font-medium appearance-none cursor-pointer">
                    <option value="">Tous les gabarits</option>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
               </div>
           </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => <div key={i} className="h-80 bg-asas-sand/50 dark:bg-black/10 rounded-sm border border-asas-silver/20 animate-pulse" />)}
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-asas-silver bg-white dark:bg-[#141618] rounded-sm border border-asas-silver/20 border-dashed shadow-sm">
            <div className="w-20 h-20 bg-black/5 dark:bg-white/5 rounded-sm flex items-center justify-center mb-6">
               <Building2 className="h-8 w-8 text-asas-gold opacity-50" />
            </div>
             <p className="text-lg font-bold text-asas-charcoal dark:text-asas-sand mb-2 font-display uppercase tracking-widest">Base de données vide</p>
             <p className="text-[9px] uppercase tracking-widest">Ajustez vos paramètres régionaux ou d'état.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {properties.map((p, i) => <PropertyCard key={p.id} property={p} onStatusChange={async (id, s) => {
              setProperties(curr => curr.map(prop => prop.id === id ? { ...prop, status: s } : prop))
              try {
                const { v4: uuidv4 } = await import('uuid')
                const res = await fetch('/api/command-gateway', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    commandId: uuidv4(),
                    aggregateId: id,
                    type: 'UPDATE_PROPERTY_STATUS',
                    expectedVersion: 1, // simplified for ui update
                    payload: { status: s }
                  })
                })
                const data = await res.json()
                if (!res.ok || !data.success) throw new Error(data.error || 'Conflict')
              } catch (e: any) {
                import('@/lib/observability/errors').then(mod => mod.ErrorTracker.captureError(e, { context: 'PropertiesPage onStatusChange' }))
                load() // Revert
              }
            }} />)}
          </div>
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-center gap-4 pt-8">
            <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="px-5 py-2.5 text-xs font-bold text-asas-silver bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm disabled:opacity-40 hover:text-asas-charcoal dark:hover:text-asas-sand hover:border-asas-gold/40 transition-colors shadow-sm">← Précédent</button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-asas-silver bg-white dark:bg-[#141618] px-4 py-2.5 rounded-sm border border-asas-silver/20 shadow-sm">Page {page} / {Math.ceil(total/LIMIT)}</span>
            <button disabled={page >= Math.ceil(total/LIMIT)} onClick={() => setPage(p => p+1)} className="px-5 py-2.5 text-xs font-bold text-asas-silver bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm disabled:opacity-40 hover:text-asas-charcoal dark:hover:text-asas-sand hover:border-asas-gold/40 transition-colors shadow-sm">Suivant →</button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isCreateModalOpen && (
          <PropertyCreateModal 
             onClose={() => setIsCreateModalOpen(false)} 
             onSuccess={() => { setIsCreateModalOpen(false); load() }} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}
