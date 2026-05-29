import { prisma } from '../db/prisma';
import { Logger } from './logger';

export interface AuditLogOptions {
  tenantId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  /**
   * Logs a security or compliance event asynchronously to the database.
   */
  static logEvent(options: AuditLogOptions): void {
    // Fire and forget, no await to prevent blocking the main execution path
    prisma.auditLog.create({
      data: {
        tenantId: options.tenantId,
        userId: options.userId,
        action: options.action,
        resource: options.resource,
        resourceId: options.resourceId,
        details: options.details ? JSON.stringify(options.details) : undefined,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      }
    }).catch(err => {
      // If audit logging fails, we must at least capture it in Standard Output
      Logger.error('Failed to write audit log to database', new Error(String(err)), {
        context: options
      });
    });
  }
}
