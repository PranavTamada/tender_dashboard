import { createHash } from "node:crypto";

/**
 * Duplicate prevention. Tenders are de-duplicated on:
 *   1. dedupeHash  — stable fingerprint (DB-unique)
 *   2. url         — folded into the hash
 *   3. title similarity — best-effort near-duplicate collapsing in a batch
 */

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Stable fingerprint for a tender. Prefers the aggregator's own slug/url;
 * falls back to normalized title so records are deduplicated across refreshes.
 */
export function computeDedupeHash(input: {
  sourceTenderId?: string | null;
  title: string;
  url?: string | null;
}): string {
  const idPart = input.sourceTenderId?.trim()
    ? input.sourceTenderId.trim().toLowerCase()
    : "";
  const basis = [
    idPart,
    normalizeTitle(input.title),
    (input.url ?? "").trim().toLowerCase(),
  ].join("|");
  return createHash("sha256").update(basis).digest("hex").slice(0, 32);
}

function tokens(title: string): Set<string> {
  return new Set(normalizeTitle(title).split(" ").filter((t) => t.length > 2));
}

/** Sørensen–Dice coefficient over title token sets (0..1). */
export function titleSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection++;
  return (2 * intersection) / (ta.size + tb.size);
}

export const DEFAULT_SIMILARITY_THRESHOLD = 0.95;

/**
 * Collapse near-duplicate tenders within a batch by hash and high title
 * similarity. Keeps the first occurrence.
 */
export function dedupeBatch<T extends { title: string; dedupeHash: string }>(
  items: T[],
  threshold = DEFAULT_SIMILARITY_THRESHOLD,
): T[] {
  const seenHashes = new Set<string>();
  const kept: T[] = [];
  for (const item of items) {
    if (seenHashes.has(item.dedupeHash)) continue;
    const near = kept.some(
      (k) => titleSimilarity(k.title, item.title) >= threshold,
    );
    if (near) continue;
    seenHashes.add(item.dedupeHash);
    kept.push(item);
  }
  return kept;
}
