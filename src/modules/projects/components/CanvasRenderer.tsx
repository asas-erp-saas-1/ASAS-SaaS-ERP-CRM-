'use client'

import { useEffect, useState, useRef } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Text as KonvaText, Group } from 'react-konva'
import useImage from 'use-image'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Building2, Layers, Map, Eye, LayoutGrid, CheckCircle2, AlertCircle, 
  RefreshCw, Bookmark, ExternalLink, Plus, Search, MessageSquare, 
  Tag, DollarSign, UserCheck, Check, Clock, X, ArrowRight, UserPlus, Sparkles 
} from 'lucide-react'
import { clsx } from 'clsx'
import type { Property } from '@/types/app'

// Floor Plan background image
const PLAN_URL = 'https://picsum.photos/seed/floorplan/1200/800'

interface CanvasRendererProps {
  properties: Property[]
  onReload?: () => void
}

interface Client {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  type: string
}

const TYPE_LABELS: Record<string, string> = {
  f2: 'F2', f3: 'F3', f4: 'F4', f5: 'F5', villa: 'Villa', duplex: 'Duplex', studio: 'Studio', commercial: 'Commerce', land: 'Terrain', other: 'Autre'
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  available: { 
    label: 'Disponible', 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-500/10', 
    border: 'border-emerald-500/20', 
    icon: CheckCircle2 
  },
  reserved: { 
    label: 'Réservé / Option', 
    color: 'text-amber-500', 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/20', 
    icon: Clock 
  },
  sold: { 
    label: 'Vendu', 
    color: 'text-neutral-400', 
    bg: 'bg-neutral-500/10', 
    border: 'border-neutral-500/20', 
    icon: CheckCircle2 
  },
  off_market: { 
    label: 'Retiré', 
    color: 'text-rose-500', 
    bg: 'bg-rose-500/10', 
    border: 'border-rose-500/20', 
    icon: X 
  }
}

function getFloorOfProperty(p: Property): { num: number; label: string } {
  const ref = p.reference_code || ''
  if (ref.toLowerCase().includes('rdc') || ref.toLowerCase().includes('ground')) {
    return { num: 0, label: 'Rez-de-chaussée (RDC)' }
  }
  
  const numbers = ref.match(/\d+/)
  if (numbers) {
    const numStr = numbers[0]
    let floorNum = 1
    if (numStr.length >= 3) {
      floorNum = parseInt(numStr.substring(0, numStr.length - 2), 10)
    } else {
      floorNum = parseInt(numStr, 10)
    }
    // Safeguard crazy ratios
    if (floorNum > 50) floorNum = 1
    return { num: floorNum, label: `${floorNum}${floorNum === 1 ? 'er' : 'ème'} Étage` }
  }
  
  // Arbitrary deterministic fallback based on reference string chars
  let sum = 0
  for (let i = 0; i < ref.length; i++) sum += ref.charCodeAt(i)
  const fallbackFloor = (sum % 5) + 1
  return { num: fallbackFloor, label: `${fallbackFloor}ème Étage` }
}

export default function CanvasRenderer({ properties, onReload }: CanvasRendererProps) {
  const [image] = useImage(PLAN_URL, 'anonymous')
  const containerRef = useRef<HTMLDivElement>(null)
  
  // State variables
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'stacking' | 'canvas'>('stacking')
  
  // Booking modal and forms state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  
  // Search state inside client selector
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [isNewClient, setIsNewClient] = useState(false)
  const [submittingDeal, setSubmittingDeal] = useState(false)
  const [successState, setSuccessState] = useState(false)
  
  // New Client fields
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  
  // Deal overrides
  const [agreedPrice, setAgreedPrice] = useState(0)
  const [dealType, setDealType] = useState<'sale' | 'rental' | 'resale'>('sale')

  const selectedProperty = properties.find(p => p.id === selectedId)

  // Track dimensions
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight || 500
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [viewMode])

  // Group properties into floors for Stacking Plan
  const floorsMap: Record<number, { label: string; properties: Property[] }> = {}
  properties.forEach((p) => {
    const { num, label } = getFloorOfProperty(p)
    if (!floorsMap[num]) {
      floorsMap[num] = { label, properties: [] }
    }
    floorsMap[num].properties.push(p)
  })

  const sortedFloorNums = Object.keys(floorsMap)
    .map(Number)
    .sort((a, b) => b - a)

  // Load clients list upon booking intent
  const loadClients = async () => {
    setClientsLoading(true)
    try {
      const res = await fetch('/api/clients?limit=100')
      if (res.ok) {
        const d = await res.json()
        setClients(d.data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setClientsLoading(false)
    }
  }

  // Handle selected property changes to prefill agreed price
  useEffect(() => {
    if (selectedProperty) {
      setAgreedPrice(selectedProperty.list_price || 0)
    }
  }, [selectedProperty])

  // Handle client selection trigger
  const handleOpenBooking = () => {
    loadClients()
    setIsBookingModalOpen(true)
    setIsNewClient(false)
    setSelectedClientId('')
    setNewClientName('')
    setNewClientPhone('')
    setNewClientEmail('')
    setSuccessState(false)
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingDeal) return
    setSubmittingDeal(true)

    try {
      const { v4: uuidv4 } = await import('uuid')
      let targetClientId = selectedClientId

      // 1. Create client first if on-the-fly toggled
      if (isNewClient) {
        if (!newClientName.trim()) throw new Error('Le nom du client est requis')
        
        const clientRes = await fetch('/api/command-gateway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commandId: uuidv4(),
            aggregateId: uuidv4(),
            type: 'CREATE_CLIENT',
            expectedVersion: 1,
            payload: {
              full_name: newClientName,
              phone: newClientPhone || null,
              email: newClientEmail || null,
              type: 'buyer',
              source: 'walk_in'
            }
          })
        })
        const clientData = await clientRes.json()
        if (!clientRes.ok || !clientData.success) {
          throw new Error(clientData.error || "Échec de création de l'acquéreur")
        }
        targetClientId = clientData.data.id
      }

      if (!targetClientId) throw new Error('Veuillez sélectionner ou créer un acquéreur')

      // 2. Submit deal via command gateway
      const dealRes = await fetch('/api/command-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId: uuidv4(),
          aggregateId: uuidv4(),
          type: 'CREATE_DEAL',
          expectedVersion: 1,
          payload: {
            client_id: targetClientId,
            property_id: selectedId,
            agreed_price: agreedPrice,
            deal_type: dealType
          }
        })
      })
      
      const dealData = await dealRes.json()
      if (!dealRes.ok || !dealData.success) {
        throw new Error(dealData.error || "Conflit lors de l'enregistrement de la transaction")
      }

      setSuccessState(true)
      setTimeout(() => {
        setIsBookingModalOpen(false)
        if (onReload) onReload()
      }, 1500)
    } catch (err: any) {
      alert(err.message || 'Error occurred')
    } finally {
      setSubmittingDeal(false)
    }
  }

  // Quick manually change status call
  const handleQuickStatusChange = async (targetStatus: string) => {
    if (!selectedId) return
    try {
      const { v4: uuidv4 } = await import('uuid')
      const res = await fetch('/api/command-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId: uuidv4(),
          aggregateId: selectedId,
          type: 'UPDATE_PROPERTY_STATUS',
          expectedVersion: 1,
          payload: { status: targetStatus }
        })
      })
      if (res.ok) {
        if (onReload) onReload()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredClients = clients.filter(c => 
    c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) || 
    (c.phone && c.phone.includes(clientSearch))
  )

  // WebGL/Canvas mock simulation layout coordinates
  const canvasShapes = properties.map((p, index) => {
    const cols = Math.floor(dimensions.width / 150) || 4
    const w = 110
    const h = 75
    const x = 50 + (index % cols) * (w + 25)
    const y = 50 + Math.floor(index / cols) * (h + 25)
    
    let color = 'rgba(255,255,255,0.4)'
    let strokeColor = '#cccccc'
    if (p.status === 'sold') {
      color = 'rgba(115, 115, 115, 0.5)' 
      strokeColor = '#525252' 
    } else if (p.status === 'reserved') {
      color = 'rgba(245, 158, 11, 0.4)' 
      strokeColor = '#d97706' 
    } else if (p.status === 'available') {
      color = 'rgba(16, 185, 129, 0.4)' 
      strokeColor = '#059669' 
    }

    return { ...p, x, y, w, h, color, strokeColor }
  })

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col lg:flex-row relative bg-[#FAF9F6] dark:bg-[#0D0E0F] overflow-hidden text-asas-charcoal dark:text-asas-sand">
      
      {/* Top Controller Ribbon */}
      <div className="absolute top-4 left-4 z-40 flex items-center bg-white dark:bg-[#151618] border border-asas-silver/20 rounded-sm p-1.5 shadow-md gap-1">
        <button
          type="button"
          onClick={() => setViewMode('stacking')}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all cursor-pointer",
            viewMode === 'stacking' 
              ? "bg-indigo-600 text-white" 
              : "text-asas-silver hover:bg-asas-silver/10"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Vue Stacking / Étage</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('canvas')}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all cursor-pointer",
            viewMode === 'canvas' 
              ? "bg-indigo-600 text-white" 
              : "text-asas-silver hover:bg-asas-silver/10"
          )}
        >
          <Map className="w-3.5 h-3.5" />
          <span>Plan de Masse</span>
        </button>
      </div>

      {/* Main Interactive Matrix Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pt-16 h-full border-r border-asas-silver/10">
        
        {viewMode === 'stacking' ? (
          /* Stacking Tower Visual Mode */
          <div className="space-y-8 max-w-4xl mx-auto pb-12">
            <div className="flex items-center justify-between border-b border-asas-silver/10 pb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-asas-silver">Structure Coupe Verticale du Bâtiment</h3>
                <p className="text-[10px] uppercase tracking-widest text-[#a09e97] mt-0.5">Cliquez sur un appartement pour inspecter, poser de nouvelles options ou générer son devis.</p>
              </div>
              
              <div className="flex gap-4 text-[9px] font-bold uppercase tracking-wider text-asas-silver shrink-0">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /><span>Disponible ({properties.filter(p=>p.status==='available').length})</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span>Réservé ({properties.filter(p=>p.status==='reserved').length})</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-neutral-400" /><span>Vendu ({properties.filter(p=>p.status==='sold').length})</span></div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              {sortedFloorNums.map((floorNum) => {
                const floor = floorsMap[floorNum]
                if (!floor) return null
                return (
                  <div key={floorNum} className="grid grid-cols-12 items-center gap-4 bg-white dark:bg-[#121314] p-4 rounded-sm border border-asas-silver/15 shadow-sm group hover:border-asas-silver/30 transition-all">
                    
                    {/* Floor Label Tag (Facade Left Rails) */}
                    <div className="col-span-12 md:col-span-3 flex items-center md:flex-col items-start gap-1 justify-between md:justify-center border-b md:border-b-0 md:border-r border-asas-silver/10 pb-2 md:pb-0 md:pr-4">
                      <span className="text-[10px] font-bold text-asas-silver tracking-widest uppercase">Étage {floorNum}</span>
                      <span className="text-xs font-black text-asas-navy dark:text-asas-sand font-display shrink-0">{floor.label}</span>
                      <span className="text-[9px] text-[#A09E97] font-mono shrink-0">{floor.properties.length} Lots</span>
                    </div>

                    {/* Floor unit rows */}
                    <div className="col-span-12 md:col-span-9 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {floor.properties.map((p) => {
                        const isSelected = selectedId === p.id
                        const cfg = STATUS_CONFIG[p.status] || { 
                          label: 'Disponible', 
                          color: 'text-emerald-500', 
                          bg: 'bg-emerald-500/10', 
                          border: 'border-emerald-500/20', 
                          icon: CheckCircle2 
                        }
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedId(isSelected ? null : p.id)}
                            className={clsx(
                              "relative text-left p-3.5 rounded-sm border transition-all flex flex-col justify-between cursor-pointer group/unit shadow-sm",
                              isSelected 
                                ? "bg-indigo-600 border-indigo-500 text-white scale-[1.03] z-10 shadow-lg ring-2 ring-indigo-500/20" 
                                : clsx(
                                    "bg-[#fafafa] dark:bg-black/15 hover:bg-white dark:hover:bg-black/40 border-asas-silver/15 hover:border-asas-silver/30",
                                    cfg.color
                                  )
                            )}
                          >
                            <div className="flex justify-between items-start gap-1.5 mb-2">
                              {/* Reference */}
                              <span className={clsx("text-xs font-black uppercase tracking-tight font-display", isSelected ? 'text-white' : 'text-asas-charcoal dark:text-asas-sand')}>
                                {p.reference_code || 'Lot N/A'}
                              </span>
                              {/* Type Batch */}
                              <span className={clsx(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded-sm shrink-0 uppercase",
                                isSelected ? 'bg-white/10 text-white' : 'bg-asas-silver/10 text-asas-silver'
                              )}>
                                {TYPE_LABELS[p.type] || p.type}
                              </span>
                            </div>

                            <div className="flex items-end justify-between gap-1 mt-1">
                              {/* Area */}
                              <span className={clsx("text-[9px] tracking-wide font-medium font-mono uppercase", isSelected ? 'text-white/80' : 'text-asas-silver')}>
                                {p.area_sqm} m²
                              </span>
                              {/* Price label */}
                              <span className={clsx("text-[10px] font-black font-mono tracking-tight", isSelected ? 'text-white' : 'text-asas-charcoal dark:text-white')}>
                                {(p.list_price / 1000000).toFixed(1)}M DZD
                              </span>
                            </div>

                            {/* Corner check dot indicator */}
                            <span className={clsx(
                              "absolute bottom-2.5 right-2 w-1.5 h-1.5 rounded-full select-none pointer-events-none scale-0 group-hover/unit:scale-100 transition-transform duration-300",
                              isSelected ? 'bg-white' : (p.status === 'available' ? 'bg-emerald-500' : 'bg-amber-500')
                            )} />
                          </button>
                        )
                      })}
                    </div>

                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Draggable/Zoomable Canvas Simulator (Using Konva State) */
          <div className="w-full h-full relative" style={{ cursor: 'grab' }}>
            {dimensions.width > 0 && (
              <Stage 
                width={dimensions.width} 
                height={dimensions.height}
                draggable
                onWheel={(e) => {
                  e.evt.preventDefault()
                  const scaleBy = 1.05
                  const stage = e.target.getStage()
                  if (!stage) return
                  const oldScale = stage.scaleX()
                  const pointer = stage.getPointerPosition()
                  if (!pointer) return

                  const mousePointTo = {
                    x: (pointer.x - stage.x()) / oldScale,
                    y: (pointer.y - stage.y()) / oldScale,
                  }
                  const direction = e.evt.deltaY > 0 ? -1 : 1
                  const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy
                  stage.scale({ x: newScale, y: newScale })
                  
                  const newPos = {
                    x: pointer.x - mousePointTo.x * newScale,
                    y: pointer.y - mousePointTo.y * newScale,
                  }
                  stage.position(newPos)
                }}
              >
                <Layer>
                  {/* Master Floorplan outline background */}
                  {image && (
                    <KonvaImage 
                      image={image} 
                      opacity={0.15} 
                    />
                  )}
                  <Rect 
                    width={1500} height={1000} fill="rgba(0,0,0,0.4)"
                    listening={false}
                  />

                  {/* Lot elements represented as customizable Canvas groups */}
                  {canvasShapes.map((shape) => {
                    const isSelected = selectedId === shape.id
                    return (
                      <Group 
                        key={shape.id} 
                        x={shape.x} y={shape.y}
                        onClick={() => setSelectedId(isSelected ? null : shape.id)}
                        onTap={() => setSelectedId(isSelected ? null : shape.id)}
                      >
                        <Rect
                          width={shape.w}
                          height={shape.h}
                          fill={isSelected ? 'rgba(79, 70, 229, 0.7)' : shape.color}
                          stroke={isSelected ? '#ffffff' : shape.strokeColor}
                          strokeWidth={isSelected ? 3 : 1.5}
                          cornerRadius={6}
                          shadowColor="black"
                          shadowBlur={isSelected ? 10 : 0}
                          shadowOpacity={0.2}
                          onMouseEnter={(e) => {
                            const container = e.target.getStage()?.container()
                            if (container) container.style.cursor = 'pointer'
                          }}
                          onMouseLeave={(e) => {
                            const container = e.target.getStage()?.container()
                            if (container) container.style.cursor = 'grab'
                          }}
                        />
                        
                        {/* Title text */}
                        <KonvaText 
                          text={shape.reference_code || 'Lot'}
                          x={12} y={15}
                          fill="#ffffff"
                          fontSize={11}
                          fontStyle="bold"
                          fontFamily="sans-serif"
                        />
                        {/* Area size info */}
                        <KonvaText 
                          text={`${shape.area_sqm} m²`}
                          x={12} y={35}
                          fill="rgba(255,255,255,0.7)"
                          fontSize={9}
                          fontFamily="sans-serif"
                        />
                        {/* Price label */}
                        <KonvaText 
                          text={`${(shape.list_price / 1_000_000).toFixed(1)}M DZD`}
                          x={12} y={50}
                          fill="rgba(255,255,255,0.9)"
                          fontSize={9}
                          fontStyle="bold"
                          fontFamily="sans-serif"
                        />
                      </Group>
                    )
                  })}
                </Layer>
              </Stage>
            )}
          </div>
        )}
      </div>

      {/* Right-Hand Sidebar Asset Inspection details */}
      <AnimatePresence>
        {selectedProperty && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full lg:w-96 bg-white dark:bg-[#121314] shadow-2xl border-t lg:border-t-0 lg:border-l border-asas-silver/15 p-6 flex flex-col justify-between shrink-0 h-full relative z-35"
          >
            {/* Sidebar Inspector details */}
            <div className="space-y-6">
              
              {/* Heading Asset card */}
              <div className="flex items-start justify-between border-b border-asas-silver/10 pb-4">
                <div>
                  <span className={clsx(
                    "text-[8px] uppercase tracking-widest font-black px-2 py-0.5 rounded-sm select-none border",
                    selectedProperty.status === 'available' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' :
                    selectedProperty.status === 'reserved' ? 'bg-amber-500/10 text-amber-500 border-amber-500/10' :
                    'bg-neutral-500/10 text-asas-silver border-asas-silver/10'
                  )}>
                    {selectedProperty.status === 'available' ? 'Disponible' : selectedProperty.status === 'reserved' ? 'Réservé' : 'Vendu'}
                  </span>
                  <h3 className="text-2xl font-black text-asas-charcoal dark:text-white mt-1.5 font-display flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-500 shrink-0" />
                    {selectedProperty.reference_code || 'Lot Sans Réf'}
                  </h3>
                  <p className="text-[9px] uppercase font-black text-asas-silver tracking-widest mt-0.5">UID: {selectedProperty.id.substring(0,8)}</p>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="p-1 px-2.5 bg-asas-sand/50 dark:bg-white/5 border border-asas-silver/15 rounded-sm hover:border-asas-silver/30 transition-all text-xs text-asas-silver uppercase font-bold"
                >
                  Fermer
                </button>
              </div>

              {/* Specs Stack */}
              <div className="bg-asas-sand/20 dark:bg-white/5 border border-asas-silver/10 rounded-sm p-4 space-y-3 font-medium">
                <div className="flex justify-between text-xs">
                  <span className="text-asas-silver font-bold uppercase tracking-wider text-[10px]">Type de logement</span>
                  <span className="font-extrabold text-[#111] dark:text-asas-sand">{TYPE_LABELS[selectedProperty.type] || selectedProperty.type}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-asas-silver font-bold uppercase tracking-wider text-[10px]">Nombre de pièces</span>
                  <span className="font-extrabold text-[#111] dark:text-asas-sand">{selectedProperty.rooms || '---'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-asas-silver font-bold uppercase tracking-wider text-[10px]">Superficie habitable</span>
                  <span className="font-mono font-extrabold text-[#111] dark:text-asas-sand bg-black/5 dark:bg-white/5 border border-asas-silver/15 px-1.5 py-0.5 rounded-sm text-[11px]">{selectedProperty.area_sqm} m²</span>
                </div>
                <div className="flex justify-between text-xs pt-3 border-t border-asas-silver/10">
                  <span className="text-asas-silver font-bold uppercase tracking-wider text-[10px]">Prix public</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 font-mono text-sm">{(selectedProperty.list_price || 0).toLocaleString('fr-DZ')} DZD</span>
                </div>
                {selectedProperty.area_sqm && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#a09e97] font-bold uppercase tracking-widest text-[9px]">Prix au m²</span>
                    <span className="font-bold text-[#a09e97] font-mono">
                      {(selectedProperty.list_price / selectedProperty.area_sqm).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} DZD/m²
                    </span>
                  </div>
                )}
              </div>

              {/* Status Manager controls (For convenience) */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-asas-silver">Modifier État d'Inventaire</span>
                <div className="grid grid-cols-3 gap-2">
                  {['available', 'reserved', 'sold'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleQuickStatusChange(st)}
                      className={clsx(
                        "py-1.5 text-[9px] font-black uppercase tracking-wider border rounded-sm transition-all cursor-pointer text-center",
                        selectedProperty.status === st 
                          ? "bg-asas-charcoal border-asas-charcoal text-white dark:bg-white dark:border-white dark:text-[#111]" 
                          : "bg-transparent border-asas-silver/15 text-asas-silver hover:border-asas-silver/30"
                      )}
                    >
                      {st === 'available' ? 'Libre' : st === 'reserved' ? 'Option' : 'Vendu'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Share Info blocks */}
              <div className="space-y-2 pt-4 border-t border-asas-silver/10">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-asas-silver">
                  <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>Partager Fiche Commerciale</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const lineSep = "%0A"
                    const shareText = `*OFFRE PROMOTIONNELLE ASAS*${lineSep}${lineSep}Découvrez ce magnifique logement disponible immédiatement :${lineSep}• *Référence:* ${selectedProperty.reference_code || 'Lot N/A'}${lineSep}• *Type:* ${TYPE_LABELS[selectedProperty.type] || selectedProperty.type}${lineSep}• *Superficie:* ${selectedProperty.area_sqm} m²${lineSep}• *Prix de vente:* ${(selectedProperty.list_price).toLocaleString('fr-DZ')} DZD${lineSep}${lineSep}_N'hésitez pas à solliciter un conseiller pour réserver votre lot._`
                    window.open(`https://wa.me/?text=${shareText}`, '_blank')
                  }}
                  className="w-full py-2 bg-[#25D366]/10 hover:bg-[#25D366]/15 border border-[#25D366]/20 hover:border-[#25D366]/30 text-[#25D366] rounded-sm text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" /> Envoi direct WhatsApp
                </button>
              </div>

            </div>

            {/* Sticky Action Button: Initiate Booking deal */}
            <div className="pt-6 border-t border-asas-silver/10 mt-6 lg:mt-0">
              {selectedProperty.status === 'sold' ? (
                <div className="p-3 bg-neutral-100 dark:bg-neutral-900 border border-asas-silver/15 rounded-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-asas-silver shrink-0" />
                  <p className="text-[9px] uppercase font-black text-asas-silver leading-relaxed">Ce lot a déjà été livré ou acté et ne peut plus faire l'objet de nouvelles options.</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenBooking}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-600/10 active:scale-95 hover:shadow-indigo-600/20 duration-250 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Enregistrer une Réservation</span>
                </button>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Dialog Modal overlay */}
      <AnimatePresence>
        {isBookingModalOpen && selectedProperty && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-white dark:bg-[#121314] border border-asas-silver/20 rounded-sm shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-asas-silver/10 bg-[#FAF9F6] dark:bg-black/25 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-600/10 text-indigo-600 rounded-sm flex items-center justify-center border border-indigo-600/15">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-asas-navy dark:text-asas-sand">Contrat de Réservation Client</h3>
                    <p className="text-[9px] uppercase font-bold text-asas-silver mt-0.5">Associer une transaction au Lot: {selectedProperty.reference_code}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsBookingModalOpen(false)} 
                  className="p-1 px-2.5 bg-asas-sand/50 dark:bg-white/5 rounded-sm text-[10px] font-black uppercase text-asas-silver hover:text-asas-charcoal transition-colors border border-asas-silver/10 cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              {successState ? (
                /* Success prompt */
                <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/15 border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-500">
                    <Check className="w-8 h-8 stroke-[3px] animate-bounce" />
                  </div>
                  <h4 className="text-sm font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Réservation Enregistrée !</h4>
                  <p className="text-[10px] uppercase font-bold text-asas-silver max-w-sm leading-relaxed">La transaction a été initialisée et le lot de logement est désormais marqué sous statut RÉSERVÉ avec synchronisation complète de son échéancier.</p>
                </div>
              ) : (
                /* Booking wizard Form */
                <form onSubmit={handleBookingSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                  
                  {/* Client lookup toggler */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black tracking-widest text-[#a09e97]">Sélection de l'Acquéreur</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewClient(!isNewClient)
                          setSelectedClientId('')
                        }}
                        className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
                      >
                        {isNewClient ? (
                          <>
                            <Search className="w-3 h-3" />
                            <span>Chercher acquéreur existant</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" />
                            <span>Créer une fiche client</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isNewClient ? (
                      /* Create on-the-fly client inputs */
                      <div className="p-4 bg-asas-sand/20 dark:bg-white/5 border border-asas-silver/15 rounded-sm space-y-3">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-asas-silver uppercase mb-1">
                          <Sparkles className="w-3 text-indigo-500 shrink-0" />
                          <span>Fiche Rapide Nouveau Client</span>
                        </div>
                        <div className="space-y-2">
                          <label className="block">
                            <span className="text-[9px] uppercase font-extrabold text-[#A09E97]">Nom complet *</span>
                            <input
                              type="text"
                              required
                              value={newClientName}
                              onChange={(e) => setNewClientName(e.target.value)}
                              placeholder="ex: Belkacem Amrouche"
                              className="w-full mt-1 p-2 bg-white dark:bg-[#0A0A0A] border border-asas-silver/20 rounded-sm text-xs focus:outline-none focus:border-indigo-500 text-asas-charcoal dark:text-white"
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block">
                              <span className="text-[9px] uppercase font-extrabold text-[#A09E97]">Téléphone mobile</span>
                              <input
                                type="tel"
                                value={newClientPhone}
                                onChange={(e) => setNewClientPhone(e.target.value)}
                                placeholder="ex: 0550123456"
                                className="w-full mt-1 p-2 bg-white dark:bg-[#0A0A0A] border border-asas-silver/20 rounded-sm text-xs focus:outline-none focus:border-indigo-500 text-asas-charcoal dark:text-white"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[9px] uppercase font-extrabold text-[#A09E97]">Adresse Email</span>
                              <input
                                type="email"
                                value={newClientEmail}
                                onChange={(e) => setNewClientEmail(e.target.value)}
                                placeholder="ex: belkacem@gmail.com"
                                className="w-full mt-1 p-2 bg-white dark:bg-[#0A0A0A] border border-asas-silver/20 rounded-sm text-xs focus:outline-none focus:border-indigo-500 text-asas-charcoal dark:text-white"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Live search from API active files dataset */
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Rechercher par nom ou numéro..."
                            value={clientSearch}
                            onChange={(e) => {
                              setClientSearch(e.target.value)
                              if (selectedClientId) setSelectedClientId('')
                            }}
                            className="w-full p-2.5 pl-8 bg-white dark:bg-[#0a0a0a] border border-asas-silver/20 rounded-sm text-xs text-asas-charcoal dark:text-white placeholder-asas-silver focus:outline-none focus:border-indigo-500"
                          />
                          <Search className="w-4 h-4 text-asas-silver absolute left-2.5 top-3" />
                        </div>

                        {/* Search Options Dropdown Box */}
                        <div className="max-h-40 overflow-y-auto border border-asas-silver/15 rounded-sm bg-[#faf9f5] dark:bg-black/20 divide-y divide-asas-silver/10 scrollbar-thin">
                          {clientsLoading ? (
                            <div className="p-3 text-center text-xs text-asas-silver uppercase font-bold tracking-widest">Chargement des acquéreurs...</div>
                          ) : filteredClients.length === 0 ? (
                            <div className="p-3 text-center text-xs text-asas-silver">Aucun acquéreur trouvé. Activez "Créer une fiche client" ci-dessus.</div>
                          ) : (
                            filteredClients.map((client) => {
                              const isSelected = selectedClientId === client.id
                              return (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClientId(client.id)
                                    setClientSearch(client.full_name)
                                  }}
                                  className={clsx(
                                    "w-full text-left p-2.5 text-xs font-bold transition-all flex items-center justify-between shrink-0 cursor-pointer hover:bg-white dark:hover:bg-[#151618]",
                                    isSelected && "bg-indigo-600/10 text-indigo-600 border-l-2 border-indigo-600"
                                  )}
                                >
                                  <div>
                                    <p className="font-extrabold text-asas-charcoal dark:text-white">{client.full_name}</p>
                                    {client.phone && <p className="text-[10px] text-asas-silver font-medium mt-0.5">{client.phone}</p>}
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pricing Terms overriding */}
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-[9px] uppercase font-extrabold text-[#A09E97]">Prix d'accord (DZD) *</span>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          required
                          value={agreedPrice}
                          onChange={(e) => setAgreedPrice(Number(e.target.value))}
                          placeholder="ex: 14500000"
                          className="w-full p-2 bg-white dark:bg-[#0A0A0A] border border-asas-silver/20 rounded-sm text-xs font-bold font-mono focus:outline-none focus:border-indigo-500 text-asas-charcoal dark:text-white pr-10"
                        />
                        <span className="absolute right-2.5 top-2.5 text-[9px] font-black uppercase text-asas-silver select-none">DZD</span>
                      </div>
                    </label>

                    <label className="block">
                      <span className="text-[9px] uppercase font-extrabold text-[#A09E97]">Type d'accord commercial</span>
                      <select
                        value={dealType}
                        onChange={(e) => setDealType(e.target.value as any)}
                        className="w-full mt-1 p-2 bg-white dark:bg-[#0A0A0A] border border-asas-silver/20 rounded-sm text-xs font-bold focus:outline-none focus:border-indigo-500 text-asas-charcoal dark:text-white cursor-pointer"
                      >
                        <option value="sale">Vente sur Plan (VEFA)</option>
                        <option value="rental">Location Directe</option>
                        <option value="resale">Revente d'Actifs</option>
                      </select>
                    </label>
                  </div>

                  {/* Warning Notice */}
                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-sm flex gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] uppercase font-black text-indigo-600 dark:text-indigo-400">Automatisation Échéances VEFA Active</p>
                      <p className="text-[9px] text-asas-silver uppercase tracking-wider leading-relaxed mt-0.5">La soumission créera automatiquement un dossier d'acquisition (Deal) et enclenchera les relances de tranches financières sur l'espace client sous la supervision du promoteur.</p>
                    </div>
                  </div>

                  {/* Submit actions */}
                  <div className="pt-4 border-t border-asas-silver/10 flex justify-end gap-3 bg-[#FAF9F6] dark:bg-black/10 -mx-6 -mb-6 p-6">
                    <button
                      type="button"
                      onClick={() => setIsBookingModalOpen(false)}
                      className="px-4 py-2 bg-transparent text-asas-silver hover:bg-asas-silver/10 font-bold text-xs uppercase tracking-widest rounded-sm transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submittingDeal || (!selectedClientId && !isNewClient)}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white font-extrabold text-xs uppercase tracking-widest rounded-sm transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                      {submittingDeal ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Initialisation...</span>
                        </>
                      ) : (
                        <span>Enregistrer la Vente</span>
                      )}
                    </button>
                  </div>

                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
