'use server';

import { LeadService } from '@/services/leads/lead.service';
import { ErrorTracker } from '@/lib/observability/errors';
import { revalidatePath } from 'next/cache';
import { Database } from '@/types/supabase';

export async function updateLeadStatusAction(
  id: string, 
  newStatus: Database['public']['Enums']['lead_status'],
  metadata?: { lostReason?: string }
) {
  try {
    const lead = await LeadService.updateStatus(id, newStatus, metadata);
    revalidatePath('/dashboard/leads');
    return { success: true, data: lead };
  } catch (error: any) {
    ErrorTracker.captureError(error, { context: 'updateLeadStatusAction' });
    return { success: false, error: error.message };
  }
}

