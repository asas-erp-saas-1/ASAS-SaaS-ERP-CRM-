import { Client } from '@upstash/qstash';

export const qstash = new Client({ token: process.env.QSTASH_TOKEN || 'MISSING_TOKEN' });

export class QueueService {
  /**
   * Dispatches a background job.
   */
  static async dispatch(topic: string, payload: any, options?: { delaySeconds?: number }) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const endpoint = `${baseUrl}/api/queue/${topic}`;
    
    const req: any = {
      url: endpoint,
      body: payload,
    };
    if (options?.delaySeconds) {
       req.delay = options.delaySeconds;
    }
    await qstash.publishJSON(req);
  }
}
