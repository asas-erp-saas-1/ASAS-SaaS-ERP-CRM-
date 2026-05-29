import { kernel } from '@/lib/kernel/core';
import { Logger } from '@/lib/observability/logger';
import { ErrorTracker } from '@/lib/observability/errors';

export class UsageService {
  static async getUsage(tenantId: string, metric: string, periodStart: Date) {
    const usages = await kernel.query<any>('tenant_usage', {
      filters: { 
        tenant_id: tenantId, 
        metric,
        billing_period_start: periodStart.toISOString()
      },
      limit: 1
    });
    return usages.length > 0 ? usages[0] : null;
  }

  static async incrementUsage(tenantId: string, metric: string, amount: number, periodStart: Date, periodEnd: Date) {
    Logger.info(`Incrementing usage`, { tenantId, metric, amount });
    
    return await kernel.transaction(async (tx) => {
      let usage = await this.getUsage(tenantId, metric, periodStart);
      
      if (!usage) {
        usage = await tx.mutate<any>('tenant_usage', 'INSERT', {
          metric,
          value: amount,
          billing_period_start: periodStart.toISOString(),
          billing_period_end: periodEnd.toISOString()
        });
      } else {
        // Enforce Limits
        if (usage.limit_value && (Number(usage.value) + amount > Number(usage.limit_value))) {
          ErrorTracker.captureRejection(`Plan limit exceeded`, { tenantId, metric, current: usage.value, attempt: amount });
          throw new Error('PLAN_LIMIT_EXCEEDED');
        }

        usage = await tx.mutate<any>('tenant_usage', 'UPDATE', {
          value: Number(usage.value) + amount,
          updated_at: new Date().toISOString()
        }, { id: usage.id });
      }
      
      return usage;
    });
  }
}
