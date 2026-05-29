import { Logger } from './logger';

export class ErrorTracker {
  static captureError(error: Error | unknown, metadata?: Record<string, any>) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    
    Logger.error('Application Error Captured', normalizedError, metadata);
    
    // In a full production system, we would push to Sentry/Datadog here:
    // await Sentry.captureException(normalizedError, { extra: metadata });
  }

  static captureRejection(reason: string, metadata?: Record<string, any>) {
    Logger.warn('Enforcement Rejection', { reason, ...metadata });
  }
}
