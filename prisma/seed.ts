/**
 * Database seed: persists the bundled sample tenders (no live fetch).
 * Safe to run repeatedly — persistence upserts on the dedupe hash.
 *
 *   npm run db:seed
 */
process.env.COLLECTORS_USE_SEED_ONLY = "true";

import { refreshAllSources } from "../src/server/refresh";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🌱 Seeding tenders from bundled sample data…");
  const r = await refreshAllSources();
  console.log(
    `  matched ${r.matched}, inserted ${r.inserted}, updated ${r.updated}` +
      (r.error ? ` (note: ${r.error})` : ""),
  );
  console.log(`✅ Seed complete in ${r.durationMs}ms`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
