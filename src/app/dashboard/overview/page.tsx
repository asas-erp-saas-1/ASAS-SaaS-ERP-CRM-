// src/app/dashboard/overview/page.tsx
import { Metadata } from 'next'
import { AgentActionFeed } from '@/modules/workspace/components/AgentActionFeed'
import { LayoutDashboard } from 'lucide-react'
import { getMetricsData } from '@/actions/metricActions'
import { kernel } from '@/lib/kernel/core'
import { redirect } from 'next/navigation'

  export const metadata: Metadata = {
    title: 'Action Inbox — ASAS RE-OS',
    description: 'Unified action queue for all pending tasks and operations.',
  }

export default async function OverviewPage() {
  let metrics;
  let identity;
  let shouldRedirectTo: string | null = null;
  let unhandledError = null;

  try {
    try {
      metrics = await getMetricsData();
      identity = await kernel.identity();
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (errorMsg.includes('Tenant isolation failure')) {
        shouldRedirectTo = '/onboarding';
      } else {
        shouldRedirectTo = '/login';
      }
    }

    if (shouldRedirectTo) {
      redirect(shouldRedirectTo);
    }

    // Fallback to prevent crash if redirect fails or is in progress
    if (!identity) {
      return null;
    }

    // Load actionable tasks for ALL ROLES
    let mappedActions: any[] = [];
    try {
      // If admin/owner, maybe load ALL pending SLA breaches and approvals. For now, load tasks assigned to user.
      const taskFilters: any = { assigned_to: identity!.userId, status: 'pending' };
      // Note: A true enterprise logic would check roles to load global approvals if admin.
      
      const tasks = await kernel.query('tasks', { 
        filters: taskFilters,
        limit: 20,
        orderBy: { column: 'due_date', ascending: true }
      });

        // 1. Gather all non-null lead_ids and deal_ids to load in bulk
        const leadIds = Array.from(new Set((tasks || []).map((t: any) => t.lead_id).filter(Boolean)));
        const dealIds = Array.from(new Set((tasks || []).map((t: any) => t.deal_id).filter(Boolean)));

        // 2. Query all leads and deals in bulk
        const leadsList = leadIds.length > 0 
          ? await kernel.query<any>('leads', { filters: { id: leadIds } }) 
          : [];
        const dealsList = dealIds.length > 0 
          ? await kernel.query<any>('deals', { filters: { id: dealIds } }) 
          : [];

        // Map leads and deals by ID for constant time lookups
        const leadsMap = new Map<string, any>(leadsList.map(l => [l.id, l]));
        const dealsMap = new Map<string, any>(dealsList.map(d => [d.id, d]));

        // Gather all client_ids from both maps
        const clientIds = Array.from(new Set([
          ...leadsList.map(l => l.client_id).filter(Boolean),
          ...dealsList.map(d => d.client_id).filter(Boolean)
        ]));

        // Query all clients in bulk
        const clientsList = clientIds.length > 0 
          ? await kernel.query<any>('clients', { filters: { id: clientIds } }) 
          : [];
        const clientsMap = new Map<string, any>(clientsList.map(c => [c.id, c]));

        // 3. Assemble tasks mapping in-memory (O(1) lookup per item)
        mappedActions = (tasks || []).map((t: any) => {
           let leadName = 'Tâche Interne';
           let phone = '';
           let type = t.priority === 'urgent' ? 'urgent' : (t.priority === 'high' ? 'whatsapp' : 'viewing');
           
           if (t.lead_id) {
             const lead = leadsMap.get(t.lead_id);
             if (lead && lead.client_id) {
                const client = clientsMap.get(lead.client_id);
                if (client) {
                   leadName = client.full_name;
                   phone = client.phone || '';
                }
             }
           } else if (t.deal_id) {
             const deal = dealsMap.get(t.deal_id);
             if (deal) {
                leadName = `Deal #${deal.id.substring(0,8)}`;
                if (deal.client_id) {
                   const client = clientsMap.get(deal.client_id);
                   if (client) {
                      leadName = client.full_name;
                      phone = client.phone || '';
                   }
                }
             }
           }

           let timeStr = t.due_date ? new Date(t.due_date).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short' }) : 'ASAP';
           if (t.due_date && new Date(t.due_date) < new Date()) {
             type = 'urgent';
             timeStr = 'En retard';
           }

           return {
             id: t.id,
             type: type,
             task: t.title,
             leadName: leadName,
             time: timeStr,
             phone: phone
           };
        });
      } catch (err) {
        console.error('Failed to fetch agent tasks:', err);
        // Fallback mappedActions remains empty array
      }

      return (
        <div className="w-full">
          <div className="flex flex-col gap-2 mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-asas-charcoal dark:text-asas-sand tracking-tight flex items-center gap-3 font-display uppercase">
               <div className="w-12 h-12 rounded-sm bg-asas-navy border border-asas-gold/20 flex items-center justify-center shadow-[0_0_20px_rgba(199,161,90,0.1)]">
                   <LayoutDashboard className="h-6 w-6 text-asas-gold" strokeWidth={1.5} /> 
               </div>
               Action Inbox <span className="text-asas-silver mx-2 opacity-50 font-sans font-light">|</span> صندوق مهام
            </h1>
            <p className="text-sm font-bold text-asas-silver uppercase tracking-widest pl-1">Centre de Commandement Exécutif</p>
          </div>
          <AgentActionFeed actions={mappedActions} />
        </div>
      );
  } catch (err: any) {
    if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    unhandledError = err;
  }

  if (unhandledError) {
    return (
      <div className="p-8 bg-red-900 border border-red-500 rounded text-black m-8">
        <h1 className="text-xl font-bold">Overview Page Unhandled Crash</h1>
        <pre className="mt-4 p-4 bg-black text-red-500 border border-red-500/50 rounded">{String(unhandledError.message)}</pre>
        <pre className="mt-4 text-xs opacity-50">{String((unhandledError as any)?.stack)}</pre>
      </div>
    );
  }
}
