import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";

/** Format an ISO date string as "12 Jun 2026", or a dash when absent. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "dd MMM yyyy") : "—";
}

/** Format an ISO date string with time, e.g. "12 Jun 2026, 3:00 PM". */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "dd MMM yyyy, h:mm a") : "—";
}

/** Relative time, e.g. "5 minutes ago". */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "never";
  const d = parseISO(iso);
  return isValid(d) ? `${formatDistanceToNowStrict(d)} ago` : "never";
}

/** Days remaining until a closing date (negative = past). */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = parseISO(iso);
  if (!isValid(d)) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
