import { KernelIdentity } from '../kernel/core';
import { RuntimeGuard } from './runtime-guard';
import { QueryOptimizer } from '../scaling/query-optimizer';
import { ErrorTracker } from '../observability/errors';

export class QueryInterceptor {
  private static sanitizePayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;

    // Reject NoSQL injections or unknown generic objects with keys starting with $ or _
    for (const key of Object.keys(payload)) {
      if (key.startsWith('$') && key !== '$ref') {
        ErrorTracker.captureRejection(`Malicious payload key detected: ${key}`);
        throw new Error('INVALID_PAYLOAD_DETECTED');
      }
    }
    return payload;
  }

  private static checkRBAC(tableName: string, action: string, role: string) {
    const adminOnlyTables = ['subscriptions', 'tenants', 'billing'];
    if (adminOnlyTables.includes(tableName) && role !== 'owner' && role !== 'manager') {
      ErrorTracker.captureRejection(`RBAC Violation: Role ${role} attempted ${action} on ${tableName}`);
      throw new Error('INSUFFICIENT_PRIVILEGES');
    }
  }

  static interceptRead(tableName: string, options: any, identity: KernelIdentity) {
    if (!identity || !identity.tenantId) {
      RuntimeGuard.triggerViolation('Missing tenant identity in read context.');
    }
    
    this.checkRBAC(tableName, 'READ', identity.role);

    // Dynamic resolution of multi-tenant keys
    const tenantColumn = ['subscriptions', 'tenant_usage', 'invoices', 'payments', 'outbox_events', 'pipeline_metrics'].includes(tableName) 
      ? 'tenant_id' 
      : 'agency_id';

    // Hard-inject the correct tenant key to prevent cross-tenant data leakage
    const scopedFilters = {
      ...(options?.filters ? this.sanitizePayload(options.filters) : {}),
      [tenantColumn]: identity.tenantId
    };

    // Role-based implicit constraints:
    // If agent is reading leads, they can ONLY read their own unless given special privilege
    if (tableName === 'leads' && identity.role === 'agent') {
      scopedFilters['assigned_to'] = identity.userId;
    }

    const safeOptions = {
      ...options,
      filters: scopedFilters
    };

    return QueryOptimizer.optimize(safeOptions);
  }

  static interceptMutation(tableName: string, action: string, data: any, identity: KernelIdentity) {
    if (!identity || !identity.tenantId) {
      RuntimeGuard.triggerViolation('Missing tenant identity in mutation context.');
    }

    this.checkRBAC(tableName, action, identity.role);

    let scopedData = { ...this.sanitizePayload(data) };

    const tenantColumn = ['subscriptions', 'tenant_usage', 'invoices', 'payments', 'outbox_events', 'pipeline_metrics'].includes(tableName) 
      ? 'tenant_id' 
      : 'agency_id';

    if (action === 'INSERT') {
      // Force correct tenant ownership on creation
      scopedData[tenantColumn] = identity.tenantId;
    } else if (action === 'UPDATE' && scopedData[tenantColumn] && scopedData[tenantColumn] !== identity.tenantId) {
      // Prevent attempts to move data to another tenant
      RuntimeGuard.triggerViolation('Attempt to mutate cross-tenant boundary detected.');
    }

    return scopedData;
  }
}

