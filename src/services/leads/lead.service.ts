import { kernel } from '@/lib/kernel/core';
import { Database } from '@/types/supabase';
import type { Lead } from '@/types/app';
import { LeadStateMachine } from '@/core/stateMachine';

export class LeadService {
  static async getLeads(limit = 50, offset = 0): Promise<Lead[]> {
    const leads = await kernel.query<any>('leads', {
      select: '*, clients(full_name, phone), profiles(full_name), projects(name)',
      filters: { deleted_at: null },
      orderBy: { column: 'created_at', ascending: false },
      limit,
      offset
    });
    return leads as Lead[];
  }

  static async createLead(data: { clientId: string; source?: string; budgetMin?: number; budgetMax?: number; assignedAgent?: string }): Promise<Lead> {
    const identity = await kernel.identity();
    const lead = await kernel.mutate<any>('leads', 'INSERT', {
      agency_id: identity.tenantId,
      client_id: data.clientId,
      source: data.source || null,
      budget_min: data.budgetMin || null,
      budget_max: data.budgetMax || null,
      assigned_agent: data.assignedAgent || null,
      status: 'new',
      last_activity: new Date().toISOString(),
      cached_score: 0,
      score_tier: 'starter',
    });
    return lead as Lead;
  }

  static async assignLead(leadId: string, agentId: string): Promise<Lead> {
    const lead = await kernel.mutate<any>('leads', 'UPDATE', {
      assigned_agent: agentId
    }, { id: leadId, deleted_at: null });
    return lead as Lead;
  }
  
  static async updateStatus(
    leadId: string, 
    status: Database['public']['Enums']['lead_status'],
    metadata?: { lostReason?: string }
  ): Promise<Lead> {
    const identity = await kernel.identity();

    return await kernel.transaction(async (tx) => {
      // 1. Fetch current lead state
      const leads = await tx.query<any>('leads', {
        filters: { id: leadId, deleted_at: null }
      });

      if (leads.length === 0) {
        throw new Error(`Lead ${leadId} not found or has been deleted.`);
      }

      const currentLead = leads[0];

      // 2. Tenant isolation verification (Prevent cross-tenant mutation)
      if (currentLead.agency_id !== identity.tenantId) {
        throw new Error('Tenant boundary violation: you do not have permission to access or modify this lead.');
      }

      // 3. State Machine Validation
      const stateMachine = new LeadStateMachine(currentLead.status);
      const opt = metadata?.lostReason ? { lost_reason: metadata.lostReason } : {};
      const validation = stateMachine.validate(status, opt);
      if (!validation.ok) {
        throw new Error(validation.error || `Invalid transition from ${currentLead.status} to ${status}`);
      }

      // 4. Formulate updates
      const payload: any = {
        status,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (status === 'lost') {
        payload.lost_reason = metadata?.lostReason || 'Not specified';
      }

      // 5. Execute Mutation
      const updatedLead = await tx.mutate<any>('leads', 'UPDATE', payload, { id: leadId });

      // 6. Logs & Activity synchronization workflow
      await tx.mutate('activities', 'INSERT', {
        agency_id: identity.tenantId,
        lead_id: leadId,
        deal_id: null,
        type: 'status_change',
        notes: `Lead status changed from ${currentLead.status.toUpperCase()} to ${status.toUpperCase()}.${
          metadata?.lostReason ? ` Reason: ${metadata.lostReason}` : ''
        }`,
        created_by: identity.userId
      });

      // 7. Invalidate client-facing dashboard metrics cache
      try {
        const { CacheService } = await import('@/lib/cache/cache.service');
        await CacheService.invalidateExact(identity.tenantId, 'dashboard_metrics');
      } catch (_) {}

      return updatedLead as Lead;
    });
  }

  static async deleteLead(leadId: string): Promise<void> {
    await kernel.mutate('leads', 'UPDATE', {
      deleted_at: new Date().toISOString(),
      status: 'lost'
    }, { id: leadId });
  }
}

