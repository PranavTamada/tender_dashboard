/**
 * Manual refresh — live-fetches from infralens and writes to the database.
 * Pure HTTP (PoW + /api/search); no browser. Useful for local testing or a
 * VM cron in addition to the in-app refresh.
 *
 *   npm run collect
 */
import { refreshAllSources } from "../src/server/refresh";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🔄 Fetching latest tenders from infralens…");
  const r = await refreshAllSources();
  console.table([
    {
      ok: r.ok,
      usedFallback: r.usedFallback,
      fetched: r.fetched,
      matched: r.matched,
      inserted: r.inserted,
      updated: r.updated,
      ms: r.durationMs,
      error: r.error ?? "",
    },
  ]);
}

main()
  .catch((err) => {
    console.error("Collection failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
