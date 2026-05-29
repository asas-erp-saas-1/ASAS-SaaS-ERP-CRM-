import { NextResponse } from 'next/server';
import { kernel } from '@/lib/kernel/core';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 50;
    const view = searchParams.get('view');

    const performances = await kernel.query<any>('vw_agent_performance', {
      limit,
      orderBy: { column: 'closed_deals', ascending: false }
    });

    const rankings = performances.map((perf, index) => ({
      agentId: perf.agent_id,
      agentName: perf.agent_name,
      tier: index === 0 ? 'Elite' : index === 1 ? 'Gold' : index === 2 ? 'Silver' : index === 3 ? 'Bronze' : 'Starter',
      rank: index + 1,
      rankDelta: 0,
      performanceScore: perf.closed_deals * 10 + perf.active_deals * 5,
      closedDeals: perf.closed_deals,
      activeDeals: perf.active_deals,
      totalRevenue: perf.total_revenue || 0,
      commissionEarned: perf.commission_earned || 0,
      commissionOutstanding: perf.commission_outstanding || 0,
      closingRatePct: perf.total_deals > 0 ? (perf.closed_deals / perf.total_deals) * 100 : 0,
      avgDealSize: perf.closed_deals > 0 ? (perf.total_revenue / perf.closed_deals) : 0
    }));

    if (view === 'snapshot') {
      const agentId = searchParams.get('agentId');
      if (agentId) {
        return NextResponse.json(rankings.find(r => r.agentId === agentId) || null);
      }
    }

    return NextResponse.json({ rankings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
