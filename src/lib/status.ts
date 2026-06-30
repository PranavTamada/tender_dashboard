import type { TenderStatus } from "@/types/tender";

/** Days from `now` within which an OPEN tender is flagged CLOSING_SOON. */
export const CLOSING_SOON_DAYS = 3;

/**
 * Derive a tender's lifecycle status from its closing date.
 * `now` is injectable to keep this pure and testable.
 */
export function computeStatus(
  closingDate: Date | null | undefined,
  now: Date = new Date(),
): TenderStatus {
  if (!closingDate) return "UNKNOWN";
  const diffMs = closingDate.getTime() - now.getTime();
  if (diffMs < 0) return "CLOSED";
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= CLOSING_SOON_DAYS ? "CLOSING_SOON" : "OPEN";
}
