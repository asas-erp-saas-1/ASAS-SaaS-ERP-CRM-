import { createClient } from '@supabase/supabase-js';

// Server-side realtime broadcaster (trusted client)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-key'; 

const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export class RealtimeEngine {
  static async broadcast(tenantId: string, channel: string, event: string, payload: any) {
    if (!supabase) {
      console.log(`[Realtime Mock] Tenant: ${tenantId}, Channel: ${channel}, Event: ${event}`, payload);
      return;
    }
    
    try {
      const room = `tenant:${tenantId}:${channel}`;
      const ch = supabase.channel(room);
      
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await ch.send({
              type: 'broadcast',
              event: event,
              payload: payload
            });
          } catch (sendErr) {
            console.warn('[Realtime] Failed to send broadcast payload:', sendErr);
          } finally {
            // Give 2 seconds for packet delivery before pruning channel
            setTimeout(() => {
              supabase.removeChannel(ch).catch(() => {});
            }, 2000);
          }
        }
      });
    } catch (err) {
      console.warn('[Realtime] Error initializing or subscribing to channel:', err);
    }
  }

  static async notifyLeadCreated(tenantId: string, lead: any) {
    await this.broadcast(tenantId, 'leads', 'created', lead);
  }

  static async notifyDealUpdated(tenantId: string, deal: any) {
    await this.broadcast(tenantId, 'deals', 'updated', deal);
  }
}
