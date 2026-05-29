import { NextResponse } from 'next/server';
import { kernel } from '@/lib/kernel/core';
import { ErrorTracker } from '@/lib/observability/errors';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, agentId, operations } = body;

    if (!operations || !Array.isArray(operations)) {
      return NextResponse.json({ error: 'Operations array is required' }, { status: 400 });
    }

    const identity = await kernel.identity();

    // Process batched sync operations transactionally using the Kernel
    const results = await kernel.transaction(async (tx) => {
      const processed = [];
      const failures = [];

      for (const op of operations) {
        try {
          if (op.entityType === 'lead') {
             if (op.operation === 'create') {
               const leadDate = await tx.mutate<any>('leads', 'INSERT', {
                 ...op.payload,
                 agency_id: identity.tenantId
               });
               processed.push({ tempId: op.tempId, realId: leadDate.id });
             } else if (op.operation === 'update') {
               const leadDate = await tx.mutate<any>('leads', 'UPDATE', {
                 ...op.payload,
                 version: op.version ? op.version + 1 : 2
               }, { id: op.payload.id });
               processed.push({ tempId: op.tempId, realId: leadDate.id });
             }
          }
          // Same logic for deals and activities...
          else if (op.entityType === 'deal') {
             if (op.operation === 'create') {
               const dealDate = await tx.mutate<any>('deals', 'INSERT', {
                 ...op.payload,
                 agency_id: identity.tenantId
               });
               processed.push({ tempId: op.tempId, realId: dealDate.id });
             } else if (op.operation === 'update') {
               const dealDate = await tx.mutate<any>('deals', 'UPDATE', {
                 ...op.payload,
                 version: op.version ? op.version + 1 : 2
               }, { id: op.payload.id });
               processed.push({ tempId: op.tempId, realId: dealDate.id });
             }
          } else {
             failures.push({ tempId: op.tempId, reason: `Unknown entity type: ${op.entityType}` });
          }
        } catch (opError: any) {
          failures.push({ tempId: op.tempId, reason: opError.message });
        }
      }
      return { processed, failures };
    });

    return NextResponse.json({ success: true, ...results });
  } catch (error: any) {
    ErrorTracker.captureError(error, { context: 'POST /api/sync' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
