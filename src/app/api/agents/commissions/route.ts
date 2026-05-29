import { NextResponse } from 'next/server';
import { kernel } from '@/lib/kernel/core';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
       return NextResponse.json({ error: 'agentId required' }, { status: 400 });
    }

    const agreements = await kernel.query<any>('vw_commission_balance', {
      filters: { agent_id: agentId }
    });
    
    // Filter out fully paid ones
    const unpaid = agreements.filter((a: any) => a.outstanding_balance > 0);

    return NextResponse.json({ unpaid });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
