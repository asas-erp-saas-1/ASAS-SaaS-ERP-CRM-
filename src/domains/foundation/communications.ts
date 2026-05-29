// src/domains/foundation/communications.ts

import { kernel } from '@/lib/kernel/core';
import { CommunicationLog } from './types';
import { Audit } from './audit';

export class CommunicationEngine {
  /**
   * Enqueues a notification log (WhatsApp or Internal system notice) to be picked up by worker threads.
   */
  public static async enqueue(
    message: Omit<CommunicationLog, 'id' | 'deliveryStatus' | 'retryCount' | 'maxRetries' | 'sendAfter'> & {
      sendAfter?: string;
    }
  ): Promise<any> {
    const identity = await kernel.identity();
    
    const payload = {
      agency_id: identity.tenantId,
      recipient_type: message.recipientType,
      recipient_id: message.recipientId,
      recipient_phone: message.recipientPhone,
      channel: message.channel,
      message_content: message.messageContent,
      whatsapp_template_name: message.whatsappTemplateName || null,
      whatsapp_template_variables: message.whatsappTemplateVariables ? JSON.stringify(message.whatsappTemplateVariables) : null,
      delivery_status: 'pending',
      retry_count: 0,
      max_retries: 3,
      send_after: message.sendAfter || new Date().toISOString()
    };

    const record = await kernel.mutate<any>('communication_logs', 'INSERT', payload);

    await Audit.log({
      operationType: 'COMMUNICATION_QUEUED',
      entityType: 'communication',
      entityId: record.id,
      newValues: { channel: message.channel, recipientType: message.recipientType }
    });

    return record;
  }

  /**
   * Triggers immediately or marks a communication log dispatch as successfully delivered.
   */
  public static async markDispatched(
    logId: string,
    status: 'sent' | 'delivered' | 'failed',
    errorMsg?: string
  ): Promise<any> {
    const payload: Record<string, any> = {
      delivery_status: status,
      sent_at: status === 'failed' ? null : new Date().toISOString()
    };

    if (errorMsg) {
      payload.error_message = errorMsg;
    }

    const updated = await kernel.mutate<any>('communication_logs', 'UPDATE', payload, { id: logId });

    await Audit.log({
      operationType: `COMMUNICATION_DISPATCH_${status.toUpperCase()}`,
      entityType: 'communication',
      entityId: logId,
      newValues: { status, errorMsg }
    });

    return updated;
  }

  /**
   * Retrieves pending or retriable messages from the transmission queue
   */
  public static async fetchPendingQueue(): Promise<any[]> {
    try {
      const now = new Date().toISOString();
      const records = await kernel.query('communication_logs', {
        filters: { delivery_status: 'pending' }
      });
      return records.filter((r: any) => new Date(r.send_after) <= new Date(now));
    } catch {
      return [];
    }
  }
}
export const Communications = CommunicationEngine;
