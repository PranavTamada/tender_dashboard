import type { NextRequest } from "next/server";
import { getStats } from "@/server/stats";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { clientId, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/stats — aggregate analytics for the dashboard. */
export async function GET(req: NextRequest) {
  try {
    const rl = await rateLimit(`stats:${clientId(req)}`, { limit: 120 });
    if (!rl.allowed) return jsonError(429, "Too many requests");

    const stats = await getStats();
    return jsonOk(stats);
  } catch (err) {
    return handleRouteError(err);
  }
}
