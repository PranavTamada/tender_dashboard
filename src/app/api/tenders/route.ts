import type { NextRequest } from "next/server";
import { tenderQuerySchema } from "@/types/tender";
import { queryTenders } from "@/server/tenders";
import { handleRouteError, jsonError, jsonOk, rateLimitHeaders } from "@/lib/api";
import { clientId, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/tenders
 * Paginated, filterable, sortable tender list. All query params are validated
 * with Zod; see `tenderQuerySchema` for the full contract.
 */
export async function GET(req: NextRequest) {
  try {
    const rl = await rateLimit(`tenders:${clientId(req)}`, { limit: 120 });
    if (!rl.allowed) {
      return jsonError(429, "Too many requests", null);
    }

    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = tenderQuerySchema.parse(params);
    const result = await queryTenders(query);

    return jsonOk(result, { headers: rateLimitHeaders(rl) });
  } catch (err) {
    return handleRouteError(err);
  }
}
