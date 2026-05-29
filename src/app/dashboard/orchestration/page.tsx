// src/app/dashboard/orchestration/page.tsx
import { Metadata } from 'next';
import OrchestratorWorkspace from './OrchestratorWorkspace';
import { LayoutGrid } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Orchestrateur & SLAs — ASAS RE-OS',
  description: 'Enterprise automatic scheduling and operational coordination workflows',
};

export default function OrchestrationPage() {
  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-asas-charcoal dark:text-asas-sand tracking-tight flex items-center gap-3 font-display uppercase">
           <div className="w-12 h-12 rounded-sm bg-asas-navy border border-asas-gold/20 flex items-center justify-center shadow-[0_0_20px_rgba(199,161,90,0.1)]">
               <LayoutGrid className="h-6 w-6 text-asas-gold" strokeWidth={1.5} /> 
           </div>
           Moteur d'Orchestration <span className="text-asas-silver mx-2 opacity-50 font-sans font-light">|</span> مركز التحكم الأساسي
        </h1>
        <p className="text-sm font-bold text-asas-silver uppercase tracking-widest pl-1">Autopilotage opérationnel & surveillance SLA</p>
      </div>
      <OrchestratorWorkspace />
    </div>
  );
}
