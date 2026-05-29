'use client';

import Link from 'next/link';
import { ArrowRight, Building2, Workflow, BarChart3, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export function LandingContent() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#141618] text-asas-charcoal dark:text-asas-sand overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-asas-navy/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none -z-10"></div>

      {/* Navigation */}
      <header className="fixed top-0 inset-x-0 z-50 bg-asas-sand/30 dark:bg-[#050505]/80 backdrop-blur-xl border-b border-asas-silver/20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              <Building2 className="w-5 h-5 text-gray-900 dark:text-white" />
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight">ASAS<span className="text-asas-navy dark:text-asas-sand">.</span></span>
          </div>
          <div className="flex items-center gap-6 text-sm font-bold">
            <Link href="#features" className="text-asas-charcoal/80 dark:text-asas-silver hover:text-gray-900 dark:text-white transition-colors">Fonctionnalités</Link>
            <Link href="/dashboard" className="hidden sm:flex px-5 py-2.5 bg-white text-black hover:bg-gray-200 rounded-full transition-all tracking-wide items-center gap-2 group">
              Ouvrir l'OS <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8"
          >
            <Zap className="w-3.5 h-3.5" />
            Nouvelle génération d'ERP Immobilier
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-8 font-display max-w-4xl"
          >
            Le premier véritable <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Système d'Exploitation</span> Immobilier.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-gray-600 dark:text-gray-400 font-medium max-w-2xl mb-12"
          >
            ASAS unifie votre agence : CRM, gestion de pipeline, rapprochement bancaire, et génération de leads dans une interface d’une rapidité chirurgicale.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 bg-white text-black hover:bg-gray-200 rounded-full transition-all text-sm font-extrabold flex items-center justify-center gap-2 group shadow-[0_0_30px_rgba(255,255,255,0.15)]">
              Initialiser ASAS <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="#features" className="w-full sm:w-auto px-8 py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white rounded-full transition-all text-sm font-extrabold flex items-center justify-center gap-2">
              Explorer l'architecture
            </Link>
          </motion.div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-black/5 dark:border-white/5 relative">
           <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-display mb-4">Architecture modulaire.</h2>
              <p className="text-gray-600 dark:text-gray-400 font-medium max-w-xl mx-auto">Chaque module est conçu pour fonctionner en parfaite synchronicité avec le reste du système.</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard 
                icon={<Building2 className="w-6 h-6 text-blue-400" />}
                title="Gestion de Propriétés"
                description="Inventaire en temps réel, suivi de disponibilité et cycle de vie complet de chaque actif immobilier."
              />
              <FeatureCard 
                icon={<Workflow className="w-6 h-6 text-emerald-400" />}
                title="CRM & Pipeline"
                description="Acquisition, tracking et conversion des leads via un pipeline ultra-fluide et prédictif."
              />
              <FeatureCard 
                icon={<BarChart3 className="w-6 h-6 text-indigo-400" />}
                title="Analyses Financières"
                description="Rapprochement direct, prévisions de trésorerie et tableaux de bord analytiques complexes."
              />
           </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white dark:bg-[#141618] border border-black/5 dark:border-white/5 p-8 rounded-[2rem] hover:border-black/10 dark:border-white/10 transition-all hover:-translate-y-1 group">
      <div className="w-14 h-14 rounded-sm bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold tracking-tight mb-3">{title}</h3>
      <p className="text-sm text-asas-silver font-medium leading-relaxed">{description}</p>
    </div>
  )
}
