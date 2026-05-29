// src/domains/foundation/audit.ts

import { kernel } from '@/lib/kernel/core';
import { AuditTrailLog } from './types';
import { randomUUID } from 'crypto';

export class ImmutableAuditEngine {
  /**
   * Appends a secure, tamper-resistant trail line to the forensic ledger repository.
   * This operates synchronously via DB insertions under active transactional structures.
   */
  public static async log(
    logData: Omit<AuditTrailLog, 'correlationId' | 'agencyId' | 'actorId'>,
    correlationId?: string
  ): Promise<string> {
    const activeCorrelationId = correlationId || randomUUID();
    
    try {
      const identity = await kernel.identity();
      
      const auditPayload = {
        correlation_id: activeCorrelationId,
        actor_id: identity.userId,
        agency_id: identity.tenantId,
        branch_id: logData.branchId || null,
        operation_type: logData.operationType,
        entity_type: logData.entityType,
        entity_id: logData.entityId,
        old_values: logData.oldValues ? JSON.stringify(logData.oldValues) : null,
        new_values: logData.newValues ? JSON.stringify(logData.newValues) : null,
        request_ip: logData.requestIp || 'server',
        device_signature: logData.deviceSignature || 'web-browser',
        is_anomaly: false
      };

      await kernel.mutate('sys_audit_vault', 'INSERT', auditPayload);
      return activeCorrelationId;
    } catch (err: any) {
      console.error('Audit core emission failure (non-critical pipeline bypass protection):', err);
      // Fallback tracking to stderr instead of halting critical core business mutations
      return activeCorrelationId;
    }
  }

  /**
   * Reconstitutes historical timelines for auditing specific transaction objects
   */
  public static async retrieveEntityTimeline(
    entityType: string,
    entityId: string
  ): Promise<any[]> {
    try {
      const records = await kernel.query('sys_audit_vault', {
        filters: { entity_type: entityType, entity_id: entityId },
        orderBy: { column: 'timestamp', ascending: false },
        limit: 100
      });
      return records;
    } catch (err) {
      console.error(`Failed to retrieve structural audit trace for ${entityType}:${entityId}`, err);
      return [];
    }
  }

  /**
   * Retrieves whole-system audit traces using specific search metrics
   */
  public static async searchVault(filters?: Record<string, any>, limit = 50): Promise<any[]> {
    try {
      const identity = await kernel.identity();
      const queryFilters = { agency_id: identity.tenantId, ...filters };
      return await kernel.query('sys_audit_vault', {
        filters: queryFilters,
        orderBy: { column: 'timestamp', ascending: false },
        limit
      });
    } catch (err) {
      console.error('Failed to query military audit engine:', err);
      return [];
    }
  }
}
export const Audit = ImmutableAuditEngine;
