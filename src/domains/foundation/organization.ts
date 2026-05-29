// src/domains/foundation/organization.ts
import { kernel } from '@/lib/kernel/core';
import { Access } from './access';
import { Audit } from './audit';

export class OrganizationEngine {
  static async listBranches() {
    const context = await Access.resolveContext();
    return await kernel.query('branches', {
      filters: { agency_id: context.agencyId }
    });
  }

  static async createBranch(payload: { name: string, code: string, city: string, address?: string, phone?: string }) {
    const context = await Access.resolveContext();
    const isGranted = await Access.checkPermission('manage_organization');
    if (!isGranted && context.role !== 'owner') {
      throw new Error('Unauthorized to manage organization');
    }

    const record = await kernel.mutate('branches', 'INSERT', {
      agency_id: context.agencyId,
      name: payload.name,
      code: payload.code,
      city: payload.city,
      address: payload.address,
      phone: payload.phone,
      is_active: true
    });

    await Audit.log({
      operationType: 'BRANCH_CREATED',
      entityType: 'branch',
      entityId: (record as any).id,
      newValues: payload
    });

    return record;
  }

  static async listTeams() {
    const context = await Access.resolveContext();
    return await kernel.query('teams', {
      filters: { agency_id: context.agencyId }
    });
  }

  static async createTeam(payload: { name: string, branchId: string, managerId?: string }) {
    const context = await Access.resolveContext();
    const isGranted = await Access.checkPermission('manage_organization');
    if (!isGranted && context.role !== 'owner') {
      throw new Error('Unauthorized to manage organization');
    }

    const record = await kernel.mutate('teams', 'INSERT', {
      agency_id: context.agencyId,
      branch_id: payload.branchId,
      name: payload.name,
      manager_id: payload.managerId,
      is_active: true
    });

    await Audit.log({
      operationType: 'TEAM_CREATED',
      entityType: 'team',
      entityId: (record as any).id,
      newValues: { ...payload }
    });

    return record;
  }

  static async assignAgentToTeam(teamId: string, profileId: string) {
    const context = await Access.resolveContext();
    const isGranted = await Access.checkPermission('manage_organization');
    if (!isGranted && context.role !== 'owner') {
      throw new Error('Unauthorized to manage organization');
    }

    // First we check if a mapping exists
    const existing = await kernel.query('team_members', {
       filters: { team_id: teamId, profile_id: profileId }
    });

    if (existing && existing.length > 0) {
      throw new Error("L'agent appartient déjà à cette équipe.");
    }

    const record = await kernel.mutate('team_members', 'INSERT', {
      team_id: teamId,
      profile_id: profileId,
      role_in_team: 'member'
    });

    await Audit.log({
       operationType: 'AGENT_ASSIGNED_TO_TEAM',
       entityType: 'team',
       entityId: teamId,
       newValues: { profileId }
    });

    return record;
  }
}

export const Organization = OrganizationEngine;
