import { redis } from '../cache/redis';

export class Metrics {
  static async recordRequestTime(tenantId: string, route: string, durationMs: number) {
    const key = `metrics:${tenantId}:req_time:${route}`;
    try {
      await redis.set(`${key}:${Date.now()}`, durationMs, { ex: 86400 });
    } catch (e) {
      // Non-blocking observability failure handling
    }
  }

  static async recordQueryPerformance(tenantId: string, table: string, durationMs: number) {
    const key = `metrics:${tenantId}:query:${table}`;
    try {
      await redis.set(`${key}:${Date.now()}`, durationMs, { ex: 86400 });
    } catch (e) {}
  }

  static async recordCacheHitRate(tenantId: string, hit: boolean) {
    const key = `metrics:${tenantId}:cache`;
    try {
      // Get and set to ensure exact metric increment
      const current = await redis.get<number>(`${key}:${hit ? 'hit' : 'miss'}`) || 0;
      await redis.set(`${key}:${hit ? 'hit' : 'miss'}`, current + 1);
    } catch (e) {}
  }
}
