'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root boundary caught:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-8 text-center bg-asas-sand dark:bg-[#141618] text-asas-charcoal dark:text-asas-sand">
      <div className="w-16 h-16 rounded-sm bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
        <AlertTriangle className="h-8 w-8 text-red-500" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-bold mb-2 uppercase tracking-widest">ASAS OS - Erreur</h2>
      <p className="text-asas-charcoal/60 dark:text-asas-silver mb-8 max-w-md text-sm leading-relaxed">
        L'interface a rencontré une anomalie lors du chargement. 
        <br/><br/>
        <span className="font-mono text-xs opacity-50">{error.message}</span>
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-6 py-3 bg-asas-navy text-asas-sand border border-asas-silver/20 rounded-sm font-bold uppercase tracking-widest text-[10px] hover:bg-black transition-colors"
        >
          Réessayer
        </button>
        <a href="/login" className="flex items-center gap-2 px-6 py-3 bg-transparent text-asas-charcoal dark:text-asas-sand border border-asas-silver/20 rounded-sm font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-colors">
          <Home className="h-4 w-4" />
          Accueil
        </a>
      </div>
    </div>
  );
}
