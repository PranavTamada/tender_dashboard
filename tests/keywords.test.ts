import { describe, expect, it } from "vitest";
import {
  isDepartmentMatch,
  hasKeywordMatch,
  matchKeywords,
} from "@/lib/keywords";

describe("matchKeywords", () => {
  it("is case insensitive", () => {
    expect(matchKeywords("ARTIFICIAL INTELLIGENCE platform")).toContain(
      "Artificial Intelligence",
    );
    expect(matchKeywords("ai based solution")).toContain("AI");
  });

  it("detects the documented example phrases", () => {
    expect(matchKeywords("Artificial Intelligence")).toContain(
      "Artificial Intelligence",
    );
    expect(matchKeywords("AI Solution")).toContain("AI");
    expect(matchKeywords("AI Based Platform")).toContain("AI");
    expect(matchKeywords("ML Platform")).toContain("ML");
    expect(matchKeywords("Website Development")).toContain("Website");
    expect(matchKeywords("Website Redesign")).toContain("Website");
    expect(matchKeywords("Mobile Application")).toContain("Mobile App");
    expect(matchKeywords("Mobile App Development")).toContain(
      "Mobile App Development",
    );
  });

  it("is singular/plural tolerant", () => {
    expect(matchKeywords("information tool")).toContain("Information Tools");
    expect(matchKeywords("information tools")).toContain("Information Tools");
    expect(matchKeywords("website widgets")).toContain("Website Widgets");
    expect(matchKeywords("a single website")).toContain("Website");
    expect(matchKeywords("multiple websites")).toContain("Website");
  });

  it("de-duplicates matches", () => {
    const result = matchKeywords("AI AI artificial intelligence ai");
    const ai = result.filter((k) => k === "AI");
    expect(ai).toHaveLength(1);
  });

  it("does not match short acronyms inside unrelated words", () => {
    // "ML" must not match inside "HTML"/"XML"; "AI" not inside "email".
    expect(matchKeywords("HTML and XML parsing")).not.toContain("ML");
    expect(matchKeywords("send an email")).not.toContain("AI");
  });

  it("scans across multiple fragments", () => {
    expect(
      matchKeywords("Generic title", null, "scope mentions chatbot", undefined),
    ).toContain("Chatbot");
  });

  it("returns empty for unrelated text", () => {
    expect(hasKeywordMatch("Construction of overhead reservoir")).toBe(false);
  });
});

describe("isDepartmentMatch", () => {
  it("matches the IT/ICT department variants", () => {
    expect(isDepartmentMatch("Information Technology Department")).toBe(true);
    expect(isDepartmentMatch("IT Department")).toBe(true);
    expect(isDepartmentMatch("ITE&C")).toBe(true);
    expect(isDepartmentMatch("ICT")).toBe(true);
    expect(
      isDepartmentMatch("Information Technology & Communications Department"),
    ).toBe(true);
    expect(
      isDepartmentMatch("Information and Communications Technology"),
    ).toBe(true);
  });

  it("falls back to the organization field", () => {
    expect(isDepartmentMatch(null, "ITE&C Department, Govt of AP")).toBe(true);
  });

  it("does not match unrelated departments", () => {
    expect(isDepartmentMatch("Panchayat Raj & Rural Development")).toBe(false);
    expect(isDepartmentMatch("Health")).toBe(false);
  });

  it("excludes educational/research bodies named 'Information Technology'", () => {
    // IIITs / institutes are not IT departments — only keyword matches count.
    expect(
      isDepartmentMatch(null, "Indian Institute of Information Technology - Sri City"),
    ).toBe(false);
    expect(
      isDepartmentMatch("IIIT Design and Manufacturing Kancheepuram"),
    ).toBe(false);
    expect(
      isDepartmentMatch(null, "International Institute of Information Technology Hyderabad"),
    ).toBe(false);
    // A real IT directorate still matches even if buying non-IT goods.
    expect(isDepartmentMatch("Directorate of Information Technology")).toBe(true);
  });
});
