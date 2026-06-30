// Minimal env required before importing the collector (it reads env lazily).
process.env.DATABASE_URL ||= "postgresql://localhost:5432/test";
process.env.COLLECTORS_USE_SEED_ONLY = "true";

import { describe, expect, it } from "vitest";
import { InfralensCollector } from "@/collectors/infralens";

describe("InfralensCollector (seed mode)", () => {
  it("normalizes & classifies the bundled seed tenders", async () => {
    const result = await new InfralensCollector().collect();
    expect(result.usedFallback).toBe(true);
    expect(result.tenders.length).toBeGreaterThan(0);

    for (const t of result.tenders) {
      expect(t.title.length).toBeGreaterThan(0);
      expect(["KEYWORD", "DEPARTMENT"]).toContain(t.matchType);
      if (t.matchType === "KEYWORD") {
        expect(t.matchedKeywords.length).toBeGreaterThan(0);
      }
    }
  });

  it("tags IT-department tenders as DEPARTMENT matches", async () => {
    const result = await new InfralensCollector().collect();
    const dept = result.tenders.filter((t) => t.matchType === "DEPARTMENT");
    expect(dept.length).toBeGreaterThan(0);
  });

  it("produces unique dedupe hashes", async () => {
    const result = await new InfralensCollector().collect();
    const hashes = new Set(result.tenders.map((t) => t.dedupeHash));
    expect(hashes.size).toBe(result.tenders.length);
  });

  it("maps numeric value and closing date", async () => {
    const result = await new InfralensCollector().collect();
    const withValue = result.tenders.find((t) => t.estimatedValue != null);
    expect(withValue?.estimatedValue).toBeGreaterThan(0);
    const withClose = result.tenders.find((t) => t.closingDate != null);
    expect(withClose?.closingDate).toBeInstanceOf(Date);
  });
});
