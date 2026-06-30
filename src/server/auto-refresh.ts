import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/redis";
import { getLogger } from "@/lib/logger";
import { refreshAllSources } from "./refresh";

const log = getLogger("auto-refresh");

/** Data younger than this (minutes) is considered fresh enough on load. */
const STALE_AFTER_MINUTES = 3;
const LOCK_KEY = "refresh:lock";
const LOCK_TTL_SECONDS = 90;

/**
 * Ensure the dataset is fresh. Live-fetches from infralens when forced (the
 * Refresh button) or when the last run is stale (dashboard load). A short cache
 * lock prevents concurrent loads from stampeding the source.
 */
export async function ensureFreshData(
  { force = false }: { force?: boolean } = {},
): Promise<{ refreshed: boolean; reason: string; lastRefresh: string | null }> {
  if (!force) {
    const lastRun = await prisma.collectorRun.findFirst({
      where: { success: true },
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true },
    });
    if (lastRun) {
      const ageMin = (Date.now() - lastRun.finishedAt.getTime()) / 60000;
      if (ageMin < STALE_AFTER_MINUTES) {
        return {
          refreshed: false,
          reason: `fresh (${ageMin.toFixed(1)}m old)`,
          lastRefresh: lastRun.finishedAt.toISOString(),
        };
      }
    }
  }

  const locked = await cache.get<number>(LOCK_KEY);
  if (locked) {
    return { refreshed: false, reason: "refresh in progress", lastRefresh: null };
  }
  await cache.set(LOCK_KEY, Date.now(), LOCK_TTL_SECONDS);

  try {
    log.info({ force }, "live refresh triggered");
    const result = await refreshAllSources();
    return {
      refreshed: true,
      reason: result.usedFallback ? "refreshed (seed fallback)" : "refreshed",
      lastRefresh: new Date().toISOString(),
    };
  } finally {
    await cache.del(LOCK_KEY);
  }
}
