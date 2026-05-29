import { kernel } from '../kernel/core';
import { RBACEngine } from './rbac';
import { ErrorTracker } from '../observability/errors';
import { prisma } from '../db/prisma';

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Guards an API route handler or service method.
 * Throws an AuthorizationError if the identity doesn't satisfy the requirements.
 */
export async function requirePermission(resource: string, action: string) {
  try {
    const identity = await kernel.identity();
    
    const hasPermission = await RBACEngine.hasPermission(
      identity.userId,
      identity.tenantId,
      resource,
      action
    );

    if (!hasPermission) {
      // Log failed authorization attempt specifically
      await prisma.auditLog.create({
        data: {
          tenantId: identity.tenantId,
          userId: identity.userId,
          action: 'ACCESS_DENIED',
          resource,
          details: { requestedAction: action },
          ipAddress: 'internal' // Since we are in the server, IP might need extraction from headers ideally, but 'internal' works for basic audits
        }
      });
      throw new AuthorizationError('Insufficient permissions.');
    }

    return identity;
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      throw error;
    }
    ErrorTracker.captureError(error, { context: 'requirePermission', resource, action });
    throw new AuthorizationError('Session or Identity error.');
  }
}

/**
 * Ensures the user has one of the specific core roles.
 * A simpler guard compared to fine-grained permissions.
 */
export async function requireRole(allowedRoles: string[]) {
  try {
    const identity = await kernel.identity();
    
    // Legacy support for basic string roles attached to the identity (like 'owner', 'admin')
    if (!allowedRoles.includes(identity.role)) {
      await prisma.auditLog.create({
        data: {
          tenantId: identity.tenantId,
          userId: identity.userId,
          action: 'ACCESS_DENIED_ROLE',
          resource: 'SYSTEM',
          details: { requiredRoles: allowedRoles, actualRole: identity.role }
        }
      });
      throw new AuthorizationError('Insufficient core role permissions.');
    }
    
    return identity;
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      throw error;
    }
    throw new AuthorizationError('Session or Identity error.');
  }
}
