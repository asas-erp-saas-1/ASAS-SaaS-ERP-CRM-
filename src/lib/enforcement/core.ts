import { IKernel, KernelIdentity } from '../kernel/core';
import { QueryInterceptor } from './query-interceptor';
import { RuntimeGuard } from './runtime-guard';
import { Logger } from '../observability/logger';
import { Metrics } from '../observability/metrics';
import { ErrorTracker } from '../observability/errors';
import { RateLimiter } from '../scaling/rate-limiter';

export function enforceExecution(kernelCore: IKernel): IKernel {
  return {
    identity: async (): Promise<KernelIdentity> => {
      try {
        const id = await kernelCore.identity();
        if (!id || !id.tenantId) {
          RuntimeGuard.triggerViolation('Identity engine failed to provide secure tenant context.');
        }
        return id;
      } catch (error) {
        ErrorTracker.captureError(error, { context: 'kernel.identity' });
        throw error;
      }
    },

    query: async <T>(tableName: string, options?: any): Promise<T[]> => {
      RuntimeGuard.assertKernelExecution();
      
      const start = Date.now();
      try {
        const identity = await kernelCore.identity();
        
        // Rate limiting logic
        const isAllowed = await RateLimiter.checkLimit(identity.tenantId, `db_read_${tableName}`, 500, 60);
        if (!isAllowed) {
          throw new Error('RATE_LIMIT_EXCEEDED');
        }

        const safeOptions = QueryInterceptor.interceptRead(tableName, options, identity);
        
        Logger.info(`Executing Kernel Query`, { tenantId: identity.tenantId, userId: identity.userId, table: tableName });
        
        const result = await kernelCore.query<T>(tableName, safeOptions);
        
        Metrics.recordQueryPerformance(identity.tenantId, tableName, Date.now() - start);
        return result;
      } catch (error) {
        ErrorTracker.captureError(error, { context: 'kernel.query', table: tableName });
        throw error;
      }
    },

    mutate: async <T>(
      tableName: string, 
      action: 'INSERT' | 'UPDATE' | 'DELETE', 
      data: any, 
      match?: Record<string, any>
    ): Promise<T> => {
      RuntimeGuard.assertKernelExecution();
      
      const start = Date.now();
      try {
        const identity = await kernelCore.identity();

        // Rate limiting logic
        const isAllowed = await RateLimiter.checkLimit(identity.tenantId, `db_mutate_${tableName}`, 200, 60);
        if (!isAllowed) {
          throw new Error('RATE_LIMIT_EXCEEDED');
        }

        const safeData = QueryInterceptor.interceptMutation(tableName, action, data, identity);
        
        let safeMatch = match || {};
        if (action !== 'INSERT') {
          const tenantColumn = ['subscriptions', 'tenant_usage', 'invoices', 'payments', 'outbox_events', 'pipeline_metrics'].includes(tableName) 
            ? 'tenant_id' 
            : 'agency_id';
          safeMatch = { ...safeMatch, [tenantColumn]: identity.tenantId };
        }

        Logger.info(`Executing Kernel Mutate`, { tenantId: identity.tenantId, userId: identity.userId, action, table: tableName });

        const result = await kernelCore.mutate<T>(tableName, action, safeData, safeMatch);
        
        Metrics.recordQueryPerformance(identity.tenantId, tableName, Date.now() - start);
        
        logExecutionAudit({
          timestamp: new Date().toISOString(),
          userId: identity.userId,
          tenantId: identity.tenantId,
          action: action,
          route: tableName,
          kernelUsed: true,
          enforcementPassed: true
        });

        return result;
      } catch (error) {
        ErrorTracker.captureError(error, { context: 'kernel.mutate', table: tableName, action });
        throw error;
      }
    },

    transaction: async <T>(
      callback: (txKernel: Omit<IKernel, 'transaction'>) => Promise<T>
    ): Promise<T> => {
      RuntimeGuard.assertKernelExecution();
      try {
        Logger.info(`Starting Kernel Transaction`);
        return await kernelCore.transaction(async (txCore) => {
          const enforcedTxBlock = enforceExecution(txCore as IKernel);
          return await callback(enforcedTxBlock);
        });
      } catch (error) {
        ErrorTracker.captureError(error, { context: 'kernel.transaction' });
        throw error;
      }
    }
  };
}

function logExecutionAudit(event: any) {
  Logger.info('Audit Event Logged', event);
}
