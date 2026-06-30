import type { NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { ensureFreshData } from "@/server/auto-refresh";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { clientId, rateLimit } from "@/lib/rate-limit";

// Live fetch can take a few seconds (PoW + ~17 queries); ask for headroom.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function hasValidSecret(req: NextRequest): boolean {
  const secret = getEnv().REFRESH_SECRET;
  const auth = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  return auth === `Bearer ${secret}` || req.headers.get("x-refresh-secret") === secret || querySecret === secret;
}

/**
 * POST /api/refresh — live-fetches the latest tenders from infralens, stores
 * them, and returns the run summary. Runs entirely in this serverless function
 * (pure HTTP + PoW, no browser). Used by the dashboard's Refresh button
 * (`force=true`) and the on-load freshness check (`force=false`).
 */
export async function POST(req: NextRequest) {
  try {
    const privileged = hasValidSecret(req);
    if (!privileged) {
      const rl = await rateLimit(`refresh:${clientId(req)}`, {
        limit: 10,
        windowSeconds: 60,
      });
      if (!rl.allowed) {
        return jsonError(429, "Refresh rate limit exceeded — try again shortly");
      }
    }

    const force = req.nextUrl.searchParams.get("force") === "true";
    const result = await ensureFreshData({ force });
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** GET /api/refresh — secret-protected forced refresh (cron/uptime/manual). */
export async function GET(req: NextRequest) {
  try {
    if (!hasValidSecret(req)) return jsonError(401, "Unauthorized");
    const result = await ensureFreshData({ force: true });
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    return handleRouteError(err);
  }
}
