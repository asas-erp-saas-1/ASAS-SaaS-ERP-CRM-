import { Metadata } from 'next'
import { HardHat } from 'lucide-react'
import { SAVOverview } from '@/modules/sav/components/SAVOverview'

export const metadata: Metadata = {
  title: 'SAV & Livraisons — ASAS RE-OS',
  description: 'Gestion des remises de clés et réserves (SAV)',
}

export default function SAVPage() {
  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-asas-charcoal dark:text-asas-sand tracking-tight flex items-center gap-3 font-display uppercase">
           <div className="w-12 h-12 rounded-sm bg-asas-sand/50 dark:bg-white/5 border border-asas-silver/20 flex items-center justify-center shadow-sm">
               <HardHat className="h-6 w-6 text-asas-gold" strokeWidth={1.5} /> 
           </div>
           SAV & Livraisons
        </h1>
        <p className="text-[9px] font-bold text-asas-silver uppercase tracking-widest pl-1">Remises de Clés & Levée des réserves technique</p>
      </div>
      <SAVOverview />
    </div>
  )
}
