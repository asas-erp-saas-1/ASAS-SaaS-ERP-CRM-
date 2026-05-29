'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Layers, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Briefcase, 
  Truck, 
  Wrench, 
  Sliders, 
  CheckSquare, 
  ShieldAlert, 
  AlertTriangle,
  Compass, 
  Activity, 
  Map, 
  Plus, 
  Camera, 
  TrendingUp, 
  Lock, 
  FileText,
  User,
  MapPin,
  RefreshCw,
  Award
} from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'motion/react'

interface ConstructionEngineProps {
  projectId: string;
  projectCity: string;
}

const TYPE_LABELS: Record<string, string> = {
  f1: 'F1', f2: 'F2', f3: 'F3', f4: 'F4', f5: 'F5', villa: 'Villa', duplex: 'Duplex', commercial: 'Commerce'
}

const PHASE_STEPS = [
  { code: 'acquisition', label: 'Acquisition du Terrain' },
  { code: 'excavation', label: 'Terrassement & Excavation' },
  { code: 'foundation', label: 'Achèvement Fondations' },
  { code: 'structure', label: 'Gros Œuvre / Structure' },
  { code: 'finishing', label: 'Second Œuvre & Cloisons' },
  { code: 'delivery', label: 'Livraison & Remise des Clés' }
]

export function ConstructionEngine({ projectId, projectCity }: ConstructionEngineProps) {
  const [activeTab, setActiveTab] = useState<'phases' | 'chantiers' | 'materials' | 'digital_twin' | 'milestones'>('phases')
  
  // Data States
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [phases, setPhases] = useState<any[]>([])
  const [chantiers, setChantiers] = useState<any[]>([])
  const [selectedChantier, setSelectedChantier] = useState<any>(null)
  const [dailyLogs, setDailyLogs] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [contractors, setContractors] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [milestones, setMilestones] = useState<any[]>([])
  
  // UI Loading / Submitting Statuses
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [submittingLog, setSubmittingLog] = useState(false)
  const [submittingMilestone, setSubmittingMilestone] = useState(false)
  
  // Daily Log Form State
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split('T')[0],
    workerCount: '15',
    workCompleted: '',
    incidentsNoted: '',
    delayMinutes: '0',
    delayReason: '',
    photoUrl: 'https://picsum.photos/seed/chantier/800/600',
    gpsCoordinates: ''
  })

  // Jalon / Milestone Form State
  const [milestoneForm, setMilestoneForm] = useState({
    selectedMilestoneId: '',
    role: 'engineer',
    comment: '',
    photoUrl: 'https://picsum.photos/seed/milestone/800/600',
    gpsCoordinates: '36.7538, 3.0588'
  })

  // Material Form State
  const [consumptionForm, setConsumptionForm] = useState({
    selectedChantierId: '',
    selectedMaterialId: '',
    qty: '5'
  })

  // Fetch full dataset for the construction engine
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      const [
        statsRes,
        phasesRes,
        chantiersRes,
        materialsRes,
        suppliersRes,
        poRes,
        unitsRes,
        contractorsRes,
        assignmentsRes,
        milestonesRes
      ] = await Promise.all([
        fetch(`/api/construction?view=dashboard&projectId=${projectId}`),
        fetch(`/api/construction?view=project_phases&projectId=${projectId}`),
        fetch(`/api/construction?view=chantiers&projectId=${projectId}`),
        fetch(`/api/construction?view=materials`),
        fetch(`/api/construction?view=suppliers`),
        fetch(`/api/construction?view=purchase_orders&projectId=${projectId}`),
        fetch(`/api/construction?view=units&projectId=${projectId}`),
        fetch(`/api/construction?view=contractors`),
        fetch(`/api/construction?view=contractor_assignments&projectId=${projectId}`),
        fetch(`/api/construction?view=milestones&projectId=${projectId}`)
      ])

      if (statsRes.ok) setDashboardStats(await statsRes.json())
      if (phasesRes.ok) setPhases(await phasesRes.json())
      
      if (chantiersRes.ok) {
        const cData = await chantiersRes.json()
        setChantiers(cData)
        if (cData.length > 0) {
          setSelectedChantier(cData[0])
          setConsumptionForm(prev => ({ ...prev, selectedChantierId: cData[0].id }))
        }
      }
      
      if (materialsRes.ok) {
        const mData = await materialsRes.json()
        setMaterials(mData)
        if (mData.length > 0) {
          setConsumptionForm(prev => ({ ...prev, selectedMaterialId: mData[0].id }))
        }
      }
      
      if (suppliersRes.ok) setSuppliers(await suppliersRes.json())
      if (poRes.ok) setPurchaseOrders(await poRes.json())
      if (unitsRes.ok) setUnits(await unitsRes.json())
      if (contractorsRes.ok) setContractors(await contractorsRes.json())
      if (assignmentsRes.ok) setAssignments(await assignmentsRes.json())
      
      if (milestonesRes.ok) {
        const mList = await milestonesRes.json()
        setMilestones(mList)
        const firstPending = mList.find((m: any) => m.status === 'pending')
        if (firstPending) {
          setMilestoneForm(prev => ({ ...prev, selectedMilestoneId: firstPending.id }))
        }
      }
    } catch (err) {
      console.error('Error fetching construction data', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // Fetch daily logs when selected chantier mutations occur
  const fetchDailyLogs = useCallback(async (chantierId: string) => {
    try {
      const res = await fetch(`/api/construction?view=daily_logs&chantierId=${chantierId}`)
      if (res.ok) {
        setDailyLogs(await res.json())
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (selectedChantier) {
      fetchDailyLogs(selectedChantier.id)
    }
  }, [selectedChantier, fetchDailyLogs])

  const handleSeedDemographics = async () => {
    try {
      setSeeding(true)
      const res = await fetch('/api/construction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_demographics', projectId })
      })
      if (res.ok) {
        await fetchData()
      } else {
        alert("Une erreur s'est produite durant l'initialisation.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSeeding(false)
    }
  }

  const submitDailyLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChantier) return

    try {
      setSubmittingLog(true)
      const res = await fetch('/api/construction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_daily_log',
          chantierId: selectedChantier.id,
          date: logForm.date,
          workCompleted: logForm.workCompleted,
          incidentsNoted: logForm.incidentsNoted,
          delayMinutes: logForm.delayMinutes,
          delayReason: logForm.delayReason,
          photoUrls: [logForm.photoUrl],
          workerCount: logForm.workerCount,
          gpsCoordinates: logForm.gpsCoordinates
        })
      })

      if (res.ok) {
        setLogForm(prev => ({ ...prev, workCompleted: '', incidentsNoted: '', delayMinutes: '0', delayReason: '' }))
        await fetchDailyLogs(selectedChantier.id)
        alert('Rapport quotidien enregistré avec succès !')
      } else {
        const serverError = await res.text()
        alert(`Erreur: ${serverError}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingLog(false)
    }
  }

  const submitMilestoneValidation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!milestoneForm.selectedMilestoneId) return

    try {
      setSubmittingMilestone(true)
      const res = await fetch('/api/construction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_milestone',
          milestoneId: milestoneForm.selectedMilestoneId,
          role: milestoneForm.role,
          photoUrl: milestoneForm.photoUrl,
          comment: milestoneForm.comment,
          gpsCoordinates: milestoneForm.gpsCoordinates
        })
      })

      if (res.ok) {
        setMilestoneForm(prev => ({ ...prev, comment: '' }))
        await fetchData()
        alert('Jalon physique validé de manière immuable ! Tranche financière synchronisée.')
      } else {
         const serverError = await res.json()
         alert(`Erreur d'approbation: ${serverError.error}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingMilestone(false)
    }
  }

  const handleUnitStateChange = async (unitId: string, currentStatus: string, newStatus: string) => {
     try {
       const res = await fetch('/api/construction', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           action: 'mutate_unit_status',
           unitId,
           newStatus,
           notes: `Changement d'état de ${currentStatus} vers ${newStatus}`
         })
       })

       if (res.ok) {
         setUnits(prev => prev.map(u => u.id === unitId ? { ...u, status: newStatus } : u))
         alert('Jumeau numérique mis à jour! Statut commercial synchronisé en arrière-plan.')
       }
     } catch (err) {
       console.error(err)
     }
  }

  const handleLogConsumption = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consumptionForm.selectedChantierId || !consumptionForm.selectedMaterialId) return

    try {
       const res = await fetch('/api/construction', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           action: 'log_consumption',
           chantierId: consumptionForm.selectedChantierId,
           materialId: consumptionForm.selectedMaterialId,
           quantityUsed: consumptionForm.qty
         })
       })

       if (res.ok) {
          alert('Consommation de ressources enregistrée et déduite des stocks !')
          await fetchData()
       } else {
          const detail = await res.json()
          alert(`Erreur: ${detail.error}`)
       }
    } catch (err) {
       console.error(err)
    }
  }

  if (loading && !dashboardStats) {
    return <div className="p-12 text-center text-asas-silver animate-pulse">Chargement de l'Outil de Production de Chantier...</div>
  }

  const isColdStart = !phases || phases.length === 0

  return (
    <div className="w-full bg-[#FAFAFC] dark:bg-[#0C0D0E] border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      
      {/* Absolute layout badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black tracking-widest uppercase">
         <Sliders className="w-3.5 h-3.5 animate-spin-slow" /> ASAS Production OS
      </div>

      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-black text-asas-charcoal dark:text-asas-sand flex items-center gap-3">
           <Activity className="w-6 h-6 text-indigo-500" /> Gestion des Opérations de Chantier
        </h2>
        <p className="text-xs text-gray-500 mt-1 max-w-2xl">
           Pilotez les jalons physiques, validez les tranches de travaux prêtes à facturer, orchestrez les sous-traitants d'ETB et suivez la consommation des matériaux d'œuvre.
        </p>
      </div>

      {isColdStart ? (
        <div className="text-center py-20 bg-white dark:bg-[#121416] border border-dashed border-gray-300 dark:border-gray-800 rounded-[2rem] p-8 max-w-xl mx-auto">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Aucune Donnée d'Exécution Trouvée</h3>
          <p className="text-xs text-gray-500 mb-6">
             Ce programme n'a pas encore de jalons, de jumeaux d'appartements numérisés, de stocks de matériaux ou de chantiers déclarés dans la base.
          </p>
          <button
             onClick={handleSeedDemographics}
             disabled={seeding}
             className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20"
          >
             {seeding ? 'Initialisation...' : 'Initialiser l\'Écosystème Chantier'}
          </button>
        </div>
      ) : (
        <div>
          {/* Layer Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white dark:bg-[#121416] border border-black/5 dark:border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-widest font-black text-gray-400">Jumeaux Digitaux</span>
              <p className="text-2xl font-black text-asas-charcoal dark:text-asas-sand mt-2">{dashboardStats?.totalUnits || 0}</p>
              <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1">
                 <CheckCircle className="w-3.5 h-3.5" /> Synchronisé CRM
              </p>
            </div>
            <div className="bg-white dark:bg-[#121416] border border-black/5 dark:border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-widest font-black text-gray-400">Chantiers Actifs</span>
              <p className="text-2xl font-black text-indigo-500 mt-2">{dashboardStats?.activeChantiers || 0}</p>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Secteur: {projectCity}</p>
            </div>
            <div className="bg-white dark:bg-[#121416] border border-black/5 dark:border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-widest font-black text-gray-400">Jalons Validés</span>
              <p className="text-2xl font-black text-amber-500 mt-2">
                 {dashboardStats?.milestonesValidated || 0} / {dashboardStats?.milestonesTotal || 0}
              </p>
              <p className="text-[10px] text-amber-600 font-bold mt-1">En attente d'ingénieur</p>
            </div>
            <div className="bg-white dark:bg-[#121416] border border-black/5 dark:border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-widest font-black text-gray-400">Ressources Matériaux</span>
              <p className="text-2xl font-black text-asas-charcoal dark:text-asas-sand mt-2">3 Types</p>
              <p className="text-[10px] text-emerald-500 font-bold mt-1">Lafarge Certifié</p>
            </div>
            <div className="hidden lg:flex bg-white dark:bg-[#121416] border border-black/5 dark:border-white/5 p-4 rounded-2xl flex-col justify-between">
              <span className="text-[9px] uppercase tracking-widest font-black text-gray-400">Sécurité Audit</span>
              <p className="text-lg font-mono font-black text-emerald-500 mt-2">SHA-256</p>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Trace de conformité</p>
            </div>
          </div>

          {/* Tab Button Bar */}
          <div className="flex flex-wrap border-b border-black/5 dark:border-white/5 gap-2 mb-8">
             <button
                onClick={() => setActiveTab('phases')}
                className={clsx("px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all", activeTab === 'phases' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white')}
             >
                Phase Projet ({phases.length})
             </button>
             <button
                onClick={() => setActiveTab('chantiers')}
                className={clsx("px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all", activeTab === 'chantiers' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white')}
             >
                Supervisor Log & Incidents
             </button>
             <button
                onClick={() => setActiveTab('milestones')}
                className={clsx("px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all", activeTab === 'milestones' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white')}
             >
                Jalons & Déblocages VEFA
             </button>
             <button
                onClick={() => setActiveTab('digital_twin')}
                className={clsx("px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all", activeTab === 'digital_twin' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white')}
             >
                Grille Jumeau Numérique (Unités)
             </button>
             <button
                onClick={() => setActiveTab('materials')}
                className={clsx("px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all", activeTab === 'materials' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white')}
             >
                Matériaux & Logistique
             </button>
          </div>

          {/* Main Visual Panels */}
          <AnimatePresence mode="wait">
            
            {/* 1. Project Phases & Timeline */}
            {activeTab === 'phases' && (
              <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="space-y-6"
              >
                 <div className="bg-white dark:bg-[#121416] border border-black/5 dark:border-white/5 p-6 rounded-2xl">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#242A30] dark:text-gray-400 mb-6">Cycle de Vie & Étapes Réglementaires</h3>
                    
                    <div className="relative pl-8 border-l border-indigo-500/20 space-y-8">
                       {phases.map((ph, idx) => {
                          const matchedCfg = PHASE_STEPS.find(cfg => cfg.code === ph.phase_code)
                          const label = ph.phase_name || matchedCfg?.label || ph.phase_code
                          
                          return (
                            <div key={ph.id} className="relative">
                               {/* Dot indicator */}
                               <div className={clsx(
                                 "absolute -left-[41px] top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black shadow-md",
                                 ph.status === 'completed' ? 'bg-emerald-500 border-emerald-600 text-white' : 
                                 ph.status === 'in_progress' ? 'bg-indigo-600 border-indigo-700 text-white' : 
                                 'bg-white dark:bg-black border-gray-300 text-gray-400'
                               )}>
                                  {ph.status === 'completed' ? '✓' : idx + 1}
                               </div>

                               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div>
                                     <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        {label}
                                        {ph.status === 'in_progress' && <span className="text-[9px] uppercase font-bold tracking-widest bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded">En cours</span>}
                                        {ph.status === 'completed' && <span className="text-[9px] uppercase font-bold tracking-widest bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">Achevé</span>}
                                     </h4>
                                     <p className="text-xs text-gray-500 mt-0.5">Faux de début: {ph.start_date || 'Début de phase indéterminé'}</p>
                                  </div>

                                  <div className="flex items-center gap-3">
                                     {ph.approval_status === 'approved' ? (
                                       <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-500/5 px-3 py-1.5 rounded-xl border border-emerald-500/10 shadow-sm">
                                          <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
                                          <span>Approuvé par Ingénierie</span>
                                       </div>
                                     ) : (
                                       <div className="flex items-center gap-2 text-xs text-amber-600 font-bold bg-amber-500/5 px-3 py-1.5 rounded-xl border border-amber-500/10 shadow-sm">
                                          <Clock className="w-4 h-4 text-amber-500" />
                                          <span>Vérification requise</span>
                                       </div>
                                     )}
                                  </div>
                               </div>
                            </div>
                          )
                       })}
                    </div>
                 </div>
              </motion.div>
            )}

            {/* 2. Supervisor Log & Incidents */}
            {activeTab === 'chantiers' && (
              <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                 {/* Left Column Form */}
                 <div className="lg:col-span-1 space-y-6">
                    <form onSubmit={submitDailyLog} className="bg-white dark:bg-[#121416] border border-black/5 dark:border-white/5 p-6 rounded-2xl">
                       <h3 className="text-sm font-black uppercase tracking-widest text-[#242A30] dark:text-gray-400 mb-6 flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-indigo-500" /> Enregistrer un Rapport
                       </h3>
                       
                       <div className="space-y-4">
                          <div>
                             <label className="block text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1">Date</label>
                             <input 
                                type="date" 
                                value={logForm.date} 
                                onChange={e => setLogForm({ ...logForm, date: e.target.value })}
                                className="w-full bg-[#FAFAFC] dark:bg-[#0C0D0E] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                                required
                             />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="block text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1">Effectifs (Ouvriers)</label>
                                <input 
                                   type="number" 
                                   value={logForm.workerCount}
                                   onChange={e => setLogForm({ ...logForm, workerCount: e.target.value })}
                                   className="w-full bg-[#FAFAFC] dark:bg-[#0C0D0E] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                                   required
                                />
                             </div>
                             <div>
                                <label className="block text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1">Retard (Minutes)</label>
                                <input 
                                   type="number" 
                                   value={logForm.delayMinutes}
                                   onChange={e => setLogForm({ ...logForm, delayMinutes: e.target.value })}
                                   className="w-full bg-[#FAFAFC] dark:bg-[#0C0D0E] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                                   required
                                />
                             </div>
                          </div>

                          {Number(logForm.delayMinutes) > 0 && (
                            <div>
                               <label className="block text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1">Raison du Retard (Algerian Fields)</label>
                               <input 
                                  type="text" 
                                  placeholder="Ex: Ciment en attente port d'Alger / coupure électricité"
                                  value={logForm.delayReason}
                                  onChange={e => setLogForm({ ...logForm, delayReason: e.target.value })}
                                  className="w-full bg-[#FAFAFC] dark:bg-[#0C0D0E] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                               />
                            </div>
                          )}

                          <div>
                             <label className="block text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1">Travaux Complétés</label>
                             <textarea 
                                value={logForm.workCompleted} 
                                onChange={e => setLogForm({ ...logForm, workCompleted: e.target.value })}
                                placeholder="Coulage de la dalle pour le bloc B, montage briques premier étage."
                                rows={3}
                                className="w-full bg-[#FAFAFC] dark:bg-[#0C0D0E] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                                required
                             />
                          </div>

                          <div>
                             <label className="block text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1">Incidents Notés / Météo</label>
                             <input 
                                type="text" 
                                placeholder="Ex: Pluie forte ralentissant le coulage"
                                value={logForm.incidentsNoted}
                                onChange={e => setLogForm({ ...logForm, incidentsNoted: e.target.value })}
                                className="w-full bg-[#FAFAFC] dark:bg-[#0C0D0E] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                             />
                          </div>

                          <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                             <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 mb-1">
                                <Camera className="w-4 h-4" /> Preuve Photographique Imposée
                             </div>
                             <p className="text-[9px] text-gray-500 mb-2">Simulateur de capture mobile sur site (GPS & Heure inclus)</p>
                             <input 
                                type="text" 
                                value={logForm.photoUrl} 
                                onChange={e => setLogForm({ ...logForm, photoUrl: e.target.value })}
                                className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg p-2 text-[10px] font-mono"
                             />
                          </div>

                          <button
                             type="submit"
                             disabled={submittingLog}
                             className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-600/15"
                          >
                             {submittingLog ? 'Enregistrement...' : 'Valider Rapport de Site'}
                          </button>
                       </div>
                    </form>
                 </div>

                 {/* Right Column List */}
                 <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#121416] border border-black/5 dark:border-white/5 p-6 rounded-2xl">
                       <h3 className="text-sm font-black uppercase tracking-widest text-[#242A30] dark:text-gray-400 mb-6 flex items-center justify-between">
                          <span>Journal des Activités de Chantier</span>
                          <span className="text-[10px] font-bold bg-[#FAFAFC] dark:bg-black/20 border border-black/5 dark:border-white/5 px-2 py-0.5 rounded-sm text-gray-500">Immuable (sys_audit_vault)</span>
                       </h3>

                       {dailyLogs.length === 0 ? (
                         <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 dark:border-gray-800 rounded-xl">
                            Aucun journal quotidien enregistré pour ce chantier. Remplissez le formulaire à gauche pour commencer !
                         </div>
                       ) : (
                         <div className="space-y-4">
                            {dailyLogs.map((log) => (
                              <div key={log.id} className="p-4 border border-black/5 dark:border-white/5 dark:bg-[#0C0D0E]/40 rounded-xl space-y-3">
                                 <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                       <CalendarIcon className="w-4 h-4 text-indigo-500" />
                                       <span className="text-xs font-black text-gray-900 dark:text-white">{log.date}</span>
                                       <span className="text-[9px] font-mono text-gray-400">({log.worker_count} ouvriers)</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                       {log.delay_minutes > 0 ? (
                                         <span className="flex items-center gap-1 text-[9px] font-black uppercase text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                                            <AlertTriangle className="w-3 h-3" /> RETARD {log.delay_minutes} min
                                         </span>
                                       ) : (
                                         <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                            A l'heure
                                         </span>
                                       )}
                                    </div>
                                 </div>

                                 <div className="text-xs text-gray-700 dark:text-gray-300 bg-[#FAFAFC] dark:bg-black/30 p-3 rounded-lg border border-black/5 dark:border-white/5">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{log.work_completed}</p>
                                    {log.delay_reason && (
                                      <p className="text-[10px] font-bold text-amber-500 mt-2 flex items-center gap-1.5 border-t border-black/5 dark:border-white/5 pt-2">
                                         <ShieldAlert className="w-3.5 h-3.5" /> Cause Retard: {log.delay_reason}
                                      </p>
                                    )}
                                    {log.incidents_noted && (
                                      <p className="text-[10px] text-red-500 mt-1">
                                         Incident: {log.incidents_noted}
                                      </p>
                                    )}
                                 </div>

                                 {/* Mock photographic proof layout */}
                                 {log.photo_urls?.[0] && (
                                   <div className="flex gap-2 items-center text-[10px] text-gray-500 mt-2">
                                      <Camera className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">Preuve Photo:</span>
                                      <a href={log.photo_urls[0]} target="_blank" rel="noopener noreferrer" className="text-indigo-500 font-mono underline hover:text-indigo-600 truncate">
                                         {log.photo_urls[0]}
                                      </a>
                                   </div>
                                 )}
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                 </div>
              </motion.div>
            )}

            {/* 3. Milestones & Financial Tranche release */}
            {activeTab === 'milestones' && (
              <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                 {/* Left Verification Form */}
                 <div className="lg:col-span-1 space-y-6">
                    <form onSubmit={submitMilestoneValidation} className="bg-white dark:bg-[#121416] border border-black/5 dark:border-white/5 p-6 rounded-2xl space-y-4">
                       <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-[#242A30] dark:text-gray-400 mb-2 flex items-center gap-2">
                             <Award className="w-4.5 h-4.5 text-indigo-500" /> Validation Technique
                          </h3>
                          <p className="text-[10px] text-gray-500">
                             L'ingénieur technique ou le directeur de chantier certifie la conformité du coulage de béton ou des fondations.
                          </p>
                       </div>

                       <div>
                          <label className="block text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1">Jalon Physique à Valider</label>
                          <select 
                             value={milestoneForm.selectedMilestoneId}
                             onChange={e => setMilestoneForm({ ...milestoneForm, selectedMilestoneId: e.target.value })}
                             className="w-full bg-[#FAFAFC] dark:bg-[#0C0D0E] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                             required
                          >
                             <option value="">-- Sélectionnez un jalon actif --</option>
                             {milestones.filter(m => m.status !== 'validated').map(m => (
                               <option key={m.id} value={m.id}>{m.title} ({m.percentage_unlock}% - {m.status})</option>
                             ))}
                          </select>
                       </div>

                       <div>
                          <label className="block text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1">Rôle Signataire</label>
                          <select 
                             value={milestoneForm.role}
                             onChange={e => setMilestoneForm({ ...milestoneForm, role: e.target.value })}
                             className="w-full bg-[#FAFAFC] dark:bg-[#0C0D0E] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                             required
                          >
                             <option value="engineer">Ingénieur Contrôle Qualité</option>
                             <option value="chantier_director">Directeur de Chantier SPA</option>
                             <option value="branch_manager">Directeur de Succursale</option>
                          </select>
                       </div>

                       <div>
                          <label className="block text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1">Commentaires de Conformité Audit</label>
                          <textarea 
                             rows={3}
                             placeholder="Ex: Épaisseur de dalle certifiée conforme au dossier d'EDD. Photos jointes au dossier."
                             value={milestoneForm.comment}
                             onChange={e => setMilestoneForm({ ...milestoneForm, comment: e.target.value })}
                             className="w-full bg-[#FAFAFC] dark:bg-[#0C0D0E] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                             required
                          />
                       </div>

                       <div>
                          <label className="block text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1">Preuve Photographique (Obligatoire)</label>
                          <input 
                             type="text" 
                             value={milestoneForm.photoUrl}
                             onChange={e => setMilestoneForm({ ...milestoneForm, photoUrl: e.target.value })}
                             className="w-full bg-[#FAFAFC] dark:bg-[#0C0D0E] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-gray-800 dark:text-white mb-2"
                             required
                          />
                       </div>

                       <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                          <p className="text-[10px] font-black text-amber-600 flex items-center gap-1.5">
                             <TrendingUp className="w-3.5 h-3.5" /> IMPACT OPÉRATIONNEL & FINANCIER
                          </p>
                          <p className="text-[9px] text-gray-600">
                             La validation de ce jalon va immuablement débloquer l'appel de fonds (VEFA) correspondant ET générer les ordres d'achat / factures payables pour les sous-traitants.
                          </p>
                       </div>

                       <button
                          type="submit"
                          disabled={submittingMilestone || !milestoneForm.selectedMilestoneId}
                          className="w-full py-3 bg-[#1B2127] hover:bg-[#252C34] dark:bg-white dark:hover:bg-gray-100 dark:text-black disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md"
                       >
                          {submittingMilestone ? 'Signature...' : 'Signer & Libérer Paiement'}
                       </button>
                    </form>
                 </div>

                 {/* Right Milestone Status Track */}
                 <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#121416] border border-black/5 dark:border-white/5 p-6 rounded-2xl">
                       <h3 className="text-sm font-black uppercase tracking-widest text-[#242A30] dark:text-gray-400 mb-6 flex items-center justify-between">
                          <span>Jalons Physiques & Déblocages Tranches</span>
                          <span className="text-[9px] font-bold text-indigo-500 uppercase">Synchronisé Phase E</span>
                       </h3>

                       <div className="space-y-4">
                          {milestones.map((m, idx) => (
                            <div key={m.id} className={clsx("p-4 border rounded-xl flex items-center justify-between transition-all", m.status === 'validated' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#FAFAFC] dark:bg-black/20 border-black/5 dark:border-white/5')}>
                               <div className="flex items-center gap-3">
                                  <div className={clsx(
                                    "w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-xs",
                                    m.status === 'validated' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-gray-200 dark:bg-white/5 border-transparent text-gray-500'
                                  )}>
                                     {m.status === 'validated' ? '✓' : `${m.percentage_unlock}%`}
                                  </div>
                                  <div>
                                     <p className={clsx("text-xs font-black", m.status === 'validated' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white')}>{m.title}</p>
                                     <p className="text-[9px] text-gray-500 font-mono mt-0.5">Pourcentage: {m.percentage_unlock}% • Statut: {m.status}</p>
                                  </div>
                               </div>

                               <div className="text-right">
                                  {m.status === 'validated' ? (
                                    <span className="inline-flex items-center gap-1.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded">
                                       FINANCEMENT LIBÉRÉ
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-gray-400 bg-gray-400/10 border border-transparent px-2.5 py-1 rounded">
                                       Bloqué / Hors d'eau
                                    </span>
                                  )}
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {/* 4. Digital Twin Map (Units Grid) */}
            {activeTab === 'digital_twin' && (
              <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="space-y-6"
              >
                 <div className="bg-white dark:bg-[#121416] border border-black/5 dark:border-white/5 p-6 rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                       <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-[#242A30] dark:text-gray-400 flex items-center gap-2">
                             <Compass className="w-5 h-5 text-indigo-500" /> Jumeaux Numériques d'Appartements (Lots)
                          </h3>
                          <p className="text-[10px] text-gray-500 mt-1">Sert de table de vérité unique pour les départements Financement, Ventes et Exécution.</p>
                       </div>

                       {/* Mini statuses guide */}
                       <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded">Chantier</span>
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded">Dispo Vente</span>
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded">Réservé</span>
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase bg-[#141516]/50 border border-black/10 text-gray-400 rounded">Vendu</span>
                       </div>
                    </div>

                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl mb-8 text-[11px] text-gray-500">
                       <span className="font-bold text-indigo-600 block mb-1">AUTOMATION INTER-SERVICES</span>
                       Lorsque vous changez l'état d'un appartement depuis ce tableau (par exemple vers **Disponible pour Vente** ou **Livré**), le module commercial de commercialisation (`properties`) répercute instantanément le changement de statut en base pour la commercialisation active.
                    </div>

                    {/* Floor & Block Grid of Units */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {['Bloc A', 'Bloc B'].map((blockName) => {
                          const blockUnits = units.filter(u => u.block === blockName || (!u.block && blockName === 'Bloc A'))
                          if (blockUnits.length === 0) return null;

                          return (
                            <div key={blockName} className="space-y-4">
                               <h4 className="font-black text-gray-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2 uppercase tracking-wide flex items-center gap-2">
                                  <Map className="w-4.5 h-4.5 text-indigo-500" /> {blockName}
                               </h4>

                               <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {blockUnits.map(unit => (
                                    <div key={unit.id} className="p-3 border border-black/5 dark:border-white/5 bg-[#FAFAFC] dark:bg-black/30 rounded-xl flex flex-col justify-between hover:border-indigo-500/20 transition-all group">
                                       <div className="flex justify-between items-start">
                                          <span className="text-[9px] font-mono font-black text-gray-400 bg-white dark:bg-[#121416] px-1.5 py-0.5 border border-black/5 dark:border-white/5 rounded-sm uppercase">{unit.type}</span>
                                          <span className="text-[9px] font-bold text-gray-400">Étage {unit.floor}</span>
                                       </div>

                                       <p className="font-black text-xs text-gray-900 dark:text-gray-100 mt-2 truncate">{unit.reference_code}</p>
                                       <p className="text-[9px] text-gray-400 mb-4">{unit.surface_area} m² · F3 standard</p>

                                       {/* Mobile-style Selector status button direct mock */}
                                       <div className="relative isolate" onClick={(e) => e.stopPropagation()}>
                                          <select
                                            value={unit.status}
                                            onChange={(e) => handleUnitStateChange(unit.id, unit.status, e.target.value)}
                                            className={clsx(
                                              "appearance-none block w-full border text-[9px] uppercase tracking-widest font-bold py-1.5 pl-2 pr-5 rounded focus:outline-none cursor-pointer",
                                              unit.status === 'under_construction' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600' :
                                              unit.status === 'available_for_sale' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                                              unit.status === 'reserved' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                                              'bg-black/5 border-black/10 text-gray-500 dark:text-gray-400'
                                            )}
                                          >
                                            <option value="under_construction">Chantier</option>
                                            <option value="completed">Achevé</option>
                                            <option value="available_for_sale">Dispo Vente</option>
                                            <option value="reserved">Réservé</option>
                                            <option value="sold">Vendu</option>
                                            <option value="delivered">Livré</option>
                                          </select>
                                          <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-gray-500">
                                            <svg className="fill-current h-2.5 w-2.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615l-4.695 4.502c-0.268 0.268-0.707 0.268-0.975 0l-4.695-4.502c-0.408-0.418-0.436-1.17 0-1.615z"/></svg>
                                          </div>
                                       </div>
                                    </div>
                                  ))}
                               </div>
                            </div>
                          )
                       })}
                    </div>
                 </div>
              </motion.div>
            )}

            {/* 5. Material Inventory & Procurement */}
            {activeTab === 'materials' && (
              <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                 {/* Left Materials inventory list */}
                 <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#121416] border border-black/5 dark:border-white/5 p-6 rounded-2xl">
                       <h3 className="text-sm font-black uppercase tracking-widest text-[#242A30] dark:text-gray-400 mb-6 flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-indigo-500" /> Stocks Chantier Lafarge Certifiés
                       </h3>

                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                          {materials.map(m => {
                             const isLow = Number(m.stock_quantity) <= Number(m.min_threshold)
                             return (
                               <div key={m.id} className={clsx("p-4 border rounded-xl relative", isLow ? 'bg-red-500/5 border-red-500/20' : 'bg-[#FAFAFC] dark:bg-black/20 border-black/5 dark:border-white/5')}>
                                  <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500">MOTEUR LOGISTIQUE</span>
                                  <h4 className="font-extrabold text-xs text-gray-900 dark:text-white mt-1.5 truncate">{m.name}</h4>
                                  
                                  <div className="flex items-baseline gap-1 mt-4">
                                     <p className="text-xl font-black text-gray-900 dark:text-white">{m.stock_quantity}</p>
                                     <p className="text-xs text-gray-400">/{m.unit_of_measure}</p>
                                  </div>

                                  <p className="text-[10px] text-gray-400 mt-2 font-mono">Coût unitaire: {m.unit_cost} DZD</p>

                                  {isLow && (
                                    <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[8px] font-black uppercase text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 animate-pulse">
                                       <AlertTriangle className="w-3 h-3" /> ALERTE RUPTURE
                                    </span>
                                  )}
                               </div>
                             )
                          })}
                       </div>

                       <h3 className="text-sm font-black uppercase tracking-widest text-[#242A30] dark:text-gray-400 mb-4 flex items-center gap-2">
                          <Truck className="w-4.5 h-4.5 text-indigo-500" /> Bons de Commande & Approvisionnements (PO)
                       </h3>

                       {purchaseOrders.length === 0 ? (
                         <div className="text-center py-6 text-gray-500 border border-dashed border-gray-300 dark:border-gray-800 rounded-xl">Aucun bon de commande n'a été émis.</div>
                       ) : (
                         <div className="space-y-3">
                            {purchaseOrders.map((po) => (
                              <div key={po.id} className="p-3 border border-black/5 dark:border-white/5 bg-[#FAFAFC] dark:bg-black/30 rounded-xl flex items-center justify-between">
                                 <div>
                                    <p className="text-xs font-black text-gray-900 dark:text-white">{po.title}</p>
                                    <p className="text-[9px] text-gray-400 mt-0.5">Montant: {new Intl.NumberFormat('fr-DZ').format(po.total_amount)} DZD • TVA 19%: Included</p>
                                 </div>
                                 <div className="flex gap-2">
                                    <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-2.5 py-1 rounded">
                                       {po.status}
                                    </span>
                                    <span className="text-[8px] font-black uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-600 px-2.5 py-1 rounded">
                                       {po.payment_status}
                                    </span>
                                 </div>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                 </div>

                 {/* Right Materials logger column */}
                 <div className="lg:col-span-1 space-y-6">
                    <form onSubmit={handleLogConsumption} className="bg-white dark:bg-[#121416] border border-black/5 dark:border-white/5 p-6 rounded-2xl space-y-4">
                       <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-[#242A30] dark:text-gray-400 mb-2 flex items-center gap-2">
                             <Wrench className="w-4 h-4 text-indigo-500" /> Saisie de Consommation
                          </h3>
                          <p className="text-[10px] text-gray-500">
                             Permet aux chefs de chantier de déduire en temps réel les sacs de ciment ou briques consommés de l'inventaire.
                          </p>
                       </div>

                       <div>
                          <label className="block text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1">Stock de Ressource</label>
                          <select 
                             value={consumptionForm.selectedMaterialId}
                             onChange={e => setConsumptionForm({ ...consumptionForm, selectedMaterialId: e.target.value })}
                             className="w-full bg-[#FAFAFC] dark:bg-[#0C0D0E] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                             required
                          >
                             {materials.map(m => (
                               <option key={m.id} value={m.id}>{m.name} (Dispo: {m.stock_quantity})</option>
                             ))}
                          </select>
                       </div>

                       <div>
                          <label className="block text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1">Quantité Consommée</label>
                          <input 
                             type="number" 
                             value={consumptionForm.qty}
                             onChange={e => setConsumptionForm({ ...consumptionForm, qty: e.target.value })}
                             className="w-full bg-[#FAFAFC] dark:bg-[#0C0D0E] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                             required
                          />
                       </div>

                       <button
                          type="submit"
                          className="w-full py-3 bg-[#1B2127] hover:bg-[#252C34] text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md"
                       >
                          Enregistrer la Sortie
                       </button>
                    </form>
                 </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function ShieldCheckIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function CalendarIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}
