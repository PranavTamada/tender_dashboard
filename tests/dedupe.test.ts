import { describe, expect, it } from "vitest";
import {
  computeDedupeHash,
  dedupeBatch,
  normalizeTitle,
  titleSimilarity,
} from "@/lib/dedupe";

describe("normalizeTitle", () => {
  it("lowercases, strips punctuation, collapses whitespace", () => {
    expect(normalizeTitle("  AI/ML  Platform!! ")).toBe("ai ml platform");
  });
});

describe("computeDedupeHash", () => {
  it("is stable for the same inputs", () => {
    const a = computeDedupeHash({ sourceTenderId: "X1", title: "T", url: "/t/x1" });
    const b = computeDedupeHash({ sourceTenderId: "X1", title: "T", url: "/t/x1" });
    expect(a).toBe(b);
  });
  it("differs when the id/url differs", () => {
    const a = computeDedupeHash({ sourceTenderId: "X1", title: "T" });
    const b = computeDedupeHash({ sourceTenderId: "X2", title: "T" });
    expect(a).not.toBe(b);
  });
});

describe("titleSimilarity", () => {
  it("is 1 for identical titles", () => {
    expect(titleSimilarity("AI Chatbot Development", "AI Chatbot Development")).toBe(1);
  });
  it("is high for near-duplicates", () => {
    expect(
      titleSimilarity(
        "Development of AI Chatbot for Citizen Portal",
        "Development of AI Chatbot for the Citizen Portal",
      ),
    ).toBeGreaterThan(0.85);
  });
  it("is low for unrelated titles", () => {
    expect(
      titleSimilarity("AI Chatbot Development", "Supply of office furniture"),
    ).toBeLessThan(0.2);
  });
});

describe("dedupeBatch", () => {
  it("removes exact hash duplicates and near-duplicates", () => {
    const items = [
      { title: "AI Chatbot Development", dedupeHash: "h1" },
      { title: "AI Chatbot Development", dedupeHash: "h1" },
      { title: "AI Chatbot  Development", dedupeHash: "h2" },
      { title: "Supply of office furniture", dedupeHash: "h3" },
    ];
    const out = dedupeBatch(items);
    // The two AI chatbot variants collapse to one; furniture stays.
    expect(out).toHaveLength(2);
  });
});
