/**
 * Live accuracy audit of the infralens collector (no DB needed).
 * Asserts precision properties on real fetched data.
 *   npx tsx scripts/verify-accuracy.ts
 */
process.env.DATABASE_URL ||= "postgresql://localhost:5432/test";
process.env.COLLECTORS_USE_SEED_ONLY = "false";
process.env.COLLECTOR_TIMEOUT_MS = "30000";

import { InfralensCollector } from "@/collectors/infralens";
import { matchKeywords, isDepartmentMatch } from "@/lib/keywords";

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
};

async function main() {
  const r = await new InfralensCollector().collect();
  console.log(`\nFetched ${r.fetched} candidates → ${r.tenders.length} matches (fallback=${r.usedFallback})\n`);

  check("live fetch succeeded (not fallback)", !r.usedFallback, r.error ?? "");
  check("returned a non-trivial number of matches", r.tenders.length >= 20, `${r.tenders.length}`);

  // 1. Every KEYWORD match must actually contain a keyword in its title text.
  const kw = r.tenders.filter((t) => t.matchType === "KEYWORD");
  const kwBad = kw.filter((t) => matchKeywords(t.title, t.description).length === 0);
  check("every KEYWORD match re-verifies against title", kwBad.length === 0,
    kwBad.length ? `${kwBad.length} bad: ${kwBad[0]?.title.slice(0, 60)}` : `${kw.length} checked`);

  // 2. matchedKeywords stored must equal what the matcher finds (no stale tags).
  const tagBad = kw.filter((t) => {
    const found = new Set(matchKeywords(t.title, t.description));
    return t.matchedKeywords.some((k) => !found.has(k));
  });
  check("stored matchedKeywords all re-derivable", tagBad.length === 0,
    tagBad.length ? `${tagBad.length} mismatched` : "");

  // 3. No false positives from the classic traps.
  const traps = /\b(airport|aircraft|air[- ]conditioned|\bais\b)\b/i;
  const trapHits = kw.filter((t) => t.matchedKeywords.includes("AI") && !/\bai\b/i.test(t.title) && traps.test(t.title));
  check("no AI false-positives from airport/aircraft/AIS", trapHits.length === 0,
    trapHits.length ? trapHits[0].title.slice(0, 60) : "");

  // 4. DEPARTMENT matches must be real IT/ICT departments.
  const dept = r.tenders.filter((t) => t.matchType === "DEPARTMENT");
  const deptBad = dept.filter((t) => !isDepartmentMatch(t.department, t.organization));
  check("every DEPARTMENT match has an IT/ICT dept", deptBad.length === 0,
    deptBad.length ? deptBad[0].department ?? "?" : `${dept.length} checked`);

  // 5. De-duplication: unique hashes and unique URLs.
  const hashes = new Set(r.tenders.map((t) => t.dedupeHash));
  check("dedupeHash unique across all matches", hashes.size === r.tenders.length,
    `${hashes.size}/${r.tenders.length}`);
  const urls = r.tenders.map((t) => t.url).filter(Boolean);
  check("URLs unique", new Set(urls).size === urls.length, `${new Set(urls).size}/${urls.length}`);

  // 6. Field integrity.
  check("all matches have a non-empty title", r.tenders.every((t) => t.title.length > 0));
  check("all matches have a tender URL", r.tenders.every((t) => !!t.url));
  const withVal = r.tenders.filter((t) => t.estimatedValue != null);
  check("values are positive numbers when present", withVal.every((t) => (t.estimatedValue ?? 0) > 0), `${withVal.length} valued`);
  const withClose = r.tenders.filter((t) => t.closingDate);
  check("closing dates parsed to valid Dates", withClose.every((t) => t.closingDate instanceof Date && !isNaN(t.closingDate!.getTime())), `${withClose.length} dated`);
  check("status is a valid enum", r.tenders.every((t) => ["OPEN", "CLOSING_SOON", "CLOSED", "UNKNOWN"].includes(t.status)));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
