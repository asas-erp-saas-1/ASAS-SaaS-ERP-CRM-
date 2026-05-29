import { Metadata } from 'next'
import IntelligenceWorkspace from './IntelligenceWorkspace'
import { Award } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Décisions & Prévisions — ASAS RE-OS',
  description: 'Moteur d\'intelligence prévisionnelle et d\'aide à la décision stratégique',
}

export default function IntelligencePage() {
  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-asas-charcoal dark:text-asas-sand tracking-tight flex items-center gap-3 font-display uppercase">
          <div className="w-12 h-12 rounded-sm bg-asas-sand/50 dark:bg-white/5 border border-asas-silver/20 flex items-center justify-center shadow-sm">
            <Award className="h-6 w-6 text-asas-gold" strokeWidth={1.5} /> 
          </div>
          Décisions & Prévisions
        </h1>
        <p className="text-[9px] font-bold text-asas-silver uppercase tracking-widest pl-1">
          Moteur Prévisionnel & Pilotage Financier de l'Entreprise de Promotion Immobilière
        </p>
      </div>

      <IntelligenceWorkspace />
    </div>
  )
}
