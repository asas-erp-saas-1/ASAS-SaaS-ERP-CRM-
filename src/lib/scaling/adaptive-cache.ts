import { CacheService } from '../cache/cache.service';
import { Metrics } from '../observability/metrics';

export class AdaptiveCache {
  static async getOrSet<T>(tenantId: string, key: string, fetcher: () => Promise<T>, baseTtl: number = 300): Promise<T> {
    const start = Date.now();
    const cached = await CacheService.get<T>(tenantId, key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    const duration = Date.now() - start;
    
    // Adaptive Strategy:
    // Heavy queries caching longer to shield the database
    let adaptiveTtl = baseTtl;
    if (duration > 1000) {
      adaptiveTtl = baseTtl * 2; // Double TTL for slow queries
    }
    
    await CacheService.set(tenantId, key, data, adaptiveTtl);
    return data;
  }
}
