'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, Variants } from 'motion/react'
import { FileText, Download, Building2, ChevronLeft, CalendarRange, ArrowRight, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { jsPDF } from 'jspdf'

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-DZ').format(Math.round(n)) + ' DZD'
}

export default function BordereauxPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/developers/bordereaux`)
      if (res.ok) {
        const json = await res.json()
        setData(json.data || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDownload = (dev: any) => {
    const doc = new jsPDF()
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.text("BORDEREAU PROMOTEUR", 105, 20, { align: "center" })

    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`Date d'édition : ${new Date().toLocaleDateString()}`, 20, 40)
    doc.text(`Promoteur : ${dev.name}`, 20, 50)
    if (dev.email) doc.text(`Email : ${dev.email}`, 20, 60)
    if (dev.phone) doc.text(`Téléphone : ${dev.phone}`, 20, 70)

    doc.setFont("helvetica", "bold")
    doc.text("RÉCAPITULATIF FINANCIER GLOBAL", 20, 90)
    doc.setFont("helvetica", "normal")
    doc.text(`Total des Encaissements : ${fmt(dev.metrics.total_collected)}`, 20, 100)
    doc.text(`Honoraires Agence Retenus (5%) : ${fmt(dev.metrics.total_retained)}`, 20, 110)
    doc.setFont("helvetica", "bold")
    doc.text(`NET À REVERSER AU PROMOTEUR : ${fmt(dev.metrics.net_to_remit)}`, 20, 120)

    doc.text("Détail par Programme", 20, 140)
    doc.setFont("helvetica", "normal")
    
    let y = 150
    dev.projects.forEach((proj: any) => {
       if (y > 270) {
          doc.addPage()
          y = 20
       }
       doc.text(`- ${proj.name} : ${proj.sold_count} Ventes | Encaissé: ${fmt(proj.total_collected)} | Net: ${fmt(proj.net_to_developer)}`, 20, y)
       y += 10
    })

    doc.save(`Bordereau_${dev.name.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`)
  }

  return (
    <div className="w-full relative pb-12">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-asas-navy/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8 relative z-10">
        <div>
          <Link href="/dashboard/projects" className="flex items-center gap-2 text-sm font-bold text-asas-silver hover:text-gray-900 dark:hover:text-white transition-colors mb-2">
            <ChevronLeft className="w-4 h-4" /> Retour aux Programmes
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-asas-charcoal dark:text-asas-sand tracking-tight flex items-center gap-3 font-display">
            <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-indigo-500 to-purple-800 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <FileText className="h-6 w-6 text-white" strokeWidth={1.5} />
            </div>
            Bordereaux Promoteurs
          </h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest pl-1 mt-2">
            États de Vente & Reddition de Comptes
          </p>
        </div>
      </motion.div>

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.8 }}
        className="bg-white dark:bg-[#141618] border border-asas-silver/20 shadow-2xl rounded-[2.5rem] relative overflow-hidden"
      >
        <div className="bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-transparent border-b border-black/10 dark:border-white/10 p-8 relative overflow-hidden backdrop-blur-xl">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 font-display">Reddition de Comptes Promoteur</h2>
            <p className="text-sm font-medium text-asas-charcoal/80 dark:text-asas-silver leading-relaxed mb-0">
              Générez les états de reversement officiels pour chaque partenaire de promotion immobilière. 
              Les bordereaux calculent automatiquement les fonds collectés et déduisent vos honoraires de commercialisation.
            </p>
          </div>
        </div>

        <div className="p-8 bg-[#030303] min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-asas-navy dark:text-asas-sand">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-white dark:bg-[#141618] rounded-sm border border-black/5 dark:border-white/5 border-dashed">
               <Building2 className="h-10 w-10 text-white/20 mb-4" />
               <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">Aucun Promoteur Actif</p>
               <p className="text-xs uppercase tracking-widest">Connectez des promoteurs à vos projets pour voir les états</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {data.map((dev) => (
                  <motion.div key={dev.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-[#0A0A0A] rounded-3xl border border-black/5 dark:border-white/5 p-6 shadow-xl flex flex-col group">
                     <div className="flex items-start justify-between mb-6">
                        <div>
                           <h3 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                              {dev.name}
                           </h3>
                           {dev.email && <p className="text-xs text-gray-500 mt-1">{dev.email}</p>}
                        </div>
                        <button 
                           onClick={() => handleDownload(dev)}
                           className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-sm transition-colors flex items-center gap-2">
                           <Download className="w-4 h-4" /> PDF
                        </button>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white dark:bg-[#141618] rounded-sm p-4 border border-black/5 dark:border-white/5">
                           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Fonds Collectés</p>
                           <p className="text-lg font-black text-gray-900 dark:text-white">{fmt(dev.metrics.total_collected)}</p>
                        </div>
                        <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
                           <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-widest mb-1">Net à reverser</p>
                           <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{fmt(dev.metrics.net_to_remit)}</p>
                        </div>
                     </div>
                     
                     <div className="mt-auto">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 ml-1 border-b border-black/5 dark:border-white/5 pb-2">Détail par Programme</p>
                        <div className="space-y-3">
                           {dev.projects.map((proj: any) => (
                              <div key={proj.id} className="flex items-center justify-between text-sm py-2 px-3 hover:bg-asas-sand/30 dark:hover:bg-white/5 rounded-xl transition-colors">
                                 <div>
                                    <p className="font-bold text-gray-900 dark:text-gray-100">{proj.name}</p>
                                    <p className="text-xs text-gray-500">{proj.sold_count} lots vendus</p>
                                 </div>
                                 <div className="text-right">
                                    <p className="font-bold text-gray-900 dark:text-white">{fmt(proj.net_to_developer)}</p>
                                    <p className="text-[10px] text-gray-500">Net</p>
                                 </div>
                              </div>
                           ))}
                           {dev.projects.length === 0 && (
                              <p className="text-xs text-gray-500 italic px-3">Aucun programme associé.</p>
                           )}
                        </div>
                     </div>
                  </motion.div>
               ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
