import { NextResponse } from 'next/server';
import { kernel } from '@/lib/kernel/core';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const offset = (page - 1) * limit;
    const deal_id = searchParams.get('deal_id');
    const lead_id = searchParams.get('lead_id');
    const assigned_to = searchParams.get('assigned_to');

    const filters: Record<string, any> = {};
    if (deal_id) filters['deal_id'] = deal_id;
    if (lead_id) filters['lead_id'] = lead_id;
    if (assigned_to) filters['assigned_to'] = assigned_to;

    const qOpts: any = { limit, offset, orderBy: { column: 'created_at', ascending: false } };
    if (Object.keys(filters).length > 0) qOpts.filters = filters;

    const tasks = await kernel.query('tasks', qOpts);
    return NextResponse.json({ data: tasks, count: tasks.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const identity = await kernel.identity();
    const task = await kernel.mutate('tasks', 'INSERT', {
      title: data.title,
      description: data.description || null,
      agency_id: identity.tenantId,
      assigned_to: data.assigned_to || identity.userId,
      created_by: identity.userId,
      priority: data.priority || 'medium',
      status: data.status || 'pending',
      due_date: data.due_date || null,
      deal_id: data.deal_id || null,
      lead_id: data.lead_id || null,
      is_automated: data.is_automated || false
    });
    return NextResponse.json({ data: task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...data } = await request.json();
    if (!id) throw new Error('ID is required');
    const task = await kernel.mutate('tasks', 'UPDATE', data, { id });
    return NextResponse.json({ data: task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
