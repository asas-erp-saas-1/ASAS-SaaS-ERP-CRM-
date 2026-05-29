import { kernel } from '@/lib/kernel/core';

export class TenantDashboardService {
  static async getActivityStream(tenantId: string) {
    // Queries audit logs specifically for the given tenant ID
    // Note: The kernel's QueryInterceptor handles injecting tenantId to ensure we 
    // never get another tenant's logs.
    return await kernel.query('audit_logs', {
      select: 'id, user_id, entity_type, entity_id, action, created_at',
      filters: { agency_id: tenantId },
      orderBy: { column: 'created_at', ascending: false },
      limit: 100
    });
  }

  static async getActiveUsers(tenantId: string) {
    // Retrieves unique user activities per day/hour, etc.
    const logs = await kernel.query<{ user_id: string }>('audit_logs', {
      select: 'user_id',
      filters: { agency_id: tenantId },
      limit: 1000
    });

    // Process unique user activity locally
    const uniqueUsers = new Set(logs.map(log => log.user_id));
    return uniqueUsers.size;
  }
}
