import { describe, expect, it } from "vitest";
import { parseDate, parseValue } from "@/collectors/parse";
import { computeStatus } from "@/lib/status";

describe("parseDate", () => {
  it("parses dd-MMM-yyyy with time", () => {
    const d = parseDate("12-Aug-2026 03:30 PM");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(7); // August
    expect(d?.getDate()).toBe(12);
    expect(d?.getHours()).toBe(15);
  });
  it("parses dd/mm/yyyy", () => {
    const d = parseDate("05/07/2026");
    expect(d?.getMonth()).toBe(6); // July
    expect(d?.getDate()).toBe(5);
  });
  it("returns null for junk", () => {
    expect(parseDate("not a date")).toBeNull();
    expect(parseDate(null)).toBeNull();
  });
});

describe("parseValue", () => {
  it("parses rupee strings", () => {
    expect(parseValue("Rs. 50,00,000")).toBe(5000000);
  });
  it("parses crore and lakh", () => {
    expect(parseValue("1.2 Cr")).toBe(12000000);
    expect(parseValue("85 lakh")).toBe(8500000);
  });
  it("passes through numbers", () => {
    expect(parseValue(420000)).toBe(420000);
  });
  it("returns null for empty", () => {
    expect(parseValue(null)).toBeNull();
  });
});

describe("computeStatus", () => {
  const now = new Date("2026-06-19T00:00:00Z");
  it("flags past dates as CLOSED", () => {
    expect(computeStatus(new Date("2026-06-10"), now)).toBe("CLOSED");
  });
  it("flags imminent dates as CLOSING_SOON", () => {
    expect(computeStatus(new Date("2026-06-21"), now)).toBe("CLOSING_SOON");
  });
  it("flags distant dates as OPEN", () => {
    expect(computeStatus(new Date("2026-07-15"), now)).toBe("OPEN");
  });
  it("returns UNKNOWN with no date", () => {
    expect(computeStatus(null, now)).toBe("UNKNOWN");
  });
});
