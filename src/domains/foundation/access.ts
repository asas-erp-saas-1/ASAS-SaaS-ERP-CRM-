// src/domains/foundation/access.ts

import { kernel } from '@/lib/kernel/core';
import { IdentityContext, BranchScope, ScopeLevel } from './types';
import { Audit } from './audit';

export class FoundationAccessEngine {
  /**
   * Resolves, hydratates and validates structural Context claims for the active session.
   * Completely backward compatible with legacy flat roles ('owner', 'manager', 'agent').
   */
  public static async resolveContext(): Promise<IdentityContext> {
    const defaultIdentity = await kernel.identity();
    
    // Resolve profile details
    const profiles = await kernel.query('profiles', {
      filters: { id: defaultIdentity.userId }
    });
    
    const profile = profiles[0] as any;
    if (!profile) {
      throw new Error('Identity verification failure: Associated client profile not found.');
    }

    // Attempt to retrieve fine-grained organization staff assignment
    const assignments = await kernel.query('staff_assignments', {
      filters: { profile_id: defaultIdentity.userId }
    });

    const primaryAssignment = assignments.find((a: any) => a.is_primary) || assignments[0] as any;
    
    let activeBranch: BranchScope | undefined = undefined;
    let computedScope: ScopeLevel = 'self';
    const computedPermissions = new Set<string>();

    if (primaryAssignment) {
      // Fetch branch scope
      const branches = await kernel.query('branches', {
        filters: { id: primaryAssignment.branch_id }
      });
      const branchObj = branches[0] as any;
      if (branchObj) {
        activeBranch = {
          id: branchObj.id,
          name: branchObj.name,
          code: branchObj.code,
          city: branchObj.city
        };
      }

      // Fetch permissions bound to role
      const rolesAndPerms = await kernel.query('role_permissions', {
        filters: { role_id: primaryAssignment.role_id }
      });

      // Fetch literal permission details
      if (rolesAndPerms.length > 0) {
        const pIds = rolesAndPerms.map((rp: any) => rp.permission_id);
        const permsList = await kernel.query('permissions', {
          filters: { id: pIds }
        });

        permsList.forEach((p: any) => {
          computedPermissions.add(p.action);
        });

        // Determine maximum scope level granted by primary role
        const scopeLevels: ScopeLevel[] = ['global', 'region', 'branch', 'department', 'team', 'self'];
        for (const lvl of scopeLevels) {
          if (rolesAndPerms.some((rp: any) => rp.scope_level === lvl)) {
            computedScope = lvl;
            break;
          }
        }
      }
    }

    // Backward compatibility fallback mappings
    const flatRole = defaultIdentity.role;
    if (computedPermissions.size === 0) {
      if (flatRole === 'owner') {
        computedScope = 'global';
        // Owners receive full wildcard allowance
        computedPermissions.add('leads.read');
        computedPermissions.add('leads.assign');
        computedPermissions.add('leads.delete');
        computedPermissions.add('deals.create');
        computedPermissions.add('deals.override');
        computedPermissions.add('documents.lock');
        computedPermissions.add('cash.receipt');
        computedPermissions.add('cash.verify');
        computedPermissions.add('ledger.write');
        computedPermissions.add('ledger.close');
        computedPermissions.add('milestone.sign');
      } else if (flatRole === 'manager') {
        computedScope = 'branch';
        computedPermissions.add('leads.read');
        computedPermissions.add('leads.assign');
        computedPermissions.add('deals.create');
        computedPermissions.add('deals.override');
        computedPermissions.add('cash.receipt');
        computedPermissions.add('cash.verify');
      } else {
        computedScope = 'self';
        computedPermissions.add('leads.read');
        computedPermissions.add('deals.create');
        computedPermissions.add('cash.receipt');
      }
    }

    return {
      userId: defaultIdentity.userId,
      email: profile.email || '',
      agencyId: defaultIdentity.tenantId,
      role: flatRole,
      activeBranch,
      permissions: computedPermissions,
      scopeLevel: computedScope
    };
  }

  /**
   * Asserts whether the active user has fine-grained permission to act on an operation,
   * tracking violation/clearance in the Immutable Audit trace.
   */
  public static async checkPermission(action: string, entityId?: string): Promise<boolean> {
    const context = await this.resolveContext();
    
    const isGranted = context.permissions.has(action) || context.role === 'owner';
    
    if (!isGranted) {
      // Forensic Audit violation emitter
      await Audit.log({
        operationType: 'ACCESS_VIOLATION_BLOCKED',
        entityType: 'permission',
        entityId: entityId || '00000000-0000-0000-0000-000000000000',
        oldValues: { attemptedAction: action, scope: context.scopeLevel },
        newValues: { status: 'rejection_applied' }
      });
    }

    return isGranted;
  }

  /**
   * Evaluates and enforces branch-level regional isolation for high-liability metrics
   */
  public static async enforceBranchIsolation(requestBranchId: string): Promise<void> {
    const context = await this.resolveContext();
    if (context.role === 'owner' || context.scopeLevel === 'global') {
      return; // Absolute bypass for global executive director roles
    }

    if (!context.activeBranch || context.activeBranch.id !== requestBranchId) {
      await Audit.log({
        operationType: 'BRANCH_OUT_OF_BOUNDS_VIOLATION',
        entityType: 'branch',
        entityId: requestBranchId,
        oldValues: { activeUserBranch: context.activeBranch?.id || 'none' },
        newValues: { status: 'hard_halt_enforced' }
      });
      throw new Error('Branch separation security: Action forbidden outside assigned physical regional offices.');
    }
  }

  /**
   * Checks if there's an approved, active temporary emergency override request
   * for a specific permission in a branch.
   */
  public static async isEmergencyOverrideActive(
    branchId: string,
    permissionAction: string
  ): Promise<boolean> {
    try {
      const overrides = await kernel.query('emergency_override_requests', {
        filters: { branch_id: branchId, override_status: 'active' }
      });

      // Find if any matches the required permission and has not expired
      const matches = overrides.filter((o: any) => {
        const expiry = o.expires_at ? new Date(o.expires_at) : null;
        return (
          o.permission_action === permissionAction &&
          (!expiry || expiry > new Date())
        );
      });

      return matches.length > 0;
    } catch {
      return false;
    }
  }
}
export const Access = FoundationAccessEngine;
