import { NextResponse } from 'next/server';
import { kernel } from '@/lib/kernel/core';

// This API is used by the client portal to fetch and send messages.
// It is protected by the `deal_id` UUID match, acting as a secure token.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('deal_id');

    if (!dealId) {
      return NextResponse.json({ error: 'Deal ID identifier is required' }, { status: 400 });
    }

    // Verify deal existence
    const deals = await kernel.query<any>('deals', { filters: { id: dealId } });
    if (!deals || deals.length === 0) {
      return NextResponse.json({ error: 'Access restricted or invalid transaction' }, { status: 403 });
    }

    const messages = await kernel.query<any>('activities', {
      filters: { deal_id: dealId, type: 'message' },
      select: '*, profiles(full_name)',
      orderBy: { column: 'created_at', ascending: true },
      limit: 100
    });

    return NextResponse.json({ data: messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { dealId, message, sender } = await request.json();

    if (!dealId || !message || !sender) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify deal existence
    const deals = await kernel.query<any>('deals', { filters: { id: dealId } });
    if (!deals || deals.length === 0) {
      return NextResponse.json({ error: 'Access restricted or invalid transaction' }, { status: 403 });
    }

    const deal = deals[0];
    const prefix = sender === 'client' ? '[PORTAL_MSG] ' : '[AGENT_MSG] ';

    const payload: any = {
      deal_id: dealId,
      agency_id: deal.agency_id,
      type: 'message',
      description: prefix + message,
    };

    if (sender === 'agent') {
      const identity = await kernel.identity();
      payload.user_id = identity.userId;
    }

    const act = await kernel.mutate('activities', 'INSERT', payload);

    return NextResponse.json({ data: act });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
