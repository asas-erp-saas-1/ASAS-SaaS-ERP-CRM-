import { NextResponse } from 'next/server';
import { redis } from '@/lib/cache/redis';
import { ErrorTracker } from '@/lib/observability/errors';

const DEFAULT_CONFIG = {
  inactivityYellowHours: 24,
  inactivityRedHours: 48,
  inactivityCriticalHours: 72,
  survivalThresholdDZD: 1000000,
  cautionThresholdDZD: 2000000,
  defaultCommissionPct: 5,
  maxCommissionPct: 10,
  commissionRequiresApproval: true,
  leadExpiryDays: 30,
  maxLeadsPerAgent: 50,
  monteCarloIterations: 1000,
  forecastWindowMonths: 6,
  whatsappNotifications: true,
  notifyManagerOnEscalation: true,
  agencyName: 'ASAS Real Estate',
  currency: 'DZD',
  timezone: 'Africa/Algiers'
};

export async function GET(request: Request) {
  try {
    const cached = await redis.get<typeof DEFAULT_CONFIG>('tenant:config:default');
    return NextResponse.json(cached || DEFAULT_CONFIG);
  } catch (error: any) {
    ErrorTracker.captureError(error, { context: 'GET /api/config' });
    return NextResponse.json(DEFAULT_CONFIG); // Fallback so UI doesn't crash if redis fails
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const current = await redis.get<typeof DEFAULT_CONFIG>('tenant:config:default') || DEFAULT_CONFIG;
    const merged = { ...current, ...body };
    
    await redis.set('tenant:config:default', merged);
    
    return NextResponse.json(merged);
  } catch (error: any) {
    ErrorTracker.captureError(error, { context: 'PATCH /api/config' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
