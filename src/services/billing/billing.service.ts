import { kernel } from '@/lib/kernel/core';
import { Logger } from '@/lib/observability/logger';

export type PlanType = 'basic' | 'pro' | 'elite';
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';

export class BillingService {
  static async getSubscription(tenantId: string) {
    const subs = await kernel.query<any>('agencies', {
      filters: { id: tenantId },
      orderBy: { column: 'created_at', ascending: false },
      limit: 1
    });
    return subs.length > 0 ? subs[0] : null;
  }

  static async generateDraftInvoice(tenantId: string, amount: number, description: string) {
    Logger.info('Generating draft invoice', { tenantId, amount });
    return await kernel.mutate<any>('invoices', 'INSERT', {
      amount,
      description,
      status: 'draft',
      currency: 'DZD',
      created_at: new Date().toISOString()
    });
  }

  static async finalizeInvoice(invoiceId: string, dueDate: Date) {
    Logger.info('Finalizing invoice (draft -> open)', { invoiceId });
    return await kernel.mutate<any>('invoices', 'UPDATE', {
      status: 'open',
      due_date: dueDate.toISOString(),
      updated_at: new Date().toISOString()
    }, { id: invoiceId, status: 'draft' });
  }

  static async markInvoicePaid(invoiceId: string) {
    Logger.info('Marking invoice as paid', { invoiceId });
    return await kernel.mutate<any>('invoices', 'UPDATE', {
      status: 'paid',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { id: invoiceId });
  }

  static async chargeMonthly(tenantId: string) {
    await kernel.transaction(async (tx) => {
      const sub = await this.getSubscription(tenantId);
      if (!sub) return;

      let amount = 0;
      switch (sub.plan) {
        case 'basic': amount = 4900; break;
        case 'pro': amount = 9900; break;
        case 'elite': amount = 29900; break;
      }

      // Generate invoice
      const invoice = await tx.mutate<any>('invoices', 'INSERT', {
        amount,
        description: `${String(sub.plan).toUpperCase()} Plan - Monthly Subscription`,
        status: 'open',
        currency: 'DZD',
        created_at: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // due in 7 days
      });
      
      Logger.info(`Monthly subscription invoice created`, { tenantId, invoiceId: invoice.id });
    });
  }
}
