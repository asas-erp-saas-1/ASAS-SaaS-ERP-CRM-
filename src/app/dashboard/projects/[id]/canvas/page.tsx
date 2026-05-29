import { Metadata } from 'next'
import { InteractiveCanvas } from '@/modules/projects/components/InteractiveCanvas'
import { Building2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Plan Interactif — ASAS RE-OS',
  description: 'Canvas temps-réel du plan de masse',
}

export default async function ProjectCanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="w-full flex flex-col h-[calc(100vh-80px)]">
      <div className="flex items-center gap-4 mb-4 shrink-0">
         <Link href={`/dashboard/projects/${id}`} className="p-2 bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm hover:bg-white dark:hover:bg-[#141618] transition-colors">
            <ArrowLeft className="w-5 h-5 text-asas-silver" />
         </Link>
         <div>
            <h1 className="text-xl font-extrabold text-asas-charcoal dark:text-asas-sand tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-500" /> Plan de Masse / Stacking Plan
            </h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Maquette Interactive</p>
         </div>
      </div>
      
      <div className="flex-1 bg-asas-sand/30 dark:bg-[#141618] rounded-sm border border-black/5 dark:border-white/5 overflow-hidden relative shadow-inner">
         <InteractiveCanvas projectId={id} />
      </div>
    </div>
  )
}
