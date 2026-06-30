/**
 * Tolerant parsers for the messy date / currency formats Indian procurement
 * portals emit (e.g. "12-Aug-2026 03:30 PM", "12/08/2026", "Rs. 50,00,000").
 */

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

export function parseDate(input: unknown): Date | null {
  if (input == null) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  const raw = String(input).trim();
  if (!raw) return null;

  // ISO 8601 — let the engine handle it.
  const iso = new Date(raw);
  if (!isNaN(iso.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(raw)) return iso;

  // dd-MMM-yyyy [hh:mm] [AM/PM]
  const monthName = raw.match(
    /(\d{1,2})[-/\s]([A-Za-z]{3,4})[-/\s](\d{4})(?:[ T]+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i,
  );
  if (monthName) {
    const [, d, mon, y, hh, mm, ap] = monthName;
    const month = MONTHS[mon.toLowerCase()];
    if (month != null) {
      let hour = hh ? parseInt(hh, 10) : 0;
      if (ap?.toUpperCase() === "PM" && hour < 12) hour += 12;
      if (ap?.toUpperCase() === "AM" && hour === 12) hour = 0;
      return new Date(
        Number(y), month, Number(d), hour, mm ? parseInt(mm, 10) : 0,
      );
    }
  }

  // dd-mm-yyyy or dd/mm/yyyy [hh:mm]
  const numeric = raw.match(
    /(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T]+(\d{1,2}):(\d{2}))?/,
  );
  if (numeric) {
    const [, d, m, y, hh, mm] = numeric;
    return new Date(
      Number(y), Number(m) - 1, Number(d),
      hh ? parseInt(hh, 10) : 0, mm ? parseInt(mm, 10) : 0,
    );
  }

  return isNaN(iso.getTime()) ? null : iso;
}

/** Parse a currency-ish string ("Rs. 50,00,000", "₹ 1.2 Cr") to a number. */
export function parseValue(input: unknown): number | null {
  if (input == null) return null;
  if (typeof input === "number") return isFinite(input) ? input : null;
  let raw = String(input).toLowerCase().replace(/[,₹]/g, "").trim();
  raw = raw.replace(/rs\.?|inr/gi, "").trim();
  const crore = raw.match(/([\d.]+)\s*cr/);
  if (crore) return Math.round(parseFloat(crore[1]) * 1e7);
  const lakh = raw.match(/([\d.]+)\s*(lakh|lac|l\b)/);
  if (lakh) return Math.round(parseFloat(lakh[1]) * 1e5);
  const num = parseFloat(raw.replace(/[^\d.]/g, ""));
  return isFinite(num) && num > 0 ? num : null;
}

export function cleanText(input: unknown): string | null {
  if (input == null) return null;
  const text = String(input).replace(/\s+/g, " ").trim();
  return text || null;
}
