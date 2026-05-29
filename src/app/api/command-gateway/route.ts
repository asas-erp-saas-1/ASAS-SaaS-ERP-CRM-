// src/app/api/command-gateway/route.ts
import { NextResponse } from 'next/server';
import { kernel } from '@/lib/kernel/core';
import { ErrorTracker } from '@/lib/observability/errors';

export async function POST(request: Request) {
  try {
    const identity = await kernel.identity();
    const command = await request.json();

    // The command object looks like:
    // {
    //   commandId: string,
    //   aggregateId: string,
    //   type: string,
    //   expectedVersion: number,
    //   payload: any
    // }

    // Physical Event Sourcing validation should happen here. 
    // But since the scope is transitioning next.js to command logic, we execute a command wrapper.
    
    // In our simplified Kernel wrapper, we map common command types to Kernel Mutates.
    // For deals:
    if (command.type === 'CREATE_CLIENT') {
      const { full_name, phone, email, type, source, nationality } = command.payload;
      const client = await kernel.mutate('clients', 'INSERT', {
        agency_id: identity.tenantId,
        full_name,
        phone: phone || null,
        email: email || null,
        type: type || 'buyer',
        source: source || 'other',
        nationality: nationality || null
      });
      return NextResponse.json({ success: true, data: client });
    }

    if (command.type === 'SET_DEAL_STAGE') {
      const { stage, notes, lostReason } = command.payload;
      const { DealService } = await import('@/services/deals/deal.service');
      const deal = await DealService.changeDealStatus(
        command.aggregateId,
        stage,
        command.expectedVersion || 1,
        { lostReason: lostReason || notes }
      );
      return NextResponse.json({ success: true, data: deal });
    }

    if (command.type === 'SET_LEAD_STATUS') {
      const { status, lostReason } = command.payload;
      const { LeadService } = await import('@/services/leads/lead.service');
      const lead = await LeadService.updateStatus(command.aggregateId, status, { lostReason });
      return NextResponse.json({ success: true, data: lead });
    }

    if (command.type === 'UPDATE_PROPERTY_STATUS') {
      const { status } = command.payload;
      const prop = await kernel.mutate('properties', 'UPDATE', { status }, { id: command.aggregateId });
      return NextResponse.json({ success: true, data: prop });
    }

    if (command.type === 'CREATE_DEAL') {
      const { client_id, property_id, agreed_price, deal_type, agent_id } = command.payload;
      const { DealService } = await import('@/services/deals/deal.service');
      const deal = await DealService.createDeal({
        clientId: client_id,
        propertyId: property_id,
        agreedPrice: Number(agreed_price),
        dealType: deal_type || 'sale',
        agentId: agent_id
      });
      // Update property status to reserved upon reservation
      await kernel.mutate('properties', 'UPDATE', { status: 'reserved' }, { id: property_id });
      return NextResponse.json({ success: true, data: deal });
    }

    if (command.type === 'LOG_DEPOSIT') {
      const { amount, method, notes } = command.payload;
      const payment = await kernel.mutate('deal_payments', 'INSERT', {
        deal_id: command.aggregateId,
        amount,
        status: 'pending',
        due_date: new Date().toISOString(), // Avance is logged today
      });
      return NextResponse.json({ success: true, data: payment });
    }

    if (command.type === 'SCHEDULE_PAYMENT') {
      const { dealId, amount, due_date, notes } = command.payload;
      const payment = await kernel.mutate('deal_payments', 'INSERT', {
        deal_id: dealId || command.aggregateId,
        amount,
        due_date,
        status: 'pending',
        notes: notes || 'Appel de fonds / Tranche'
      });
      return NextResponse.json({ success: true, data: payment });
    }

    if (command.type === 'TRIGGER_PROJECT_TRANCHE') {
      const { projectId, trancheLabel, tranchePct } = command.payload;
      const { DealService } = await import('@/services/deals/deal.service');
      const allDeals = await DealService.getDeals();
      const projectDeals = allDeals.filter((d: any) => 
        d.properties?.projects?.id === projectId && 
        ['active', 'negotiation', 'notary', 'closed'].includes(d.status)
      );

      for (const deal of projectDeals) {
        const agreedPrice = (deal as any).agreed_price || (deal as any).amount || 0;
        const amountToCall = agreedPrice * (tranchePct / 100);
        
        await DealService.registerPayment(deal.id, amountToCall, new Date().toISOString());

        await kernel.mutate('activities', 'INSERT', {
          agency_id: identity.tenantId,
          deal_id: deal.id,
          type: 'note',
          user_id: identity.userId,
          description: `Appel de fonds émis : ${trancheLabel} (${tranchePct}% = ${amountToCall.toLocaleString()} DZD)`
        });
      }

      return NextResponse.json({ success: true, dispatched: projectDeals.length });
    }

    if (command.type === 'MARK_PAYMENT_PAID') {
      const { dealId, amount } = command.payload;
      return await kernel.transaction(async (tx) => {
         const payment = await tx.mutate('deal_payments', 'UPDATE', {
            status: 'paid',
            paid_date: new Date().toISOString()
         }, { id: command.aggregateId });

         // Fetch deal to update its total payments
         const deal = await tx.query<any>('deals', { select: 'id, total_payments_received', filters: { id: dealId }});
         if (deal && deal.length > 0) {
            const currentTotal = deal[0].total_payments_received || 0;
            await tx.mutate('deals', 'UPDATE', {
              total_payments_received: currentTotal + amount
            }, { id: dealId });
         }

         await tx.mutate('activities', 'INSERT', {
            agency_id: identity.tenantId,
            deal_id: dealId,
            type: 'status_change',
            user_id: identity.userId,
            description: `Paiement / Appel de fonds validé: ${(amount / 1000000).toFixed(2)}M DZD`,
            notes: 'Validé via espace Intelligence'
         });

         return NextResponse.json({ success: true, data: payment });
      });
    }

    if (command.type === 'SETTLE_COMMISSION') {
      const { agreementId, amount, agentId } = command.payload;
      const payment = await kernel.mutate('commission_payments', 'INSERT', {
        agency_id: identity.tenantId,
        commission_agreement_id: agreementId,
        agent_id: agentId,
        amount_paid: amount,
        payment_date: new Date().toISOString(),
        payment_method: 'bank_transfer'
      });
      return NextResponse.json({ success: true, data: payment });
    }

    if (command.type === 'LOG_EXPENSE') {
      const { category, amount, description, expense_date } = command.payload;
      const expense = await kernel.mutate('expenses', 'INSERT', {
        agency_id: identity.tenantId,
        category,
        amount,
        description,
        expense_date: expense_date || new Date().toISOString(),
        paid_by: identity.userId
      });
      return NextResponse.json({ success: true, data: expense });
    }

    return NextResponse.json({ error: 'Unknown command type' }, { status: 400 });
  } catch (error: any) {
    ErrorTracker.captureError(error, { context: 'CommandGateway' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
