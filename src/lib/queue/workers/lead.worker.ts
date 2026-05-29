import { kernel } from '@/lib/kernel/core';

export async function processLeadAssignment(payload: { tenantId: string, leadId: string }) {
  await kernel.transaction(async (tx) => {
    // Simulated round-robin logic
    console.log(`Assigning lead ${payload.leadId} in tenant ${payload.tenantId}`);
    
    // Find agents
    const agents = await tx.query<any>('profiles', {
      select: 'id',
      filters: { agency_id: payload.tenantId, role: 'agent' }
    });
    
    if (agents.length === 0) {
      console.log(`No agents found for tenant ${payload.tenantId}`);
      return;
    }
    
    // Pick first (simulated round robin fallback)
    const agentId = agents[0].id;
    
    await tx.mutate('leads', 'UPDATE', { assigned_to: agentId }, { id: payload.leadId });
    
    console.log(`Lead ${payload.leadId} assigned to ${agentId}`);
  });
}
