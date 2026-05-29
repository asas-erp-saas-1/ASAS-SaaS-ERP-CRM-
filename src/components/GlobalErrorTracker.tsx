'use client';

import { useEffect } from 'react';
import { ErrorTracker } from '@/lib/observability/errors';

export function GlobalErrorTracker() {
  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registration successful with scope: ', registration.scope);
          })
          .catch((err) => {
            console.log('SW registration failed: ', err);
          });
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      ErrorTracker.captureError(event.error || new Error(event.message), {
        context: 'GlobalWindowUnhandledError',
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      ErrorTracker.captureError(event.reason, {
        context: 'GlobalUnhandledRejection',
      });
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
