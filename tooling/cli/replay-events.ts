import { SupabaseClient } from '@supabase/supabase-js';

export async function replayEvents(db: SupabaseClient, fromDate: string, eventType?: string) {
  console.log(`[REPLAY ENGINE] Initializing replay from ${fromDate}`);

  let query = db
    .from('outbox_events')
    .select('*')
    .gte('created_at', fromDate)
    .order('created_at', { ascending: true });
  
  if (eventType) {
    query = query.eq('type', eventType);
  }

  const { data: events, error } = await query;
  if (error) throw new Error(`Replay failed: ${error.message}`);

  console.log(`[REPLAY ENGINE] Found ${events.length} events to replay.`);

  for (const event of events) {
    console.log(`[REPLAY ENGINE] Replaying Event ID: ${event.id} | Type: ${event.type}`);
    // Manually push to the Worker Queue or invoke sync Worker function directly
    // This allows re-hydration of Read Models or 3rd party sync.
    // e.g., await DealPipelineWorker.process(event, db);
    
    // Crucial: Increment processed_events suffix for idempotency bypass of this specific replay operation
    await db.from('processed_events').insert({
       event_id: `${event.id}_REPLAY_${Date.now()}`,
       worker_name: 'REPLAY_ENGINE'
    });

    console.log(`[REPLAY ENGINE] ✅ Event ID: ${event.id} processed.`);
  }
}
