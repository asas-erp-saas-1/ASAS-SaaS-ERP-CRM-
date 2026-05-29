import { kernel } from '@/lib/kernel/core';
import { Logger } from '@/lib/observability/logger';
import { ErrorTracker } from '@/lib/observability/errors';
import { BillingService } from './billing.service';

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed';

export class PaymentStateMachine {
  static async initiatePayment(invoiceId: string, amount: number, paymentMethod: string) {
    Logger.info('Initiating payment', { invoiceId, amount, paymentMethod });
    
    return await kernel.mutate<any>('payments', 'INSERT', {
      invoice_id: invoiceId,
      amount,
      status: 'pending',
      payment_method: paymentMethod
    });
  }

  static async markProcessing(paymentId: string, transactionId: string) {
    return await kernel.mutate<any>('payments', 'UPDATE', {
      status: 'processing',
      transaction_id: transactionId,
      updated_at: new Date().toISOString()
    }, { id: paymentId, status: 'pending' });
  }

  static async handleSuccess(paymentId: string) {
    Logger.info('Payment succeeded', { paymentId });
    
    await kernel.transaction(async (tx) => {
      const payment = await tx.mutate<any>('payments', 'UPDATE', {
        status: 'succeeded',
        updated_at: new Date().toISOString()
      }, { id: paymentId });

      if (payment && payment.invoice_id) {
         // Because we are inside a kernel tx we might need to inline or call the service with caution,
         // but since BillingService.markInvoicePaid mutates via the kernel, it will either join the tx context
         // or if our kernel doesn't support nested tx correctly we do it raw via current tx:
         await tx.mutate<any>('invoices', 'UPDATE', {
           status: 'paid',
           paid_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         }, { id: payment.invoice_id });
      }
    });
  }

  static async handleFailure(paymentId: string, errorMessage: string) {
    Logger.warn('Payment failed', { paymentId, errorMessage });
    ErrorTracker.captureRejection('Payment failed', { paymentId, errorMessage });
    
    return await kernel.mutate<any>('payments', 'UPDATE', {
      status: 'failed',
      error_message: errorMessage,
      updated_at: new Date().toISOString()
    }, { id: paymentId });
  }
}
