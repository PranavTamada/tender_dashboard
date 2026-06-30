import { cache } from "./redis";

/**
 * Lightweight fixed-window rate limiter backed by the shared cache. Works with
 * both Upstash and the in-memory fallback. Not perfectly atomic on the memory
 * backend, but sufficient for protecting public read/refresh endpoints.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
}

export async function rateLimit(
  identifier: string,
  { limit = 60, windowSeconds = 60 }: { limit?: number; windowSeconds?: number } = {},
): Promise<RateLimitResult> {
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `ratelimit:${identifier}:${bucket}`;
  const current = (await cache.get<number>(key)) ?? 0;
  const next = current + 1;
  await cache.set(key, next, windowSeconds);
  return {
    allowed: next <= limit,
    remaining: Math.max(0, limit - next),
    limit,
    resetSeconds: windowSeconds,
  };
}

/** Extract a best-effort client identifier from request headers. */
export function clientId(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "anonymous";
}
