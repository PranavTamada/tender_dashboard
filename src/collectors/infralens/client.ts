import { createHash } from "node:crypto";
import { getEnv } from "@/lib/env";
import { getLogger } from "@/lib/logger";
import { cache } from "@/lib/redis";
import type { InfralensResult } from "../types";

const log = getLogger("infralens-client");

/**
 * Client for the infralens / BidEasy tender API (tenders.infralens.in).
 *
 * The `/api/search` endpoint is gated by a lightweight SHA-256 proof-of-work:
 *   1. GET  /api/challenge → { c, zeros }
 *   2. find nonce n where sha256(`${c}:${n}`) starts with `zeros` hex zeros
 *   3. POST /api/pass { c, n } → sets the `bqs` cookie (the access token)
 *   4. GET  /api/search?q=… with that cookie → structured JSON results
 *
 * The token is reused across requests and cached (Redis or in-memory) so we
 * only solve the PoW occasionally. This is pure Node — no browser — so it runs
 * inside a Vercel serverless function.
 */

const BASE = "https://tenders.infralens.in";
const TOKEN_CACHE_KEY = "infralens:token";
const TOKEN_TTL_SECONDS = 80 * 60; // refresh well before the ~2h server expiry
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface SearchResponse {
  count?: number;
  results?: InfralensResult[];
  token_required?: boolean;
  meta?: { count?: number; status_counts?: Record<string, number> };
}

function sha256hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function extractCookie(res: Response): string | null {
  // Node's fetch exposes multiple Set-Cookie via getSetCookie().
  const all =
    (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ??
    (res.headers.get("set-cookie") ? [res.headers.get("set-cookie") as string] : []);
  const pieces = all
    .map((c) => c.split(";")[0])
    .filter((c) => /^(bqs|nl|sid)=/.test(c));
  return pieces.length ? pieces.join("; ") : null;
}

export class InfralensClient {
  private cookie: string | null = null;

  private headers(extra: Record<string, string> = {}): HeadersInit {
    return {
      "user-agent": UA,
      accept: "application/json,text/plain,*/*",
      "accept-language": "en-IN,en;q=0.9",
      ...(this.cookie ? { cookie: this.cookie } : {}),
      ...extra,
    };
  }

  /** Solve the PoW and store the resulting access cookie. */
  private async solveChallenge(): Promise<void> {
    const timeout = getEnv().COLLECTOR_TIMEOUT_MS;
    const chRes = await fetch(`${BASE}/api/challenge`, {
      headers: this.headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
    });
    const chCookie = extractCookie(chRes);
    if (chCookie) this.cookie = chCookie;
    const { c, zeros = 3 } = (await chRes.json()) as { c: string; zeros?: number };

    const target = "0".repeat(zeros);
    let n = 0;
    const MAX = 8_000_000;
    for (; n < MAX; n++) {
      if (sha256hex(`${c}:${n}`).slice(0, zeros) === target) break;
    }
    if (n >= MAX) throw new Error("PoW not solved within bound");

    const passRes = await fetch(`${BASE}/api/pass`, {
      method: "POST",
      headers: this.headers({ "content-type": "application/json" }),
      body: JSON.stringify({ c, n }),
      signal: AbortSignal.timeout(timeout),
    });
    const passCookie = extractCookie(passRes);
    if (!passCookie) throw new Error(`/api/pass returned no token (${passRes.status})`);
    this.cookie = this.cookie ? `${this.cookie}; ${passCookie}` : passCookie;
    await cache.set(TOKEN_CACHE_KEY, this.cookie, TOKEN_TTL_SECONDS);
    log.info({ zeros, nonce: n }, "solved PoW, cached token");
  }

  private async ensureToken(): Promise<void> {
    if (this.cookie) return;
    const cached = await cache.get<string>(TOKEN_CACHE_KEY);
    if (cached) {
      this.cookie = cached;
      return;
    }
    await this.solveChallenge();
  }

  /** Acquire the PoW token up front (so parallel searches don't all solve it). */
  async warm(): Promise<void> {
    await this.ensureToken();
  }

  private async fetchSearch(url: string): Promise<SearchResponse> {
    const res = await fetch(url, {
      headers: this.headers(),
      signal: AbortSignal.timeout(getEnv().COLLECTOR_TIMEOUT_MS),
    });
    return (await res.json()) as SearchResponse;
  }

  /**
   * Run a single search query with transient-error retries (timeouts, network,
   * 5xx) and one PoW re-solve on `token_required`.
   */
  async search(query: string, limit = 100): Promise<InfralensResult[]> {
    await this.ensureToken();
    // Space out requests to avoid tripping infralens's rate limiter (which
    // returns empty result sets rather than an error when hammered).
    const rl = getEnv().COLLECTOR_RATE_LIMIT_MS;
    if (rl > 0) await sleep(rl);
    const url = `${BASE}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const maxRetries = getEnv().COLLECTOR_MAX_RETRIES;

    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let json = await this.fetchSearch(url);
        if (json.token_required) {
          this.cookie = null;
          await cache.del(TOKEN_CACHE_KEY);
          await this.solveChallenge();
          json = await this.fetchSearch(url);
        }
        if (json.token_required) throw new Error("token_required after re-solve");
        return json.results ?? [];
      } catch (err) {
        lastErr = err;
        if (attempt < maxRetries) await sleep(Math.min(2 ** attempt * 500, 4000));
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("search failed");
  }
}
