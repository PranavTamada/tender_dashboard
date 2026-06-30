import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/redis";
import { jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/health — liveness & dependency check for monitoring/uptime probes.
 * Always returns 200 with a structured status so probes can parse details.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true };
  } catch (err) {
    checks.database = { ok: false, detail: (err as Error).message };
  }

  // Cache
  try {
    const probe = `health:${Date.now()}`;
    await cache.set(probe, 1, 5);
    const got = await cache.get<number>(probe);
    checks.cache = { ok: got === 1 };
    await cache.del(probe);
  } catch (err) {
    checks.cache = { ok: false, detail: (err as Error).message };
  }

  // Last collector run
  let lastRefresh: string | null = null;
  try {
    const run = await prisma.collectorRun.findFirst({
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true },
    });
    lastRefresh = run ? run.finishedAt.toISOString() : null;
  } catch {
    /* reported via database check */
  }

  const healthy = Object.values(checks).every((c) => c.ok);
  return jsonOk({
    status: healthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
    lastRefresh,
    uptime: process.uptime(),
  });
}
