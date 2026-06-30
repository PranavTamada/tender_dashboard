import { Redis } from "@upstash/redis";
import { getLogger } from "./logger";

const log = getLogger("cache");

/**
 * Cache abstraction backed by Upstash Redis when configured, with a
 * process-local in-memory LRU fallback so the app works with zero config
 * in local dev / CI. The interface is intentionally tiny.
 */
interface CacheBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPrefix(prefix: string): Promise<void>;
}

class MemoryCache implements CacheBackend {
  private store = new Map<string, { value: unknown; expires: number }>();

  async get<T>(key: string): Promise<T | null> {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (hit.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return hit.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

class RedisCache implements CacheBackend {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    return (await this.redis.get<T>(key)) ?? null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, { ex: ttlSeconds });
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    // Upstash supports SCAN; keep batches small to stay within limits.
    let cursor = 0;
    do {
      const [next, keys] = await this.redis.scan(cursor, {
        match: `${prefix}*`,
        count: 100,
      });
      cursor = Number(next);
      if (keys.length) await this.redis.del(...keys);
    } while (cursor !== 0);
  }
}

function createCache(): CacheBackend {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    log.info("Using Upstash Redis cache");
    return new RedisCache(new Redis({ url, token }));
  }
  log.warn("Upstash Redis not configured — using in-memory cache fallback");
  return new MemoryCache();
}

const globalForCache = globalThis as unknown as {
  cache: CacheBackend | undefined;
};

export const cache: CacheBackend = globalForCache.cache ?? createCache();
if (process.env.NODE_ENV !== "production") globalForCache.cache = cache;

export const CACHE_KEYS = {
  tenders: "tenders:list:",
  stats: "stats:summary",
  tender: "tenders:item:",
} as const;

/** Invalidate all derived caches after a refresh/persist. */
export async function invalidateTenderCaches(): Promise<void> {
  await Promise.all([
    cache.delByPrefix(CACHE_KEYS.tenders),
    cache.del(CACHE_KEYS.stats),
    cache.delByPrefix(CACHE_KEYS.tender),
  ]);
}
