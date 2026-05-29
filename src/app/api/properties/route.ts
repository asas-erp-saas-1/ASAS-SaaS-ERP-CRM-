import { NextResponse } from 'next/server';
import { kernel } from '@/lib/kernel/core';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 24;
    const page = Number(searchParams.get('page')) || 1;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const q = searchParams.get('q');

    let query: any = {
      select: '*, projects:project_id(id, name, city, developers:developer_id(name))',
      limit,
      // pagination skip logic would normally exist here
    };

    let filters: Record<string, any> = {};
    if (status) filters['status'] = status;
    if (type) filters['type'] = type;
    if (Object.keys(filters).length > 0) query.filters = filters;

    // Ideally 'q' search would use text search
    const properties = await kernel.query('properties', query);

    let finalData = properties;
    if (q) {
      finalData = (properties as any[]).filter(p => p.reference_code?.includes(q) || p.type?.includes(q));
    }

    return NextResponse.json({ data: finalData, count: finalData.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const identity = await kernel.identity();
    
    // Defaulting required fields if absent
    const data = {
      agency_id: identity.tenantId,
      project_id: payload.project_id || null,
      type: payload.type || 'other',
      list_price: payload.list_price || 0,
      status: payload.status || 'available',
      area_sqm: payload.area_sqm || null,
      notes: payload.notes || null,
    };

    const property = await kernel.mutate('properties', 'INSERT', data);
    return NextResponse.json({ data: property });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
