import type { Prisma } from "@prisma/client";
import type { NormalizedTender, RefreshResponse } from "@/types/tender";
import { prisma } from "@/lib/prisma";
import { invalidateTenderCaches } from "@/lib/redis";
import { getLogger } from "@/lib/logger";
import { InfralensCollector } from "@/collectors/infralens";

const log = getLogger("refresh");

function toPrismaData(t: NormalizedTender): Prisma.TenderUncheckedCreateInput {
  return {
    portal: t.portal,
    level: t.level,
    sourceTenderId: t.sourceTenderId,
    title: t.title,
    description: t.description,
    organization: t.organization,
    department: t.department,
    sector: t.sector,
    workType: t.workType,
    state: t.state,
    city: t.city,
    publishedDate: t.publishedDate,
    closingDate: t.closingDate,
    estimatedValue: t.estimatedValue ?? null,
    valueBand: t.valueBand,
    currency: t.currency,
    url: t.url,
    status: t.status,
    matchType: t.matchType,
    matchedKeywords: t.matchedKeywords,
    dedupeHash: t.dedupeHash,
    rawData: (t.rawData ?? undefined) as Prisma.InputJsonValue | undefined,
  };
}

/**
 * Run the infralens collector, upsert results (on dedupeHash), record the run,
 * and invalidate caches. Pure HTTP — safe to call from a Vercel serverless
 * function (dashboard load / refresh button) as well as scripts.
 */
export async function refreshAllSources(): Promise<RefreshResponse> {
  const start = Date.now();
  const result = await new InfralensCollector().collect();

  let inserted = 0;
  let updated = 0;
  let persistError: string | null = result.error;

  try {
    // Never re-add tenders the user permanently deleted.
    const blocked = new Set(
      (await prisma.deletedTender.findMany({ select: { dedupeHash: true } })).map(
        (d) => d.dedupeHash,
      ),
    );
    for (const t of result.tenders) {
      if (blocked.has(t.dedupeHash)) continue;
      const data = toPrismaData(t);
      const existing = await prisma.tender.findUnique({
        where: { dedupeHash: t.dedupeHash },
        select: { id: true },
      });
      await prisma.tender.upsert({
        where: { dedupeHash: t.dedupeHash },
        create: data,
        update: {
          title: data.title,
          description: data.description,
          organization: data.organization,
          department: data.department,
          sector: data.sector,
          workType: data.workType,
          state: data.state,
          city: data.city,
          closingDate: data.closingDate,
          estimatedValue: data.estimatedValue,
          valueBand: data.valueBand,
          url: data.url,
          status: data.status,
          matchType: data.matchType,
          matchedKeywords: data.matchedKeywords,
          rawData: data.rawData,
        },
      });
      if (existing) updated++;
      else inserted++;
    }
  } catch (err) {
    persistError = (err as Error).message;
    log.error({ err }, "persist failed");
  }

  await prisma.collectorRun
    .create({
      data: {
        success: persistError === null,
        usedFallback: result.usedFallback,
        fetched: result.fetched,
        matched: result.tenders.length,
        inserted,
        updated,
        durationMs: result.durationMs,
        error: persistError,
        finishedAt: new Date(),
      },
    })
    .catch((err) => log.error({ err }, "failed to record collector run"));

  await invalidateTenderCaches();

  const durationMs = Date.now() - start;
  log.info(
    { durationMs, fetched: result.fetched, matched: result.tenders.length, inserted, updated },
    "refresh complete",
  );

  return {
    ok: persistError === null,
    durationMs,
    fetched: result.fetched,
    matched: result.tenders.length,
    inserted,
    updated,
    usedFallback: result.usedFallback,
    error: persistError,
  };
}
