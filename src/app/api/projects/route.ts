import { NextResponse } from 'next/server';
import { kernel } from '@/lib/kernel/core';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const identity = await kernel.identity();
    const data = await request.json();
    const project = await kernel.mutate('projects', 'INSERT', {
      agency_id: identity.tenantId,
      name: data.name,
      city: data.city || null,
      status: data.status || 'active',
      launch_date: data.launch_date || null,
      completion_date: data.completion_date || null
    });
    return NextResponse.json({ success: true, data: project });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 24;
    const page = Number(searchParams.get('page')) || 1;
    const status = searchParams.get('status');
    const q = searchParams.get('q');
    const id = searchParams.get('id');

    let query: any = {
      select: '*, developers:developer_id(name), properties(*)',
      limit,
    };

    let filters: Record<string, any> = {};
    if (id) filters['id'] = id;
    if (status) filters['status'] = status;
    if (Object.keys(filters).length > 0) query.filters = filters;

    const projects = await kernel.query('projects', query);

    if (id) {
       if (!projects || projects.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
       return NextResponse.json(projects[0]);
    }

    let finalData = projects;
    if (q) {
      finalData = (projects as any[]).filter(p => p.name?.toLowerCase().includes(q.toLowerCase()) || p.city?.toLowerCase().includes(q.toLowerCase()));
    }

    return NextResponse.json({ data: finalData, count: finalData.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
