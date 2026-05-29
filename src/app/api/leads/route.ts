import { NextResponse } from 'next/server';
import { LeadService } from '@/services/leads/lead.service';
import { requirePermission, AuthorizationError } from '@/lib/auth/gates';
import { ErrorTracker } from '@/lib/observability/errors';

export async function GET(request: Request) {
  try {
    await requirePermission('LEADS', 'READ');

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const offset = (page - 1) * limit;

    const leads = await LeadService.getLeads(limit, offset);
    return NextResponse.json({ data: leads, count: leads.length });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    ErrorTracker.captureError(error, { context: 'GET /api/leads' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission('LEADS', 'CREATE');

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
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    ErrorTracker.captureError(error, { context: 'POST /api/leads' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}