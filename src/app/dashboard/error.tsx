'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { ErrorTracker } from '@/lib/observability/errors';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the observability layer
    ErrorTracker.captureError(error, { context: 'DashboardErrorBoundary' });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-gray-900 rounded-sm border border-gray-800">
      <div className="w-16 h-16 rounded-sm bg-red-500/10 flex items-center justify-center mb-6">
        <AlertTriangle className="h-8 w-8 text-red-500" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-bold text-asas-charcoal dark:text-asas-sand mb-2">Something went wrong!</h2>
      <p className="text-asas-charcoal/80 dark:text-asas-silver mb-8 max-w-md">
        We encountered an error while loading this section of the dashboard. Our team has been notified.
      </p>
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-sm font-medium hover:bg-asas-sand/50 transition-colors"
      >
        <RefreshCcw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
