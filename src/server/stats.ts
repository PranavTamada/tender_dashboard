import { format, startOfWeek, subDays, subWeeks } from "date-fns";
import type { MatchType, StatsResponse } from "@/types/tender";
import { prisma } from "@/lib/prisma";
import { cache, CACHE_KEYS } from "@/lib/redis";

const STATS_TTL_SECONDS = 30;
const TOP_N = 12;
const TREND_DAYS = 14;
const TREND_WEEKS = 8;

function topCounts(
  rows: Array<Record<string, unknown> & { _count: { _all: number } }>,
  field: string,
): { key: string; count: number }[] {
  return rows
    .map((r) => ({ key: (r[field] as string | null) ?? "—", count: r._count._all }))
    .filter((r) => r.key && r.key !== "—")
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N);
}

export async function getStats(): Promise<StatsResponse> {
  const cached = await cache.get<StatsResponse>(CACHE_KEYS.stats);
  if (cached) return cached;

  const [
    total,
    activeCount,
    closingSoonCount,
    valueAgg,
    byMatchTypeRaw,
    bySectorRaw,
    byStateRaw,
    keywordRows,
    recentRows,
    lastRun,
  ] = await Promise.all([
    prisma.tender.count(),
    prisma.tender.count({ where: { status: { in: ["OPEN", "CLOSING_SOON"] } } }),
    prisma.tender.count({ where: { status: "CLOSING_SOON" } }),
    prisma.tender.aggregate({ _sum: { estimatedValue: true } }),
    prisma.tender.groupBy({ by: ["matchType"], _count: { _all: true } }),
    prisma.tender.groupBy({
      by: ["sector"],
      _count: { _all: true },
      where: { sector: { not: null } },
    }),
    prisma.tender.groupBy({
      by: ["state"],
      _count: { _all: true },
      where: { state: { not: null } },
    }),
    prisma.tender.findMany({ select: { matchedKeywords: true } }),
    prisma.tender.findMany({
      where: { createdAt: { gte: subDays(new Date(), TREND_DAYS) } },
      select: { createdAt: true },
    }),
    prisma.collectorRun.findFirst({ orderBy: { finishedAt: "desc" } }),
  ]);

  const byMatchType: Record<MatchType, number> = { KEYWORD: 0, DEPARTMENT: 0 };
  for (const row of byMatchTypeRaw) byMatchType[row.matchType] = row._count._all;

  const keywordCounts = new Map<string, number>();
  for (const { matchedKeywords } of keywordRows) {
    for (const kw of matchedKeywords) {
      keywordCounts.set(kw, (keywordCounts.get(kw) ?? 0) + 1);
    }
  }
  const byKeyword = [...keywordCounts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N);

  // daily trend (last 14 days)
  const dailyMap = new Map<string, number>();
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    dailyMap.set(format(subDays(new Date(), i), "yyyy-MM-dd"), 0);
  }
  for (const { createdAt } of recentRows) {
    const key = format(createdAt, "yyyy-MM-dd");
    if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }
  const dailyTrend = [...dailyMap.entries()].map(([date, count]) => ({ date, count }));

  // weekly trend (last 8 weeks)
  const weeklyRows = await prisma.tender.findMany({
    where: { createdAt: { gte: subWeeks(new Date(), TREND_WEEKS) } },
    select: { createdAt: true },
  });
  const weeklyMap = new Map<string, number>();
  for (let i = TREND_WEEKS - 1; i >= 0; i--) {
    weeklyMap.set(format(startOfWeek(subWeeks(new Date(), i)), "yyyy-MM-dd"), 0);
  }
  for (const { createdAt } of weeklyRows) {
    const wk = format(startOfWeek(createdAt), "yyyy-MM-dd");
    if (weeklyMap.has(wk)) weeklyMap.set(wk, (weeklyMap.get(wk) ?? 0) + 1);
  }
  const weeklyTrend = [...weeklyMap.entries()].map(([week, count]) => ({ week, count }));

  const response: StatsResponse = {
    totalTenders: total,
    totalMatches: total,
    activeCount,
    closingSoonCount,
    totalValue: Number(valueAgg._sum.estimatedValue ?? 0),
    byMatchType,
    bySector: topCounts(bySectorRaw, "sector"),
    byState: topCounts(byStateRaw, "state"),
    byKeyword,
    dailyTrend,
    weeklyTrend,
    lastRefresh: lastRun ? lastRun.finishedAt.toISOString() : null,
  };

  await cache.set(CACHE_KEYS.stats, response, STATS_TTL_SECONDS);
  return response;
}
