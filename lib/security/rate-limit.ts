import { cache } from "@/lib/cache/cache";

export type RateLimit = { name: string; limit: number; windowSeconds: number };

/** Fixed-window limiter on top of the cache abstraction. */
export async function checkRateLimit(rule: RateLimit, identity: string) {
  const bucket = Math.floor(Date.now() / (rule.windowSeconds * 1000));
  const count = await cache.incr(`rl:${rule.name}:${identity}:${bucket}`, rule.windowSeconds);
  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfter: rule.windowSeconds,
  };
}

export const LIMITS = {
  default: { name: "default", limit: 120, windowSeconds: 60 },
  write: { name: "write", limit: 30, windowSeconds: 60 },
  auth: { name: "auth", limit: 10, windowSeconds: 300 },
  redirect: { name: "redirect", limit: 60, windowSeconds: 60 },
  ai: { name: "ai", limit: 10, windowSeconds: 300 },
  analytics: { name: "analytics", limit: 240, windowSeconds: 60 },
} satisfies Record<string, RateLimit>;
