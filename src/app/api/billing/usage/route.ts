import { NextResponse } from 'next/server';
import { BillingService } from '@/services/billing/billing.service';
import { kernel } from '@/lib/kernel/core';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const identity = await kernel.identity();
    const subscription = await BillingService.getSubscription(identity.tenantId);
    
    return NextResponse.json({
      monthly_limit: subscription?.plan === 'elite' ? 10000 : 1000,
      current_usage: 245, // In a real scenario, this would be computed by UsageService
      active_users: 5
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
