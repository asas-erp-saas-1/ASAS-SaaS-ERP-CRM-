import { NextRequest, NextResponse } from 'next/server';
import { kernel } from '@/lib/kernel/core';
import { ErrorTracker } from '@/lib/observability/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const identity = await kernel.identity();

    // 1. Fetch Developers
    const developers = await kernel.query<any>('developers', {
      filters: { is_active: true }
    });

    if (!developers) {
      return NextResponse.json({ data: [] });
    }

    // Enhance each developer with their projects and deal figures
    const enrichedDevelopers = await Promise.all(developers.map(async (dev) => {
      // 2. Fetch Projects for developer
      const projects = await kernel.query<any>('projects', {
        filters: { developer_id: dev.id }
      }) || [];

      let totalCollected = 0;
      let totalCommission = 0;
      let netToDeveloper = 0;

      const projectDetails = await Promise.all(projects.map(async (proj) => {
        // Fetch properties
        const properties = await kernel.query<any>('properties', {
          filters: { project_id: proj.id }
        }) || [];

        const propertyIds = properties.map(p => p.id);

        let projCollected = 0;
        let projCommission = 0;
        
        let deals: any[] = [];
        
        if (propertyIds.length > 0) {
          // Fetch deals for these properties
          // We don't have IN clause in kernel query simply yet, let's fetch all deals and filter
          const allDeals = await kernel.query<any>('deals', { filters: { status: 'won' } }) || [];
          deals = allDeals.filter(d => propertyIds.includes(d.property_id));

          const dealIds = deals.map(d => d.id);
          
          if (dealIds.length > 0) {
            // Fetch deal payments
            const allPayments = await kernel.query<any>('deal_payments', { filters: { status: 'paid' } }) || [];
            const payments = allPayments.filter(p => dealIds.includes(p.deal_id));
            
            projCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);

            // Calculate agency commission. We need a way to track the split.
            // Using a simple logic: a percentage or flat from deals if retained by agency
            // For now, let's assume standard agency retention is 5% logic or read from a field.
            // Since we don't have a direct "retained commission" per project stored yet, 
            // we'll deduct calculated commissions. In reality, Developers pay agencies a percentage.
            // Let's assume a default 5% to illustrate the P&L flow.
            
            projCommission = projCollected * 0.05; 
          }
        }
        
        totalCollected += projCollected;
        totalCommission += projCommission;

        return {
          id: proj.id,
          name: proj.name,
          sold_count: deals.length,
          total_collected: projCollected,
          commission_retained: projCommission,
          net_to_developer: projCollected - projCommission
        };
      }));

      netToDeveloper = totalCollected - totalCommission;

      return {
        ...dev,
        projects: projectDetails,
        metrics: {
          total_collected: totalCollected,
          total_retained: totalCommission,
          net_to_remit: netToDeveloper
        }
      };
    }));

    return NextResponse.json({ data: enrichedDevelopers });
  } catch (error: any) {
    ErrorTracker.captureError(error, { context: 'GET_Bordereaux' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
