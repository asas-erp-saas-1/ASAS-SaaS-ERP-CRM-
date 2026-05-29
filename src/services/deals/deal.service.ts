import { kernel } from '@/lib/kernel/core';
import { Database } from '@/types/supabase';
import type { Deal } from '@/types/app';
import { DealStateMachine, DEAL_TRANSITION_META } from '@/core/stateMachine';

export class DealService {
  static async getDeals(): Promise<Deal[]> {
    const deals = await kernel.query<any>('deals', {
      select: '*, clients(full_name, phone), profiles(full_name), properties(*, projects(id, name)), deal_payments(*)',
      filters: { deleted_at: null },
      orderBy: { column: 'created_at', ascending: false }
    });
    return deals as Deal[];
  }

  static async createDeal(data: { clientId: string; propertyId: string; agreedPrice: number; dealType: Database['public']['Enums']['deal_type']; leadId?: string; agentId?: string }): Promise<Deal> {
    const identity = await kernel.identity();
    return await kernel.transaction(async (tx) => {
      const deal = await tx.mutate<any>('deals', 'INSERT', {
        agency_id: identity.tenantId,
        client_id: data.clientId,
        property_id: data.propertyId,
        agent_id: data.agentId || identity.userId,
        agreed_price: data.agreedPrice,
        deal_type: data.dealType,
        lead_id: data.leadId || null,
        status: 'draft',
        risk_level: 'low',
        total_payments_scheduled: 0,
        total_payments_received: 0,
        is_current: true,
        commission_generated: false,
        version: 1
      });

      if (data.leadId) {
        await tx.mutate('leads', 'UPDATE', {
          status: 'reserved',
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { id: data.leadId });

        await tx.mutate('activities', 'INSERT', {
          agency_id: identity.tenantId,
          lead_id: data.leadId,
          deal_id: deal.id,
          type: 'status_change',
          notes: 'Dossier Vente (Deal) créé. Statut de la piste modifié à Réservé.',
          created_by: identity.userId
        });
      }

      return deal as Deal;
    });
  }

  static async changeDealStatus(
    dealId: string, 
    status: Database['public']['Enums']['deal_status'], 
    currentVersion: number = 1, 
    metadata?: { lostReason?: string }
  ): Promise<Deal> {
    const identity = await kernel.identity();
    
    return await kernel.transaction(async (tx) => {
      // 1. Fetch current deal state
      const deals = await tx.query<any>('deals', {
        filters: { id: dealId }
      });
      
      if (deals.length === 0) {
        throw new Error(`Deal ${dealId} not found.`);
      }
      
      const currentDeal = deals[0];

      // 2. Tenant isolation verification (Prevent cross-tenant mutation)
      if (currentDeal.agency_id !== identity.tenantId) {
        throw new Error('Tenant boundary violation: you do not have permission to access or modify this deal.');
      }

      // 3. Optimistic Locking Concurrency Check
      if (currentDeal.version !== currentVersion) {
        throw new Error('Concurrency conflict: The deal has been modified by another process. Please reload and try again.');
      }

      // 4. State Machine Validation
      const stateMachine = new DealStateMachine(currentDeal.status);
      const validation = stateMachine.validate(status);
      if (!validation.ok) {
        throw new Error(validation.error || `Invalid transition from ${currentDeal.status} to ${status}`);
      }

      // 5. Query Transition Metadata and Check Invariants
      const transitionMeta = DEAL_TRANSITION_META.find(
        (t) => t.from === currentDeal.status && t.to === status
      );

      // Business invariant checks
      if (transitionMeta?.requiresCheck === 'all_payments_paid') {
        const payments = await tx.query<any>('deal_payments', {
          filters: { deal_id: dealId }
        });
        const nonCancelled = payments.filter((p: any) => p.status !== 'cancelled');
        const hasUnpaid = nonCancelled.some((p: any) => p.status !== 'paid');
        if (nonCancelled.length === 0 || hasUnpaid) {
          throw new Error('Cannot close deal: not all scheduled payments have been fully paid.');
        }
      }

      if (transitionMeta?.requiresReason && !metadata?.lostReason?.trim()) {
        throw new Error(`A cancellation or transition reason is required for status change from ${currentDeal.status} to ${status}`);
      }

      // 6. Formulate scope updates
      const payload: any = {
        status,
        version: currentVersion + 1,
        updated_at: new Date().toISOString()
      };

      if (status === 'active') {
        payload.activated_at = new Date().toISOString();
      } else if (status === 'negotiation') {
        payload.negotiation_started_at = new Date().toISOString();
      } else if (status === 'closed') {
        payload.closing_date = new Date().toISOString().split('T')[0];
      } else if (status === 'cancelled') {
        payload.cancellation_reason = metadata?.lostReason || 'Not specified';
      }

      // 7. Execute Mutation (using tx context)
      const updatedDeal = await tx.mutate<any>('deals', 'UPDATE', payload, { id: dealId });

      // 8. Aggregate synchronization block
      
      // Sync 1: If deal has been cancelled, transition all of its pending or overdue payments to 'cancelled' status
      if (status === 'cancelled') {
        const payments = await tx.query<any>('deal_payments', {
          filters: { deal_id: dealId }
        });
        for (const payment of payments) {
          if (payment.status === 'pending' || payment.status === 'overdue') {
            await tx.mutate('deal_payments', 'UPDATE', {
              status: 'cancelled',
              updated_at: new Date().toISOString()
            }, { id: payment.id });
          }
        }
      }

      // Sync 3: Log state change activity
      await tx.mutate('activities', 'INSERT', {
        agency_id: identity.tenantId,
        lead_id: currentDeal.lead_id || null,
        deal_id: dealId,
        type: 'status_change',
        notes: `Deal stage changed from ${currentDeal.status.toUpperCase()} to ${status.toUpperCase()}.${
          metadata?.lostReason ? ` Reason: ${metadata.lostReason}` : ''
        }`,
        created_by: identity.userId
      });

      // Sync 4: Invalidate client-facing dashboard metrics cache
      try {
        const { CacheService } = await import('@/lib/cache/cache.service');
        await CacheService.invalidateExact(identity.tenantId, 'dashboard_metrics');
      } catch (_) {}

      return updatedDeal as Deal;
    });
  }

  static async registerPayment(dealId: string, amount: number, dueDate: string) {
    return await kernel.transaction(async (tx) => {
      // 1. Log payment
      const payment = await tx.mutate<any>('deal_payments', 'INSERT', {
        deal_id: dealId,
        amount,
        due_date: dueDate,
        status: 'pending'
      });
      return payment;
    });
  }
}

