import { NextResponse } from 'next/server';
import { kernel } from '@/lib/kernel/core';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lead_id = searchParams.get('lead_id');
    const deal_id = searchParams.get('deal_id');

    let filters: Record<string, string> = {};
    if (lead_id) filters['lead_id'] = lead_id;
    if (deal_id) filters['deal_id'] = deal_id;

    const options: any = {
      select: '*, profiles(full_name)',
      orderBy: { column: 'created_at', ascending: false },
      limit: 100
    };
    if (Object.keys(filters).length > 0) {
      options.filters = filters;
    }

    const activities = await kernel.query('activities', options);

    return NextResponse.json({ data: activities });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { lead_id, deal_id, type, description } = await request.json();
    const identity = await kernel.identity();
    
    if (!description || !type) {
      return NextResponse.json({ error: 'Description and type are required' }, { status: 400 });
    }

    const payload: any = {
      agency_id: identity.tenantId,
      user_id: identity.userId,
      type,
      description
    };
    
    if (lead_id) payload.lead_id = lead_id;
    if (deal_id) payload.deal_id = deal_id;

    const activity = await kernel.mutate('activities', 'INSERT', payload);
    return NextResponse.json({ data: activity });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    const res = await kernel.mutate('activities', 'DELETE', { id });
    return NextResponse.json({ success: true, data: res });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

