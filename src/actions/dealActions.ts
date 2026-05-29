'use server';

import { DealService } from '@/services/deals/deal.service';
import { ErrorTracker } from '@/lib/observability/errors';
import { revalidatePath } from 'next/cache';
import { Database } from '@/types/supabase';

export async function createDealAction(data: any) {
  try {
    const deal = await DealService.createDeal(data);
    revalidatePath('/dashboard/deals');
    return { success: true, data: deal };
  } catch (error: any) {
    ErrorTracker.captureError(error, { context: 'createDealAction' });
    return { success: false, error: error.message };
  }
}

export async function updateDealStageAction(id: string, stage: Database['public']['Enums']['deal_status'], currentVersion: number = 1, metadata?: { lostReason?: string }) {
  try {
    const deal = await DealService.changeDealStatus(id, stage, currentVersion, metadata);
    revalidatePath('/dashboard/deals');
    return { success: true, data: deal };
  } catch (error: any) {
    ErrorTracker.captureError(error, { context: 'updateDealStageAction' });
    return { success: false, error: error.message };
  }
}

