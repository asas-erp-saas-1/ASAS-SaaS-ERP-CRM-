import { redis } from '../cache/redis';
import { ErrorTracker } from '../observability/errors';

export class RateLimiter {
  static async checkLimit(tenantId: string, resource: string, limit: number, windowSecs: number): Promise<boolean> {
    const key = `ratelimit:${tenantId}:${resource}`;
    try {
      const current = await redis.get<number>(key) || 0;
      if (current >= limit) {
        ErrorTracker.captureRejection(`Rate limit exceeded for ${tenantId} on ${resource}`);
        return false;
      }
      
      await redis.set(key, current + 1, { ex: windowSecs });
      return true;
    } catch (e) {
      ErrorTracker.captureError(e, { context: 'RateLimiter' });
      // Fail open to ensure availability
      return true; 
    }
  }
}
