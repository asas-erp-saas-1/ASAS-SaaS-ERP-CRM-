import { NextResponse } from 'next/server';
import { kernel } from '@/lib/kernel/core';
import { requirePermission, AuthorizationError } from '@/lib/auth/gates';
import { ErrorTracker } from '@/lib/observability/errors';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requirePermission('CLIENTS', 'READ');

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const offset = (page - 1) * limit;

    const clients = await kernel.query('clients', {
      limit,
      offset,
      orderBy: { column: 'created_at', ascending: false }
    });
    return NextResponse.json({ data: clients, count: clients.length });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    ErrorTracker.captureError(error, { context: 'GET /api/clients' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await requirePermission('CLIENTS', 'CREATE');

    const body = await request.json();
    
    // Minimal validation
    if (!body.full_name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const client = await kernel.mutate('clients', 'INSERT', {
      agency_id: identity.tenantId,
      full_name: body.full_name,
      phone: body.phone || null,
      email: body.email || null,
      type: body.type || 'buyer',
      source: body.source || null,
    });

    return NextResponse.json({ data: client });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    ErrorTracker.captureError(error, { context: 'POST /api/clients' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
