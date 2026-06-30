import type { NormalizedTender } from "@/types/tender";

/** Raw record shape returned by infralens `/api/search`. */
export interface InfralensResult {
  u: string; // detail url path, e.g. "/tender/<slug>"
  lv?: string | null; // level: Central / State / PSU
  pl?: string | null; // portal/state code
  t?: string | null; // title (clean)
  wd?: string | null; // title (with highlight markup)
  or?: string | null; // organization (breadcrumb)
  dp?: string | null; // department
  dg?: string | null; // sector group
  ds?: string | null; // display location
  sc?: string | null; // sector category
  wk?: string | null; // work type
  st?: string | null; // state
  ct?: string | null; // city
  vb?: string | null; // value band (display)
  vs?: string | null; // value band (display, wider)
  vn?: number | null; // numeric value (INR)
  vest?: number | null; // value-estimated flag
  cl?: string | null; // closing date (display)
  cn?: string | null; // closing datetime "YYYY-MM-DD HH:mm"
  stat?: string | null; // "active" | "closed"
  [k: string]: unknown;
}

export interface CollectorResult {
  tenders: NormalizedTender[];
  /** Raw records fetched before filtering/dedup. */
  fetched: number;
  /** True when seed data was used because the live fetch failed. */
  usedFallback: boolean;
  error: string | null;
  durationMs: number;
}
