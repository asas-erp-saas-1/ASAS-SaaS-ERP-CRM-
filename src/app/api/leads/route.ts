import { NextResponse } from 'next/server';
import { LeadService } from '@/services/leads/lead.service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const offset = (page - 1) * limit;

    const leads = await LeadService.getLeads(limit, offset);
    return NextResponse.json({ data: leads, count: leads.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    const lead = await LeadService.createLead({
      clientId: body.client_id,
      source: body.source,
      budgetMin: body.budget_min,
      budgetMax: body.budget_max,
      assignedAgent: body.assigned_agent,
    });

    return NextResponse.json({ data: lead });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}