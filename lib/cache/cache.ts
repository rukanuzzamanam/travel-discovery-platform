/**
 * Cache abstraction. The default implementation is in-process memory.
 * Swap `cache` for a Redis-backed implementation of `CacheStore` without touching callers.
 */
export interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  /** Increment a counter that expires after ttlSeconds (used for rate limiting). */
  incr(key: string, ttlSeconds: number): Promise<number>;
}

/** Recommended TTLs. Static reference data lives long; volatile travel data lives short. */
export const TTL = {
  static: 60 * 60 * 6, // airports, countries, cities, destination metadata
  content: 60 * 10,
  price: 60 * 15, // flight / hotel prices
  availability: 60 * 5,
} as const;

type Entry = { value: unknown; expires: number };

export class MemoryCache implements CacheStore {
  private store = new Map<string, Entry>();
  constructor(private maxEntries = 5000) {}

  async get<T>(key: string) {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    if (this.store.size >= this.maxEntries) {
      const first = this.store.keys().next().value;
      if (first !== undefined) this.store.delete(first);
    }
    this.store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }

  async delete(key: string) {
    this.store.delete(key);
  }

  async incr(key: string, ttlSeconds: number) {
    const now = Date.now();
    const hit = this.store.get(key);
    if (!hit || hit.expires < now) {
      this.store.set(key, { value: 1, expires: now + ttlSeconds * 1000 });
      return 1;
    }
    hit.value = (hit.value as number) + 1;
    return hit.value as number;
  }
}

const g = globalThis as unknown as { __triporaCache?: CacheStore };
export const cache: CacheStore = (g.__triporaCache ??= new MemoryCache());

/** Read-through helper. */
export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  const hit = await cache.get<T>(key);
  if (hit !== undefined) return hit;
  const value = await load();
  await cache.set(key, value, ttlSeconds);
  return value;
}
