import { Redis } from '@upstash/redis';
import { Logger } from '../observability/logger';

const isPlaceholder = !process.env.UPSTASH_REDIS_REST_URL || 
                      process.env.UPSTASH_REDIS_REST_URL.includes('placeholder');

class InMemoryRedis {
  private store = new Map<string, { value: any; expiresAt: number | null }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<'OK' | null> {
    const expiresAt = options?.ex ? Date.now() + options.ex * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async keys(pattern: string): Promise<string[]> {
    const now = Date.now();
    const matches: string[] = [];
    const regexStr = '^' + pattern.replace(/\*/g, '.*') + '$';
    try {
      const regex = new RegExp(regexStr);
      for (const [key, item] of this.store.entries()) {
        if (item.expiresAt && now > item.expiresAt) {
          this.store.delete(key);
          continue;
        }
        if (regex.test(key)) {
          matches.push(key);
        }
      }
    } catch (_) {
      // safe fallback if regex build fails
      for (const [key] of this.store.entries()) {
        if (key.startsWith(pattern.replace('*', ''))) {
          matches.push(key);
        }
      }
    }
    return matches;
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        count++;
      }
    }
    return count;
  }
}

class SafeRedis {
  private client: Redis | null = null;
  private inMemory = new InMemoryRedis();

  constructor() {
    if (!isPlaceholder) {
      try {
        this.client = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });
      } catch (err) {
        Logger.warn('Failed to initialize Upstash Redis client. Defaulting to in-memory fallback.', { error: String(err) });
      }
    } else {
      Logger.debug('Upstash Redis not configured or using placeholders. Running on In-Memory Fallback Cache.');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.client) {
      try {
        return await this.client.get<T>(key);
      } catch (err) {
        Logger.warn('Upstash Redis error during get; falling back to memory.', { key, error: String(err) });
      }
    }
    return this.inMemory.get<T>(key);
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<any> {
    if (this.client) {
      try {
        return await this.client.set(key, value, options as any);
      } catch (err) {
        Logger.warn('Upstash Redis error during set; falling back to memory.', { key, error: String(err) });
      }
    }
    return this.inMemory.set(key, value, options);
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.client) {
      try {
        return await this.client.keys(pattern);
      } catch (err) {
        Logger.warn('Upstash Redis error during keys; falling back to memory.', { pattern, error: String(err) });
      }
    }
    return this.inMemory.keys(pattern);
  }

  async del(...keys: string[]): Promise<number> {
    if (this.client) {
      try {
        return await this.client.del(...keys);
      } catch (err) {
        Logger.warn('Upstash Redis error during del; falling back to memory.', { keys, error: String(err) });
      }
    }
    return this.inMemory.del(...keys);
  }
}

export const redis = new SafeRedis() as unknown as Redis;

