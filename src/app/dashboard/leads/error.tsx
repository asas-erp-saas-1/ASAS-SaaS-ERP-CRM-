'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { ErrorTracker } from '@/lib/observability/errors';

export default function LeadsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    ErrorTracker.captureError(error, { context: 'Leads Error Boundary' });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#141618] border border-red-500/10 rounded-sm max-w-xl mx-auto mt-12 w-full text-center">
      <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-asas-charcoal dark:text-asas-sand mb-2">Erreur Pipeline Leads</h2>
      <p className="text-sm text-asas-charcoal/80 dark:text-asas-silver mb-8 max-w-md">
        Un problème est survenu lors du chargement du module des leads. {error.message}
      </p>
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-sm hover:bg-gray-200 transition-colors shadow-lg"
      >
        <RefreshCcw className="w-4 h-4" /> Réessayer
      </button>
    </div>
  );
}
