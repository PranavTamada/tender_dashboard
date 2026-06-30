process.env.DATABASE_URL ||= "postgresql://localhost:5432/test";
process.env.COLLECTORS_USE_SEED_ONLY = "false";
process.env.COLLECTOR_TIMEOUT_MS = "30000";
import { InfralensCollector } from "@/collectors/infralens";
async function main() {
  const r = await new InfralensCollector().collect();
  console.log(`MATCHED=${r.tenders.length}/${r.fetched} fallback=${r.usedFallback} ms=${r.durationMs}`);
  const c = r.tenders.reduce<Record<string,number>>((a,t)=>{a[t.matchType]=(a[t.matchType]||0)+1;return a;},{});
  console.log("byType:",c);
  console.log("\nKEYWORD samples (full title):");
  for (const t of r.tenders.filter(t=>t.matchType==="KEYWORD").slice(0,8))
    console.log(`  • [${t.matchedKeywords.join(", ")}] ${t.title.slice(0,90)}`);
  console.log("\nDEPARTMENT samples:");
  for (const t of r.tenders.filter(t=>t.matchType==="DEPARTMENT").slice(0,5))
    console.log(`  • ${t.department} :: ${t.title.slice(0,70)}`);
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
